//#region Payloads

export interface FullNetboxPayload<InnerPayload extends NetboxPayload | never> {
	'NETBOX-API': {
		$: { sessionid: string | undefined };
		COMMAND: { $: { name: string; num: 1; dateformat?: 'tzoffset' | undefined }; PARAMS?: InnerPayload };
	};
}

export type NetboxPayload = NetboxPayloads[keyof NetboxPayloads];
export interface NetboxPayloads {
	ActivateOutput: NetboxActivateOutputPayload;
	DeactivateOutput: NetboxDeactivateOutputPayload;
	GetAPIVersion: never;
	GetOutputs: NetboxGetOutputsPayload;
	InsertActivity: NetboxInsertActivityPayload;
	ListEvents: never;
	Login: NetboxLoginPayload;
	Logout: never;
	PingApp: never;
	TriggerEvent: NetboxTriggerEventPayload;
}

export interface NetboxActivateOutputPayload {
	OUTPUTKEY: number;
}

export type NetboxDeactivateOutputPayload = NetboxActivateOutputPayload;

export interface NetboxGetOutputsPayload {
	STARTFROMKEY: number;
}

export type NetboxInsertActivityPayload = NetboxInsertUserActivityActivityPayload;

export interface NetboxInsertActivityBasePayload {
	/**
	 * Only USERACTIVITY is supported because personid is required for the rest
	 */
	ACTIVITYTYPE: 'ACCESSGRANTED' | 'ACCESSDENIED' | 'USERACTIVITY';
	ACTIVITYTEXT?: string;
}

export interface NetboxInsertUserActivityActivityPayload extends NetboxInsertActivityBasePayload {
	ACTIVITYTYPE: 'USERACTIVITY';
}

export interface NetboxListEventsPayload {
	STARTFROMKEY: number;
}

export interface NetboxLoginPayload {
	USERNAME: string;
	PASSWORD: string;
}

export interface NetboxTriggerEventPayload {
	EVENTNAME: string;
	EVENTACTION: 'ACTIVATE' | 'DEACTIVATE';
	PARTITIONID?: number;
}

//#region Responses

export enum APIError {
	APIFailedToIntialize = 1,
	APINotEnabled,
	InvalidAPICommand,
	UnableToParse,
	AuthenticationFailure,
	UnknownCommand,
}

export interface NetboxAPIErrorResponse {
	APIERROR: APIError;
}

export type NetboxCommandResponse<InnerResponse extends NetboxResponse | never = never> =
	| NetboxCommandSuccessResponse<InnerResponse>
	| NetboxCommandFailResponse
	| NetboxCommandNotFoundResponse;

export interface NetboxCommandResponseBase {
	command: string;
	num: number;
	CODE: 'SUCCESS' | 'FAIL' | 'NOT FOUND';
}

export interface NetboxCommandNotFoundResponse extends NetboxCommandResponseBase {
	CODE: 'NOT FOUND';
}

export interface NetboxCommandFailResponse extends NetboxCommandResponseBase {
	CODE: 'FAIL';
	DETAILS?: { ERRMSG?: string };
}

export interface NetboxCommandSuccessResponse<InnerResponse extends NetboxResponse | never = never>
	extends NetboxCommandResponseBase {
	CODE: 'SUCCESS';
	DETAILS: InnerResponse;
}

export interface FullNetboxResponse<InnerResponse extends NetboxResponse | never = never> {
	NETBOX: {
		sessionid?: string;
		RESPONSE: NetboxAPIErrorResponse | NetboxCommandResponse<InnerResponse>;
	};
}

export type NetboxResponse = NetboxResponses[keyof NetboxResponses];
export interface NetboxResponses {
	ActivateOutput: NetboxActivateOutputResponse;
	DeactivateOutput: NetboxDeactivateOutputResponse;
	GetAPIVersion: NetboxGetAPIVersionResponse;
	GetOutputs: NetboxGetOutputsResponse;
	InsertActivity: never;
	ListEvents: NetboxListEventsResponse;
	Login: never;
	Logout: never;
	PingApp: never;
	TriggerEvent: never;
}

export interface NetboxActivateOutputResponse {
	OUTPUTKEY: number;
}

export type NetboxDeactivateOutputResponse = NetboxActivateOutputResponse;

export interface NetboxGetAPIVersionResponse {
	APIVERSION: number;
}

export interface NetboxOutput {
	NAME: string;
	OUTPUTKEY: number;
}

export interface NetboxGetOutputsResponse {
	OUTPUTS: {
		OUTPUT: NetboxOutput[] | NetboxOutput;
	};
	NEXTKEY: number;
}

export interface NetboxEvent {
	ID: number;
	NAME: string;
	PARTITIONID: number;
	ACTIONS: { ACTION: string[] };
}

export interface NetboxListEventsResponse {
	EVENTS: {
		EVENT: NetboxEvent[] | NetboxEvent;
	};
	NEXTKEY: number;
}
