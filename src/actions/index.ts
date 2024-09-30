import { CompanionActionDefinitions, SomeCompanionActionInputField } from '@companion-module/base';
import type { ModuleInstance } from '../main.js';
import { DeepImmutable, S2Action } from './_types.js';
import { triggerEvent } from './triggerEvent.js';
import { pulseOutput } from './pulseOutput.js';
import { setOutput } from './setOutput.js';

export function createS2Action<const Options extends DeepImmutable<SomeCompanionActionInputField[]>>(
	action: Omit<S2Action<Options>, 'options'>,
	options: Options | ((companionModule: ModuleInstance) => Options),
): S2Action<Options> {
	return { options, ...action };
}

export function getActions(companionModule: ModuleInstance): CompanionActionDefinitions {
	return convertActions(companionModule, {
		triggerEvent,
		pulseOutput,
		setOutput,
	});
}

function convertActions(
	companionModule: ModuleInstance,
	actions: Record<string, S2Action<DeepImmutable<SomeCompanionActionInputField[]>>>,
) {
	const companionActions: CompanionActionDefinitions = {};
	for (const [action, actionDef] of Object.entries(actions)) {
		companionActions[action] = {
			name: actionDef.name,
			options: (typeof actionDef.options === 'function'
				? actionDef.options(companionModule)
				: actionDef.options) as SomeCompanionActionInputField[],
			description: actionDef.description,
			callback: async (event, context) => actionDef.callback(companionModule, event, context),
			learn: actionDef.learn ? async (event, context) => actionDef.learn!(companionModule, event, context) : undefined,
			learnTimeout: actionDef.learnTimeout,
			subscribe: actionDef.subscribe
				? async (event, context) => actionDef.subscribe!(companionModule, event, context)
				: undefined,
			unsubscribe: actionDef.unsubscribe
				? async (event, context) => actionDef.unsubscribe!(companionModule, event, context)
				: undefined,
		};
	}
	return companionActions;
}
