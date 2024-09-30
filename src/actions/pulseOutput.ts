import { SomeCompanionActionInputField } from '@companion-module/base';
import { createS2Action } from './index.js';
import { setTimeout } from 'node:timers';

function generateOptions(outputs: Record<string, number>) {
	return [
		{
			type: 'dropdown',
			id: 'output',
			label: 'Output',
			default: 0,
			choices: Object.entries(outputs).map(([label, id]) => ({ label, id })),
		},
		{
			type: 'number',
			id: 'duration',
			label: 'Pulse Duration (seconds)',
			min: 3,
			max: 120,
			default: 10,
		},
	] as const satisfies SomeCompanionActionInputField[];
}

export const pulseOutput = createS2Action<ReturnType<typeof generateOptions>>(
	{
		name: 'Pulse Output',
		async callback(companionModule, action) {
			if (!action.options.output || !action.options.duration) return;
			try {
				await companionModule
					.sendCommand('ActivateOutput', {
						OUTPUTKEY: action.options.output as number,
					})
					.catch((err) => {
						if (err.message !== 'Command Errored: Output state not changed') throw err;
					});
				companionModule.state.activeOutputs.add(action.options.output as number);
				companionModule.checkFeedbacks('outputState');
				setTimeout(
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					async () => {
						try {
							await companionModule
								.sendCommand('DeactivateOutput', {
									OUTPUTKEY: action.options.output as number,
								})
								.catch((err) => {
									if (err.message !== 'Command Errored: Output state not changed') throw err;
								});
							companionModule.state.activeOutputs.delete(action.options.output as number);
							companionModule.checkFeedbacks('outputState');
						} catch (error) {
							companionModule.log('error', `Error while deactivating during pulseOutput: ${error}`);
						}
					},
					action.options.duration * 1000,
				);
				await companionModule.addS2Log(
					`Output ${companionModule.getOutputNameFromId(action.options.output as number)} pulsed for ${action.options.duration} seconds by ${companionModule.config?.logName ?? 'Companion'}`,
				);
			} catch (error) {
				companionModule.log('error', `Error while activating during pulseOutput: ${error}`);
			}
		},
	},
	(companionModule) => generateOptions(companionModule.state.outputs),
);
