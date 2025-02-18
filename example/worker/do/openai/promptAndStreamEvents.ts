import { TLAiSerializedPrompt } from '@tldraw/ai'
import { parse } from 'best-effort-json-parser'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import {
	ChatCompletionContentPart,
	ChatCompletionDeveloperMessageParam,
	ChatCompletionUserMessageParam,
} from 'openai/resources'
import { canvasContentToSimpleContent } from './canvasContentToSimpleContent'
import { ISimpleEvent, ModelResponse, SimpleEvent } from './schema'
import { OPENAI_SYSTEM_PROMPT } from './system-prompt'

/**
 * Prompt the OpenAI model with the given prompt. Stream the events as they come back.
 */
export async function* promptAndStreamEvents(
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

	// If it's an array, push each message as a separate message
	userMessage.content.push({
		type: 'text',
		text: `Using the events provided in the response schema, here's what I want you to do:`,
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

	return userMessage
}
