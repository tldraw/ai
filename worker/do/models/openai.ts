import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod.mjs'
import {
	ChatCompletionContentPart,
	ChatCompletionUserMessageParam,
} from 'openai/resources/index.mjs'
import { IndexKey, TLGeoShape, TLLineShape, TLShapePartial, TLTextShape } from 'tldraw'
import { TLAiSerializedPrompt } from '../../../shared/types'
import { ISimpleShape, ModelResponse } from './openai_schema'

export async function promptOpenaiModel(model: OpenAI, prompt: TLAiSerializedPrompt) {
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

function canvasContentToSimpleContent(content: TLAiSerializedPrompt['canvasContent']): {
	shapes: ISimpleShape[]
} {
	return {
		shapes: compact(
			content.shapes.map((shape) => {
				let s
				if (shape.type === 'text') {
					s = shape as TLTextShape
					return {
						shapeId: s.id,
						type: 'text',
						text: s.props.text,
						x: s.x,
						y: s.y,
						color: s.props.color,
						textAlign: s.props.textAlign,
					}
				}

				if (shape.type === 'geo') {
					s = shape as TLGeoShape
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
						}
					}
				}

				if (shape.type === 'line') {
					s = shape as TLLineShape
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
					}
				}
			})
		),
	}
}

export function simpleShapeToCanvasShape(shape: ISimpleShape): Omit<TLShapePartial, 'id'> {
	if (shape.type === 'text') {
		return {
			type: 'text',
			x: shape.x,
			y: shape.y - 12,
			props: {
				text: shape.text,
				color: shape.color ?? 'black',
				textAlign: shape.textAlign ?? 'middle',
			},
		}
	} else if (shape.type === 'line') {
		const minX = Math.min(shape.x1, shape.x2)
		const minY = Math.min(shape.y1, shape.y2)
		return {
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
	} else {
		return {
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
	}
}

function compact<T>(arr: T[]): Exclude<T, undefined>[] {
	return arr.filter(Boolean) as Exclude<T, undefined>[]
}
