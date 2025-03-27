import { combineRgb, SomeCompanionFeedbackInputField } from '@companion-module/base';
import { createS2BooleanFeedback } from './index.js';

function generateOptions() {
	return [
		{
			type: 'dropdown',
			id: 'floorSet',
			label: 'Floor Set',
			default: 0,
			choices: [
				{ label: 'All', id: 'all' },
				{ label: 'Basement', id: 'b' },
				{ label: '2 and 2R', id: '2' },
				{ label: '3 and 3R', id: '3' },
				{ label: '4', id: '4' },
			],
		},
	] as const satisfies SomeCompanionFeedbackInputField[];
}

export const floorSet = createS2BooleanFeedback<ReturnType<typeof generateOptions>>(
	{
		name: 'Floors Unlocked',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
		},
		description:
			'Provides feedback on floors unlocked by keycard or event activations, does not include manual output triggers',
		callback(companionModule, feedback) {
			if (!feedback.options.floorSet) return false;
			return companionModule.state.activeFloorSets[feedback.options.floorSet as 'all' | 'b' | '2' | '3' | '4'];
		},
	},
	() => generateOptions(),
);
