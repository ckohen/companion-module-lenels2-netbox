import { Builder, parseStringPromise, processors } from 'xml2js';
import { FullNetboxPayload, FullNetboxResponse, NetboxPayloads, NetboxResponses } from './S2types.js';
const { parseBooleans, parseNumbers } = processors;

const builder = new Builder({ headless: true });

export function buildCommandXml<Command extends keyof NetboxPayloads = keyof NetboxPayloads>(
	command: Command,
	data?: NetboxPayloads[Command],
	sessionid?: string,
): string {
	const fullPayload: FullNetboxPayload<NetboxPayloads[Command]> = {
		'NETBOX-API': { $: { sessionid }, COMMAND: { $: { name: command, num: 1 } } },
	};
	if (data) {
		fullPayload['NETBOX-API'].COMMAND.PARAMS = data;
	}
	return buildFullXml<Command>(fullPayload);
}

export function buildFullXml<Command extends keyof NetboxPayloads = keyof NetboxPayloads>(
	obj: FullNetboxPayload<NetboxPayloads[Command]>,
): string {
	return builder.buildObject(obj);
}

export async function parseFullXml<Command extends keyof NetboxResponses = keyof NetboxResponses>(
	xml: string,
): Promise<FullNetboxResponse<NetboxResponses[Command]>> {
	return parseStringPromise(xml, {
		valueProcessors: [parseBooleans, parseNumbers],
		attrValueProcessors: [parseBooleans, parseNumbers],
		explicitArray: false,
		mergeAttrs: true,
	});
}
