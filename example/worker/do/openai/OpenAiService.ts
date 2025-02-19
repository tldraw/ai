import { TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import OpenAI from 'openai'
import { Environment } from '../../types'
import { generateEvents } from './generate'
import { ISimpleEvent } from './schema'
import { simpleContentToCanvasContent } from './simpleContentToCanvasContent'
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
		const changes = events.map((event) => this.simpleEventToTldrawAiChanges(prompt, event)).flat()

		if (this.env.LOG_LEVEL === 'debug') {
			console.log(events)
		}

		return {
			changes,
		}
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		for await (const simpleEvent of streamEvents(this.openai, prompt)) {
			for (const event of this.simpleEventToTldrawAiChanges(prompt, simpleEvent)) {
				if (this.env.LOG_LEVEL === 'debug') {
					console.log(event)
				}
				yield event
			}
		}
	}

	simpleEventToTldrawAiChanges(prompt: TLAiSerializedPrompt, event: ISimpleEvent) {
		const changes: TLAiChange[] = []

		switch (event.type) {
			case 'update':
			case 'create': {
				const { shape } = event

				// Collect changes based on the type of shape we're creating
				const _changes = simpleContentToCanvasContent({ prompt, event, shape })

				// Since we made new shapes, we need to add them provisionally to the canvasContent
				// so that other references to these shapes or bindings will work correctly
				for (const change of _changes) {
					if (change.type === 'createShape') {
						prompt.canvasContent.shapes.push(change.shape as any)
					} else if (change.type === 'createBinding') {
						prompt.canvasContent.bindings?.push(change.binding as any)
					}
				}

				// Now we can add the changes to the final list
				changes.push(..._changes)

				break
			}
			case 'delete': {
				const { shapeId, intent } = event
				const change: TLAiChange = {
					type: 'deleteShape',
					description: intent ?? '',
					shapeId: shapeId as any,
				}

				changes.push(change)
				break
			}
			// case 'move': {
			// 	const { shapeId, intent } = event
			// 	const change: TLAiChange = {
			// 		type: 'updateShape',
			// 		description: intent ?? '',
			// 		shape: {
			// 			id: shapeId as any,
			// 			x: event.x,
			// 			y: event.y,
			// 		},
			// 	}

			// 	changes.push(change)
			// 	break
			// }
			// case 'label': {
			// 	const { shapeId, intent } = event
			// 	const change: TLAiChange = {
			// 		type: 'updateShape',
			// 		description: intent ?? '',
			// 		shape: {
			// 			id: shapeId as any,
			// 			props: {
			// 				text: event.text,
			// 			},
			// 		},
			// 	}

			// 	changes.push(change)
			// 	break
			// }
		}

		return changes
	}
}
