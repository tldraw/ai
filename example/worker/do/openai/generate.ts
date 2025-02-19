import { TLAiSerializedPrompt } from '@tldraw/ai'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { buildPromptMessages } from './prompt'
import { IModelResponse, ISimpleEvent, ModelResponse } from './schema'

const OPENAI_MODEL = 'gpt-4o-2024-08-06'
const RESPONSE_FORMAT = zodResponseFormat(ModelResponse, 'event')

/**
 * Prompt the OpenAI model with the given prompt. Stream the events as they come back.
 */
export async function generateEvents(
	model: OpenAI,
	prompt: TLAiSerializedPrompt
): Promise<ISimpleEvent[]> {
	const response = await model.chat.completions.create({
		model: OPENAI_MODEL,
		messages: buildPromptMessages(prompt),
		response_format: RESPONSE_FORMAT,
	})

	const text = response.choices[0]?.message?.content ?? ''
	const json = JSON.parse(text) as IModelResponse

	try {
		ModelResponse.parse(json)
	} catch (err) {
		throw new Error(`Invalid response from OpenAI: ${err}`)
	}

	return json.events
}
