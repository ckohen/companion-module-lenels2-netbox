import { combineRgb, SomeCompanionFeedbackInputField } from '@companion-module/base';
import { createS2BooleanFeedback } from './index.js';

function generateOptions(outputs: Record<string, number>) {
	return [
		{
			type: 'dropdown',
			id: 'output',
			label: 'Output',
			default: 0,
			choices: Object.entries(outputs).map(([label, id]) => ({ label, id })),
		},
	] as const satisfies SomeCompanionFeedbackInputField[];
}

export const outputState = createS2BooleanFeedback<ReturnType<typeof generateOptions>>(
	{
		name: 'Output Active',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
		},
		description:
			'Provides feedback on output activations from this device only, does not have the capability to update state from S2',
		callback(companionModule, feedback) {
			if (!feedback.options.output) return false;
			return companionModule.state.activeOutputs.has(feedback.options.output as number);
		},
	},
	(companionModule) => generateOptions(companionModule.state.outputs),
);
