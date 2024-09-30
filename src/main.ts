import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base';
import { getConfigFields as getS2ConfigFields, type S2Config } from './config.js';
import { UpgradeScripts } from './upgrades.js';
import { getActions } from './actions/index.js';
import { getFeedbacks } from './feedbacks/index.js';
import { getVariableDefinitions } from './variables/index.js';
import { APIError, NetboxPayloads, NetboxResponses } from './util/S2types.js';
import { buildCommandXml, parseFullXml } from './util/xml.js';
import { request, Agent } from 'undici';
import { clearInterval, setInterval } from 'node:timers';

const allowSelfSigned = new Agent({ connect: { rejectUnauthorized: false } });

interface S2State {
	outputs: Record<string, number>;
	// Events are activated by name
	events: Set<string>;
	activeEvents: Set<string>;
	activeOutputs: Set<number>;
}

export class ModuleInstance extends InstanceBase<S2Config> {
	public config: Required<S2Config> | null = null; // Setup in init()
	private sessionId: string | undefined = undefined;
	private pingInterval: NodeJS.Timeout | undefined = undefined;
	public state: S2State = {
		outputs: {},
		events: new Set(),
		activeEvents: new Set(),
		activeOutputs: new Set(),
	};

	public constructor(internal: unknown) {
		super(internal);
	}

	public async init(config: S2Config): Promise<void> {
		this.updateStatus(InstanceStatus.Disconnected);

		await this.configUpdated(config);
	}

	// When module gets deleted
	public async destroy(): Promise<void> {
		await this.logout();
		this.log('debug', 'destroy');
	}

	public async configUpdated(config: S2Config): Promise<void> {
		if (
			!config.host ||
			!config.port ||
			config.ssl === undefined ||
			!config.username ||
			!config.password ||
			!config.pingInterval ||
			!config.logName
		) {
			this.log('error', 'Cannot instantiate without all config options');
			this.updateStatus(InstanceStatus.BadConfig);
			return;
		}

		this.config = config as Required<S2Config>;

		try {
			await this.login();
		} catch (error) {
			this.log('error', `Error Logging in during init: ${error}`);
			return;
		}

		try {
			await this.updateEvents();
			await this.updateOutputs();
		} catch (error) {
			this.log('warn', `Could not init events and outputs: ${error}`);
		}

		this.updateCompanionStuff();
	}

	// Return config fields for web config
	public getConfigFields(): SomeCompanionConfigField[] {
		return getS2ConfigFields();
	}

	public getOutputNameFromId(id: number): string {
		return Object.entries(this.state.outputs).find(([, searchId]) => id === searchId)?.[0] ?? 'UNKNOWN';
	}

	public async addS2Log(message: string): Promise<void> {
		try {
			await this.sendCommand('InsertActivity', {
				ACTIVITYTYPE: 'USERACTIVITY',
				ACTIVITYTEXT: message,
			});
		} catch (error) {
			this.log('warn', `Error logging to S2 ${error}`);
		}
	}

	public async updateOutputs(): Promise<Record<string, number>> {
		const newOutputs: Record<string, number> = {};
		let nextKey = 0;
		try {
			while (nextKey !== -1) {
				const fetchedOutputs = await this.sendCommand('GetOutputs', { STARTFROMKEY: nextKey });
				nextKey = fetchedOutputs.NEXTKEY;
				const outputs = Array.isArray(fetchedOutputs.OUTPUTS.OUTPUT)
					? fetchedOutputs.OUTPUTS.OUTPUT
					: [fetchedOutputs.OUTPUTS.OUTPUT];
				for (const output of outputs) {
					newOutputs[output.NAME] = output.OUTPUTKEY;
				}
			}
			this.state.outputs = newOutputs;
			return newOutputs;
		} catch (error) {
			this.log('warn', `Failed to update outputs: ${error}`);
			return this.state.outputs;
		}
	}

	public async updateEvents(): Promise<Set<string>> {
		const newEvents = new Set<string>();
		let nextKey = 0;
		try {
			while (nextKey !== -1) {
				const fetchedEvents = await this.sendCommand('ListEvents');
				nextKey = fetchedEvents.NEXTKEY;
				const events = Array.isArray(fetchedEvents.EVENTS.EVENT)
					? fetchedEvents.EVENTS.EVENT
					: [fetchedEvents.EVENTS.EVENT];
				for (const event of events) {
					newEvents.add(event.NAME);
				}
			}
			this.state.events = newEvents;
			return newEvents;
		} catch (error) {
			this.log('warn', `Failed to update events: ${error}`);
			return this.state.events;
		}
	}

