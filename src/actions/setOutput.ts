import { SomeCompanionActionInputField } from '@companion-module/base';
import { createS2Action } from './index.js';

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
			type: 'checkbox',
			id: 'mode',
			label: 'Active',
			tooltip: 'Checked for Activate, Unchecked for Deactivate',
			default: true,
		},
	] as const satisfies SomeCompanionActionInputField[];
}

export const setOutput = createS2Action<ReturnType<typeof generateOptions>>(
	{
		name: 'Set Output',
		async callback(companionModule, action) {
			if (!action.options.output || action.options.mode === undefined) return;
			const activate = action.options.mode;
			try {
				await companionModule
					.sendCommand(activate ? 'ActivateOutput' : 'DeactivateOutput', {
						OUTPUTKEY: action.options.output as number,
					})
					.catch((err) => {
						if (err.message !== 'Command Errored: Output state not changed') throw err;
					});
				await companionModule.addS2Log(
					`Output ${companionModule.getOutputNameFromId(action.options.output as number)} ${activate ? 'activated' : 'deactivated'} by ${companionModule.config?.logName ?? 'Companion'}`,
				);
				companionModule.state.activeOutputs[activate ? 'add' : 'delete'](action.options.output as number);
				companionModule.checkFeedbacks('outputState');
			} catch (error) {
				companionModule.log('error', `Error while running setOutput: ${error}`);
			}
		},
	},
	(companionModule) => generateOptions(companionModule.state.outputs),
);
