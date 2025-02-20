import { TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import OpenAI from 'openai'
import { Environment } from '../../types'
import { generateEvents } from './generate'
import { getTldrawAiChangesForSimpleEvents } from './getTldrawAiChangesForSimpleEvents'
import { streamEvents } from './stream'

export class OpenAiService {
	openai: OpenAI

	constructor(public env: Environment) {
		this.openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		})
	}

	async generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult> {
		const events = await generateEvents(this.openai, prompt)

		const changes: TLAiChange[] = []

		for (const event of events) {
			changes.push(...getTldrawAiChangesForSimpleEvents(prompt, event))
		}

		if (this.env.LOG_LEVEL === 'debug') {
			console.log(events)
		}

		return {
			changes,
		}
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		for await (const simpleEvent of streamEvents(this.openai, prompt)) {
			for (const event of getTldrawAiChangesForSimpleEvents(prompt, simpleEvent)) {
				if (this.env.LOG_LEVEL === 'debug') {
					console.log(event)
				}
				yield event
			}
		}
	}
}
