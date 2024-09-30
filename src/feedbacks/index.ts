import {
	CompanionFeedbackAdvancedEvent,
	CompanionFeedbackContext,
	CompanionFeedbackDefinitions,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base';
import type { ModuleInstance } from '../main.js';
import { S2AdvancedFeedback, S2BooleanFeedback, S2Feedback, TypeOptions } from './_types.js';
import { DeepImmutable } from '../actions/_types.js';
import { eventState } from './eventState.js';
import { outputState } from './outputState.js';

export function createS2BooleanFeedback<const Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>>(
	feedback: Omit<S2BooleanFeedback<Options>, 'options' | 'type'>,
	options: Options | ((companionModule: ModuleInstance) => Options),
): S2Feedback<Options> {
	return { options, ...feedback, type: 'boolean' };
}

export function createS2AdvancedFeedback<const Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>>(
	feedback: Omit<S2AdvancedFeedback<Options>, 'options' | 'type'>,
	options: Options | ((companionModule: ModuleInstance) => Options),
): S2Feedback<Options> {
	return { options, ...feedback, type: 'advanced' };
}

export function getFeedbacks(companionModule: ModuleInstance): CompanionFeedbackDefinitions {
	return convertFeedbacks(companionModule, { eventState, outputState });
}

function convertFeedbacks(
	companionModule: ModuleInstance,
	feedbacks: Record<string, S2Feedback<DeepImmutable<SomeCompanionFeedbackInputField[]>>>,
) {
	const companionFeedbacks: CompanionFeedbackDefinitions = {};
	for (const [feedback, feedbackDef] of Object.entries(feedbacks)) {
		companionFeedbacks[feedback] = {
			...feedbackDef,
			options: (typeof feedbackDef.options === 'function'
				? feedbackDef.options(companionModule)
				: feedbackDef.options) as SomeCompanionFeedbackInputField[],
			// @ts-expect-error generic makes this impossible to properly type
			async callback(
				event: TypeOptions<CompanionFeedbackAdvancedEvent, SomeCompanionFeedbackInputField[]>,
				context: CompanionFeedbackContext,
			) {
				return feedbackDef.callback(companionModule, event, context);
			},
			learn: feedbackDef.learn
				? async (event, context) => feedbackDef.learn!(companionModule, event, context)
				: undefined,
			learnTimeout: feedbackDef.learnTimeout,
			subscribe: feedbackDef.subscribe
				? async (event, context) => feedbackDef.subscribe!(companionModule, event, context)
				: undefined,
			unsubscribe: feedbackDef.unsubscribe
				? async (event, context) => feedbackDef.unsubscribe!(companionModule, event, context)
				: undefined,
		};
	}
	return companionFeedbacks;
}
