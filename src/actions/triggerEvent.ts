import { Regex, SomeCompanionActionInputField } from '@companion-module/base';
import { createS2Action } from './index.js';
import { NetboxTriggerEventPayload } from '../util/S2types.js';

function generateOptions(events: Set<string>) {
	return [
		{
			type: 'dropdown',
			id: 'event',
			label: 'Event',
			default: 0,
			choices: [...events].map((event) => ({ label: event, id: event })),
		},
		{
			type: 'dropdown',
			id: 'mode',
			label: 'Event Mode',
			default: 'trigger',
			tooltip: 'Trigger will automatically activate and deactivate the event',
			choices: [
				{ label: 'Trigger', id: 'trigger' },
				{ label: 'Activate', id: 'ACTIVATE' },
				{ label: 'Deactivate', id: 'DEACTIVATE' },
			],
		},
		{
			type: 'textinput',
			id: 'partition',
			label: 'Partition Id (Optional)',
			regex: Regex.NUMBER,
		},
	] as const satisfies SomeCompanionActionInputField[];
}

export const triggerEvent = createS2Action<ReturnType<typeof generateOptions>>(
	{
		name: 'Trigger Event',
		async callback(companionModule, action) {
			if (!action.options.event || !action.options.mode) return;
			const isTrigger = action.options.mode === 'trigger';
			try {
				const payload: NetboxTriggerEventPayload = {
					EVENTACTION: isTrigger ? 'ACTIVATE' : (action.options.mode as 'ACTIVATE' | 'DEACTIVATE'),
					EVENTNAME: action.options.event as string,
				};

				if (action.options.partition) {
					payload.PARTITIONID = Number(action.options.partition);
				}

				await companionModule.sendCommand('TriggerEvent', payload);
				companionModule.state.activeEvents[isTrigger || action.options.mode === 'ACTIVATE' ? 'add' : 'delete'](
					action.options.event as string,
				);
				companionModule.checkFeedbacks('eventState');

				if (!isTrigger) return;
				payload.EVENTACTION = 'DEACTIVATE';
				await companionModule.sendCommand('TriggerEvent', payload);
				companionModule.state.activeEvents.delete(action.options.event as string);
				companionModule.checkFeedbacks('eventState');
			} catch (error) {
				companionModule.log('error', `Error while running triggerEvent: ${error}`);
			}
		},
	},
	(companionModule) => generateOptions(companionModule.state.events),
);
