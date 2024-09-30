import {
	CompanionActionContext,
	CompanionActionEvent,
	CompanionActionInfo,
	CompanionOptionValues,
	SomeCompanionActionInputField,
} from '@companion-module/base';
import type { ModuleInstance } from '../main.js';

export type DeepImmutable<T> =
	T extends Map<infer K, infer V>
		? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
		: T extends Set<infer S>
			? ReadonlySet<DeepImmutable<S>>
			: T extends object
				? { readonly [K in keyof T]: DeepImmutable<T[K]> }
				: T;

export interface OptionTypeToTypescriptType {
	'bonjour-device': string;
	checkbox: boolean;
	colorpicker: string | number;
	'custom-variable': string;
	dropdown: string | number;
	multidropdown: (string | number)[];
	number: number;
	'static-text': string;
	textinput: string;
}

export type TypeOptions<Base, Options extends DeepImmutable<SomeCompanionActionInputField[]>> = Omit<
	Base,
	'options'
> & {
	options: { [Option in Options[number] as Option['id']]: OptionTypeToTypescriptType[Option['type']] | undefined };
};

export interface S2Action<Options extends DeepImmutable<SomeCompanionActionInputField[]>> {
	/** Name to show in the actions list */
	name: string;
	/** Additional description of the action */
	description?: string;
	/** The input fields for the action */
	options: Options | ((companionModule: ModuleInstance) => Options);
	/** Called to execute the action */
	callback: (
		companionModule: ModuleInstance,
		action: TypeOptions<CompanionActionEvent, Options>,
		context: CompanionActionContext,
	) => Promise<void> | void;
	/**
	 * Called to report the existence of an action
	 * Useful to ensure necessary data is loaded
	 */
	subscribe?: (
		companionModule: ModuleInstance,
		action: TypeOptions<CompanionActionInfo, Options>,
		context: CompanionActionContext,
	) => Promise<void> | void;
	/**
	 * Called to report an action has been edited/removed
	 * Useful to cleanup subscriptions setup in subscribe
	 */
	unsubscribe?: (
		companionModule: ModuleInstance,
		action: TypeOptions<CompanionActionInfo, Options>,
		context: CompanionActionContext,
	) => Promise<void> | void;
	/**
	 * The user requested to 'learn' the values for this action.
	 */
	learn?: (
		companionModule: ModuleInstance,
		action: TypeOptions<CompanionActionInfo, Options>,
		context: CompanionActionContext,
	) => CompanionOptionValues | undefined | Promise<CompanionOptionValues | undefined>;
	/**
	 * Timeout for the 'learn' function (in milliseconds)
	 * Companion sets a default value of 5s, to ensure that the learn does not get stuck never completing
	 * You can change this if this number does not work for you, but you should keep it to a sensible value
	 */
	learnTimeout?: number;
}
