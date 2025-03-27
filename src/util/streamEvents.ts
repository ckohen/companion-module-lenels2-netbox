import { Dispatcher } from 'undici';
import type { ModuleInstance } from '../main.js';
import { NetboxStreamEventsResponse } from './S2types.js';
import { parseFullXml } from './xml.js';

export async function processStreamChunk(
	chunk: Uint8Array,
	companionInstance: ModuleInstance,
	boundary: string,
): Promise<void> {
	const split: string[] = chunk.toString().split(boundary);
	for (const multipart of split) {
		if (multipart === '') continue;
		const lines = multipart.split('\n');
		const rawData = lines.pop();
		let length = 0;
		for (const line of lines) {
			const [key, value] = line.split(': ');
			if (key === 'Content-Type') {
				if (value !== 'text/xml') {
					companionInstance.log('warn', `Stream Events receieved non-xml content`);
					return;
				}
				continue;
			}
			if (key === 'Content-Length') {
				length = Number(value);
			}
		}
		if (rawData?.length !== length) {
			companionInstance.log(
				'warn',
				`Stream Events receieved mismatched content lengths, received: ${rawData?.length}, expected: ${length}`,
			);
			return;
		}

		const fullResponse = await parseFullXml<'StreamEvents'>(rawData);

		const commandResponse = fullResponse.NETBOX.RESPONSE as NetboxStreamEventsResponse;

		if (commandResponse.command !== 'StreamEvents') {
			throw new Error(`Did not received StreamEvents while streaming, received ${commandResponse.command}`);
		}

		// Pings have no event
		if (commandResponse.EVENT) {
			companionInstance.log('debug', JSON.stringify(commandResponse.EVENT));
			switch (commandResponse.EVENT.DESCNAME) {
				case 'Event activated': {
					if (!commandResponse.EVENT.EVTNAME) return;
					const [_elevator, _unlock, ...rawFloor] = commandResponse.EVENT.EVTNAME.split(' ');
					const floor = rawFloor.join(' ');
					if (floor === 'all floors') {
						companionInstance.state.activeFloorSets.all = true;
						companionInstance.checkFeedbacks('floorSet');
						setTimeout(() => {
							companionInstance.state.activeFloorSets.all = false;
							companionInstance.checkFeedbacks('floorSet');
						}, 60_000);
					} else {
						const floorSet = floor.toLowerCase() as '2' | '3' | '4' | 'b';
						companionInstance.state.activeFloorSets[floorSet] = true;
						companionInstance.checkFeedbacks('floorSet');
						setTimeout(() => {
							companionInstance.state.activeFloorSets[floorSet] = false;
							companionInstance.checkFeedbacks('floorSet');
						}, 60_000);
					}
					break;
				}
				case 'Elevator access granted':
					companionInstance.state.activeFloorSets.all = true;
					companionInstance.checkFeedbacks('floorSet');
					setTimeout(() => {
						companionInstance.state.activeFloorSets.all = false;
						companionInstance.checkFeedbacks('floorSet');
					}, 10_000);
					break;
				default:
					return;
			}
		}
	}
}

export async function processStreamResponse(
	res: Dispatcher.ResponseData,
	companionInstance: ModuleInstance,
): Promise<void> {
	if (200 > res.statusCode || res.statusCode > 300) {
		companionInstance.log('warn', `${new Error(`Stream Events Fetch Error: ${await res.body.text()}`)}`);
		return;
	}

	const rawContentType = res.headers['content-type'];
	if (typeof rawContentType !== 'string') {
		companionInstance.log('warn', `Stream Events receieved invalid content type`);
		return;
	}

	const [contentType, ...contentTypeParams] = rawContentType.split(';');
	if (contentType !== 'multipart/related') {
		companionInstance.log('warn', `Stream Events receieved ${contentType} instead of multipart/related`);
		return;
	}

	let boundary = null;
	let innerType = null;

	for (const contentTypeParam of contentTypeParams) {
		const [key, value] = contentTypeParam.split('=');
		if (key === 'boundary') {
			boundary = value;
			continue;
		}
		if (key === 'type') {
			innerType = value;
		}
	}

	if (!boundary || (innerType && innerType !== 'text/xml')) {
		companionInstance.log('warn', `Stream Events receieved invalid content type params`);
		return;
	}

	companionInstance.log('debug', `Streaming Events, ${res.headers['content-type']}`);
	res.body.on('data', (chunk) => void processStreamChunk(chunk, companionInstance, boundary));
}
