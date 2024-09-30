import { Regex, type SomeCompanionConfigField } from '@companion-module/base';

export interface S2Config {
	host?: string;
	port?: number;
	ssl?: boolean;
	username?: string;
	password?: string;
	pingInterval?: number;
	logName?: string;
}

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'This Module was built to work with Netbox API Version 2.<br />' +
				'If your Netbox is running version 5.6 or newer, this module will work with it<br />' +
				'Please ensure API is enabled with useername / password in Site Settings>Network Controller>Data Integration',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 443,
		},
		{ type: 'checkbox', id: 'ssl', default: true, label: 'Use HTTPS', width: 4 },
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			width: 8,
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Password',
			width: 8,
		},
		{
			type: 'number',
			id: 'pingInterval',
			label: 'Ping Interval (minutes)',
			tooltip: 'The interval at which to ping the netbox to avoid session disconnects.',
			width: 4,
			min: 1,
			max: 1440,
			default: 4,
		},
		{
			type: 'textinput',
			id: 'logName',
			default: 'Companion',
			label: 'Log Name',
			width: 8,
			tooltip: 'The name displayed in the S2 Activity Log when triggering outputs',
		},
	] as const satisfies SomeCompanionConfigField[];
}
