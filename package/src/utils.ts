import { TLAiMessage, TLAiMessages } from './types'

/** @public */
export function exhaustiveSwitchError(value: never, property?: string): never {
	const debugValue =
		property && value && typeof value === 'object' && property in value ? value[property] : value
	throw new Error(`Unknown switch case ${debugValue}`)
}

/** @public */
export function asMessage(message: TLAiMessages): TLAiMessage[] {
	if (Array.isArray(message)) return message
	if (typeof message === 'string') return [{ type: 'text', text: message }]
	return [message]
}
