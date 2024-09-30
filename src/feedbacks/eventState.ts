import { combineRgb, SomeCompanionFeedbackInputField } from '@companion-module/base';
import { createS2BooleanFeedback } from './index.js';

function generateOptions(events: Set<string>) {
	return [
		{
			type: 'dropdown',
			id: 'event',
			label: 'Event',
			default: 0,
			choices: [...events].map((event) => ({ label: event, id: event })),
		},
	] as const satisfies SomeCompanionFeedbackInputField[];
}

export const eventState = createS2BooleanFeedback<ReturnType<typeof generateOptions>>(
	{
		name: 'Event Active',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
		},
		description:
			'Provides feedback on event activations from this device only, does not have the capability to update state from S2',
		callback(companionModule, feedback) {
			if (!feedback.options.event) return false;
			return companionModule.state.activeEvents.has(feedback.options.event as string);
		},
	},
	(companionModule) => generateOptions(companionModule.state.events),
);
