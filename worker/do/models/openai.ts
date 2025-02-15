import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod.mjs'
import {
	ChatCompletionContentPart,
	ChatCompletionUserMessageParam,
} from 'openai/resources/index.mjs'
import { TLGeoShape, TLLineShape, TLTextShape } from 'tldraw'
import { TLAiSerializedPrompt } from '../../../shared/types'
import { ModelResponse, OPENAI_SYSTEM_PROMPT } from './openai_schema'

export async function promptOpenaiModel(model: OpenAI, prompt: TLAiSerializedPrompt) {
	// @ts-expect-error
	delete prompt.defaultShapeProps
	// @ts-expect-error
	delete prompt.defaultBindingProps

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
				text: 'This is an image of the canvas.',
			}
		)
	}

	if (prompt.canvasContent) {
		const simplifiedCanvasContent = canvasContentToSimpleContent(prompt.canvasContent)

		userMessage.content.push({
			type: 'text',
			text: `Here's a description of the canvas content:\n\n${JSON.stringify(simplifiedCanvasContent).replaceAll('\n', ' ')}`,
		})
	}

	if (Array.isArray(prompt.message)) {
		userMessage.content.push(
			{
				type: 'text',
				text: `Ok. Using the events provided in the response schema, here's what I want you to do:`,
			},
			...prompt.message.map(
				(message) =>
					(message.type === 'image'
						? {
								type: 'image_url' as const,
								image_url: {
									url: message.src!,
								},
							}
						: { type: 'text', text: message.text }) as ChatCompletionContentPart
			)
		)
	} else {
		userMessage.content.push({ type: 'text', text: `The user's prompt is: ${prompt.message}` })
	}

	console.log(
		JSON.stringify(
			[
				{
					role: 'system',
					content: OPENAI_SYSTEM_PROMPT,
				},
				userMessage,
			],
			null,
			2
		)
	)

	return await model.beta.chat.completions.parse({
		model: 'gpt-4o-2024-08-06',
		messages: [
			{
				role: 'system',
				content: 'Create a series of events that will satisfy the user prompt.',
			},
			userMessage,
		],
		response_format: zodResponseFormat(ModelResponse, 'event'),
	})
}

function canvasContentToSimpleContent(content: TLAiSerializedPrompt['canvasContent']) {
	return {
		shapes: content.shapes
			.map((shape) => {
				let s
				if (shape.type === 'text') {
					s = shape as TLTextShape
					return {
						id: s.id,
						type: 'text',
						text: s.props.text,
						x: s.x,
						y: s.y,
						color: s.props.color,
					}
				}

				if (shape.type === 'geo') {
					s = shape as TLGeoShape
					if (s.props.geo === 'rectangle' || s.props.geo === 'ellipse') {
						return {
							id: s.id,
							type: s.props.geo,
							x: s.x,
							y: s.y,
							width: s.props.w,
							height: s.props.h,
							color: s.props.color,
							fill: s.props.fill,
							text: s.props.text,
						}
					}
				}

				if (shape.type === 'line') {
					s = shape as TLLineShape
					return {
						id: s.id,
						type: 'line',
						x1: s.props.points[0].x + s.x,
						y1: s.props.points[0].y + s.y,
						x2: s.props.points[1].x + s.x,
						y2: s.props.points[1].y + s.y,
						color: s.props.color,
					}
				}
			})
			.filter(Boolean),
	}
}