	private updateCompanionStuff() {
		this.setActionDefinitions(getActions(this));
		this.setFeedbackDefinitions(getFeedbacks(this));
		this.setVariableDefinitions(getVariableDefinitions(this));
	}

	public async sendCommand<Command extends keyof NetboxPayloads>(
		...args: NetboxPayloads[Command] extends never
			? [command: Command, data?: undefined, retry?: boolean]
			: [command: Command, data: NetboxPayloads[Command], retry?: boolean]
	): Promise<NetboxResponses[Command]> {
		const [command, data, retry] = args;
		const config = this.config;
		if (!config) {
			this.log('warn', 'Attempted to send command before configured');
			throw new Error('Not ready');
		}
		const xml = buildCommandXml(command, data, this.sessionId);

		const res = await request(`http${config.ssl ? 's' : ''}://${config.host}:${config.port}/nbws/goforms/nbapi`, {
			method: 'POST',
			dispatcher: config.ssl ? allowSelfSigned : undefined,
			body: xml,
		});

		if (200 > res.statusCode || res.statusCode > 300) {
			if (command === 'Login') {
				this.updateStatus(InstanceStatus.ConnectionFailure);
			}
			throw new Error(`Fetch Error: ${await res.body.text()}`);
		}

		const resXml = await res.body.text();
		const fullResponse = await parseFullXml<Command>(resXml);

		if (fullResponse.NETBOX.sessionid) {
			this.sessionId = fullResponse.NETBOX.sessionid;
		}

		if ('APIERROR' in fullResponse.NETBOX.RESPONSE) {
			this.log('debug', `Received APIERROR from netbox: ${fullResponse.NETBOX.RESPONSE.APIERROR}`);
			switch (fullResponse.NETBOX.RESPONSE.APIERROR) {
				case APIError.APIFailedToIntialize:
				case APIError.APINotEnabled:
					this.updateStatus(InstanceStatus.ConnectionFailure);
					throw new Error(`APIERROR Received: ${fullResponse.NETBOX.RESPONSE.APIERROR}`);
				case APIError.InvalidAPICommand:
				case APIError.UnableToParse:
				case APIError.UnknownCommand:
					this.updateStatus(InstanceStatus.UnknownError);
					throw new Error(`APIERROR Received: ${fullResponse.NETBOX.RESPONSE.APIERROR}`);
				case APIError.AuthenticationFailure:
					if (['Login', 'Logout'].includes(command)) {
						// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
						return Promise.reject({ authFailure: true });
					}
					if (retry) throw new Error(`Authentication Error, missing permissions`);
					// Don't unset sessionid because this error seems to be unrelated to login state
					// Try relogging in case session expired
					await this.login();
					// @ts-expect-error generic makes this not happy
					return this.sendCommand(command, data, true);
			}
		}

		const commandResponse = fullResponse.NETBOX.RESPONSE;

		if (commandResponse.command !== command) {
			throw new Error(`Wrong command returned, sent ${command}, received ${commandResponse.command}`);
		}

		switch (commandResponse.CODE) {
			case 'NOT FOUND':
				throw new Error('Invalid command');
			case 'FAIL':
				throw new Error(`Command Errored: ${commandResponse.DETAILS?.ERRMSG}`);
			case 'SUCCESS':
				return commandResponse.DETAILS;
		}
	}

	private async login() {
		const config = this.config;

		if (!config) {
			this.log('warn', 'Attempted to login before configured');
			throw new Error('Not ready');
		}

		this.updateStatus(InstanceStatus.Connecting);

		try {
			await this.sendCommand('Login', { USERNAME: config.username, PASSWORD: config.password });
			this.pingInterval = setInterval(() => void this.ping(), config.pingInterval * 60 * 1000);
			this.updateStatus(InstanceStatus.Ok);
		} catch (error) {
			if (typeof error === 'object' && error && 'authFailure' in error && error.authFailure === true) {
				this.updateStatus(InstanceStatus.AuthenticationFailure);
				throw new Error('Login Failed, check username and password');
			}
			this.updateStatus(InstanceStatus.UnknownError);
			throw new Error(`Login Failed, ${error}`);
		}
	}

	private setDisconnected() {
		this.updateStatus(InstanceStatus.Disconnected);
		clearInterval(this.pingInterval);
		this.pingInterval = undefined;
		this.sessionId = undefined;
	}

	private async ping() {
		try {
			await this.sendCommand('PingApp');
		} catch (error) {
			this.log('debug', `Ping Failed: ${error}`);
			this.setDisconnected();
		}
	}

	private async logout() {
		try {
			await this.sendCommand('Logout');
		} catch (error) {
			this.log('debug', `Logout Failed: ${error}`);
		} finally {
			this.setDisconnected();
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts);
