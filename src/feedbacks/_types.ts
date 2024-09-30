import {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackAdvancedEvent,
	CompanionFeedbackBooleanEvent,
	CompanionFeedbackButtonStyleResult,
	CompanionFeedbackContext,
	CompanionFeedbackInfo,
	CompanionOptionValues,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base';
import type { ModuleInstance } from '../main.js';
import { DeepImmutable, OptionTypeToTypescriptType } from '../actions/_types.js';

export type TypeOptions<Base, Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>> = Omit<
	Base,
	'options'
> & {
	options: { [Option in Options[number] as Option['id']]: OptionTypeToTypescriptType[Option['type']] | undefined };
};

export interface S2FeedbackBase<Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>> {
	type: 'boolean' | 'advanced';
	/** Name to show in the feedbacks list */
	name: string;
	/** Additional description of the feedback */
	description?: string;
	/** The input fields for the feedback */
	options: Options | ((companionModule: ModuleInstance) => Options);
	/**
	 * Called to report the existence of a feedback.
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (
		companionModule: ModuleInstance,
		feedback: TypeOptions<CompanionFeedbackInfo, Options>,
		context: CompanionFeedbackContext,
	) => void | Promise<void>;
	/**
	 * Called to report an feedback has been edited/removed.
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (
		companionModule: ModuleInstance,
		feedback: TypeOptions<CompanionFeedbackInfo, Options>,
		context: CompanionFeedbackContext,
	) => void | Promise<void>;
	/**
	 * The user requested to 'learn' the values for this feedback.
	 */
	learn?: (
		companionModule: ModuleInstance,
		action: TypeOptions<CompanionFeedbackInfo, Options>,
		context: CompanionFeedbackContext,
	) => CompanionOptionValues | undefined | Promise<CompanionOptionValues | undefined>;
	/**
	 * Timeout for the 'learn' function (in milliseconds)
	 * Companion sets a default value of 5s, to ensure that the learn does not get stuck never completing
	 * You can change this if this number does not work for you, but you should keep it to a sensible value
	 */
	learnTimeout?: number;
}

/**
 * The definition of a boolean feedback
 */
export interface S2BooleanFeedback<Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>>
	extends S2FeedbackBase<Options> {
	/** The type of the feedback */
	type: 'boolean';
	/** The default style properties for this feedback */
	defaultStyle: Partial<CompanionFeedbackButtonStyleResult>;
	/** Called to get the feedback value */
	callback: (
		companionModule: ModuleInstance,
		feedback: TypeOptions<CompanionFeedbackBooleanEvent, Options>,
		context: CompanionFeedbackContext,
	) => boolean | Promise<boolean>;
	/**
	 * If `undefined` or true, Companion will add an 'Inverted' checkbox for your feedback, and handle the logic for you.
	 * By setting this to false, you can disable this for your feedback. You should do this if it does not make sense for your feedback.
	 */
	showInvert?: boolean;
}
/**
 * The definition of an advanced feedback
 */
export interface S2AdvancedFeedback<Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>>
	extends S2FeedbackBase<Options> {
	/** The type of the feedback */
	type: 'advanced';
	/** Called to get the feedback value */
	callback: (
		companionModule: ModuleInstance,
		feedback: TypeOptions<CompanionFeedbackAdvancedEvent, Options>,
		context: CompanionFeedbackContext,
	) => CompanionAdvancedFeedbackResult | Promise<CompanionAdvancedFeedbackResult>;
}

export type S2Feedback<Options extends DeepImmutable<SomeCompanionFeedbackInputField[]>> =
	| S2BooleanFeedback<Options>
	| S2AdvancedFeedback<Options>;
