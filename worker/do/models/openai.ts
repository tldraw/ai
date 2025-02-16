import { parse } from 'best-effort-json-parser'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod.mjs'
import {
	ChatCompletionContentPart,
	ChatCompletionDeveloperMessageParam,
	ChatCompletionUserMessageParam,
} from 'openai/resources/index.mjs'
import {
	IndexKey,
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLLineShape,
	TLShapePartial,
	TLTextShape,
} from 'tldraw'
import { TLAiSerializedPrompt } from '../../../shared/types'
import {
	ISimpleEvent,
	ISimpleShape,
	ModelResponse,
	OPENAI_SYSTEM_PROMPT,
	SimpleEvent,
} from './openai_schema'

export async function* promptOpenaiModel(
	model: OpenAI,
	prompt: TLAiSerializedPrompt
): AsyncGenerator<ISimpleEvent> {
	const systemPrompt = buildSystemPrompt(prompt)
	const developerMessage = buildDeveloperMessage(prompt)
	const userMessage = buildUserMessages(prompt)

	const stream = model.beta.chat.completions.stream({
		model: 'gpt-4o-2024-08-06',
		messages: [systemPrompt, developerMessage, userMessage],
		response_format: zodResponseFormat(ModelResponse, 'event'),
	})

	let accumulatedText = '' // Buffer for incoming chunks
	let cursor = 0

	const events: ISimpleEvent[] = []
	let maybeUnfinishedEvent: ISimpleEvent | null = null

	// Process the stream as chunks arrive
	for await (const chunk of stream) {
		if (!chunk) continue

		// Add the text to the accumulated text
		accumulatedText += chunk.choices[0]?.delta?.content ?? ''

		// Even though the accumulated text is incomplete JSON, try to extract data
		const json = parse(accumulatedText)

		// If we have events, iterate over the events...
		if (Array.isArray(json?.events)) {
			// Starting at the current cursor, iterate over the events
			for (let i = cursor, len = json.events.length; i < len; i++) {
				const part = json.events[i]
				if (i === cursor) {
					try {
						// Check whether it's a valid event using our schema
						SimpleEvent.parse(part)

						if (i < len) {
							// If this is valid AND there are additional events, we're done with this one
							events.push(part)
							yield part
							maybeUnfinishedEvent = null
							cursor++
						} else {
							// This is the last event we've seen so far, so it might still be cooking
							maybeUnfinishedEvent = part
						}
					} catch {
						// noop but okay, it's just not done enough to be a valid event
					}
				}
			}
		}
	}

	// If we still have an event, then it was the last event to be seen as a JSON object
	// and so we couldn't be sure it was done using the "additional items" check in our loop.
	// We're now done with the items though, so we can yield it now
	if (maybeUnfinishedEvent) {
		events.push(maybeUnfinishedEvent)
		yield maybeUnfinishedEvent
	}

	console.log(events)

	return events
}

/**
 * Build the system prompt.
 */
function buildSystemPrompt(_prompt: TLAiSerializedPrompt) {
	return {
		role: 'system',
		content: OPENAI_SYSTEM_PROMPT,
	} as const
}

function buildDeveloperMessage(prompt: TLAiSerializedPrompt) {
	const developerMessage: ChatCompletionDeveloperMessageParam & {
		content: Array<ChatCompletionContentPart>
	} = {
		role: 'developer',
		content: [],
	}

	developerMessage.content.push({
		type: 'text',
		text: `The user\'s current viewport is: { x: ${prompt.promptBounds.x}, y: ${prompt.promptBounds.y}, width: ${prompt.promptBounds.w}, height: ${prompt.promptBounds.h} }`,
	})

	if (prompt.canvasContent) {
		const simplifiedCanvasContent = canvasContentToSimpleContent(prompt.canvasContent)

		developerMessage.content.push({
			type: 'text',
			// todo: clean up all the newlines
			text: `Here are all of the shapes that are in the user's current viewport:\n\n${JSON.stringify(simplifiedCanvasContent).replaceAll('\n', ' ')}`,
		})
	}

	return developerMessage
}

/**
 * Build the user messages.
 */
function buildUserMessages(prompt: TLAiSerializedPrompt) {
	const userMessage: ChatCompletionUserMessageParam & {
		content: Array<ChatCompletionContentPart>
	} = {
		role: 'user',
		content: [],
	}

	if (prompt.image) {
		userMessage.content.push(
			{
				type: 'image_url',
				image_url: {
					detail: 'auto',
					url: prompt.image,
				},
			},
			{
				type: 'text',
				text: 'Here is a screenshot of the my current viewport.',
			}
		)
	}

	// The message can be either text or an array of text and images
	if (Array.isArray(prompt.message)) {
		// If it's an array, push each message as a separate message
		userMessage.content.push({
			type: 'text',
			text: `Here's what I want you to do:`,
		})

		for (const message of prompt.message) {
			if (message.type === 'image') {
				userMessage.content.push({
					type: 'image_url',
					image_url: {
						url: message.src!,
					},
				})
			} else {
				userMessage.content.push({
					type: 'text',
					text: message.text,
				})
			}
		}
	} else {
		// If it's just the text, push it as a text message
		userMessage.content.push({
			type: 'text',
			text: `Using the events provided in the response schema, here's what I want you to do:\n\n${prompt.message}`,
		})
	}

	return userMessage
}

function canvasContentToSimpleContent(content: TLAiSerializedPrompt['canvasContent']): {
	shapes: ISimpleShape[]
} {
	return {
		shapes: compact(
			content.shapes.map((shape) => {
				if (shape.type === 'text') {
					const s = shape as TLTextShape
					return {
						shapeId: s.id,
						type: 'text',
						text: s.props.text,
						x: s.x,
						y: s.y,
						color: s.props.color,
						textAlign: s.props.textAlign,
						note: (s.meta?.description as string) ?? '',
					}
				}

				if (shape.type === 'geo') {
					const s = shape as TLGeoShape
					if (s.props.geo === 'rectangle' || s.props.geo === 'ellipse') {
						return {
							shapeId: s.id,
							type: s.props.geo,
							x: s.x,
							y: s.y,
							width: s.props.w,
							height: s.props.h,
							color: s.props.color,
							fill: s.props.fill,
							text: s.props.text,
							note: (s.meta?.description as string) ?? '',
						}
					}
				}

				if (shape.type === 'line') {
					const s = shape as TLLineShape
					const points = Object.values(s.props.points).sort((a, b) =>
						a.index.localeCompare(b.index)
					)
					return {
						shapeId: s.id,
						type: 'line',
						x1: points[0].x + s.x,
						y1: points[0].y + s.y,
						x2: points[1].x + s.x,
						y2: points[1].y + s.y,
						color: s.props.color,
						note: (s.meta?.description as string) ?? '',
					}
				}

				if (shape.type === 'arrow') {
					const s = shape as TLArrowShape
					const { bindings = [] } = content
					const arrowBindings = bindings.filter(
						(b) => b.type === 'arrow' && b.fromId === s.id
					) as TLArrowBinding[]
					const startBinding = arrowBindings.find((b) => b.props.terminal === 'start')
					const endBinding = arrowBindings.find((b) => b.props.terminal === 'end')

					return {
						shapeId: s.id,
						type: 'arrow',
						fromId: startBinding?.toId ?? null,
						toId: endBinding?.toId ?? null,
						x1: s.props.start.x,
						y1: s.props.start.y,
						x2: s.props.end.x,
						y2: s.props.end.y,
						color: s.props.color,
						text: s.props.text,
						note: (s.meta?.description as string) ?? '',
					}
				}
			})
		),
	}
}

export function simpleShapeToCanvasShape(shape: ISimpleShape): TLShapePartial {
	if (shape.type === 'text') {
		return {
			id: shape.shapeId as any,
			type: 'text',
			x: shape.x,
			y: shape.y - 12,
			props: {
				text: shape.text,
				color: shape.color ?? 'black',
				textAlign: shape.textAlign ?? 'middle',
			},
			meta: {
				description: shape.note,
			},
		}
	} else if (shape.type === 'line') {
		const minX = Math.min(shape.x1, shape.x2)
		const minY = Math.min(shape.y1, shape.y2)
		return {
			id: shape.shapeId as any,
			type: 'line',
			x: minX,
			y: minY,
			props: {
				points: {
					a1: {
						id: 'a1',
						index: 'a2' as IndexKey,
						x: shape.x1 - minX,
						y: shape.y1 - minY,
					},
					a2: {
						id: 'a2',
						index: 'a2' as IndexKey,
						x: shape.x2 - minX,
						y: shape.y2 - minY,
					},
				},
				color: shape.color ?? 'black',
			},
		}
	} else if (shape.type === 'arrow') {
		// todo: create binding
		return {
			id: shape.shapeId as any,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				color: shape.color ?? 'black',
				text: shape.text ?? '',
			},
		}
	} else if (shape.type === 'rectangle' || shape.type === 'ellipse') {
		return {
			id: shape.shapeId as any,
			type: 'geo',
			x: shape.x,
			y: shape.y,
			props: {
				geo: shape.type,
				w: shape.width,
				h: shape.height,
				color: shape.color ?? 'black',
				fill: shape.fill ?? 'none',
				text: shape.text ?? '',
			},
		}
	} else {
		throw new Error('Unknown shape type')
	}
}

function compact<T>(arr: T[]): Exclude<T, undefined>[] {
	return arr.filter(Boolean) as Exclude<T, undefined>[]
}
