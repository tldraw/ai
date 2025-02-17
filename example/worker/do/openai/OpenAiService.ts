import { TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import OpenAI from 'openai'
import { IndexKey, TLArrowBinding, TLArrowShape, TLShapePartial } from 'tldraw'
import { Environment } from '../../types'
import { promptAndStreamEvents } from './promptAndStreamEvents'
import {
	ISimpleArrowShape,
	ISimpleCreateEvent,
	ISimpleEllipseShape,
	ISimpleEvent,
	ISimpleLineShape,
	ISimpleRectangleShape,
	ISimpleShape,
	ISimpleTextShape,
} from './schema'

export class OpenAiService {
	openai: OpenAI

	constructor(env: Environment) {
		this.openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		})
	}

	async generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult> {
		const changes: TLAiChange[] = []

		for await (const event of promptAndStreamEvents(this.openai, prompt)) {
			changes.push(...this.handleEvent(prompt, event))
		}

		return {
			changes,
		}
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		for await (const simpleEvent of promptAndStreamEvents(this.openai, prompt)) {
			for (const event of this.handleEvent(prompt, simpleEvent)) {
				yield event
			}
		}
	}

	handleEvent(prompt: TLAiSerializedPrompt, event: ISimpleEvent) {
		const changes: TLAiChange[] = []

		switch (event.type) {
			case 'create': {
				const { shape } = event
				let _changes: TLAiChange[] = []

				// Collect changes based on the type of shape we're creating
				if (shape.type === 'arrow') {
					_changes = createArrowHandler({ prompt, event, shape })
				} else if (shape.type === 'text') {
					_changes = createTextHandler({ prompt, event, shape })
				} else if (shape.type === 'line') {
					_changes = createLineHandler({ prompt, event, shape })
				} else if (shape.type === 'rectangle' || shape.type === 'ellipse') {
					_changes = createGeoHandler({ prompt, event, shape })
				}

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
			case 'move': {
				const { shapeId } = event
				const change: TLAiChange = {
					type: 'updateShape',
					description: event.intent ?? '',
					shape: {
						id: shapeId as any,
						x: event.x,
						y: event.y,
					},
				}

				changes.push(change)
				break
			}
			case 'label': {
				const { shapeId } = event
				const change: TLAiChange = {
					type: 'updateShape',
					description: event.intent ?? '',
					shape: {
						id: shapeId as any,
						props: {
							text: event.text,
						},
					},
				}

				changes.push(change)
				break
			}
			case 'delete': {
				const { shapeId } = event
				const change: TLAiChange = {
					type: 'deleteShape',
					description: event.intent ?? '',
					shapeId: shapeId as any,
				}

				changes.push(change)
				break
			}
		}

		return changes
	}
}

type CreateHandler<T extends ISimpleShape> = (info: {
	prompt: TLAiSerializedPrompt
	event: ISimpleCreateEvent
	shape: T
}) => TLAiChange[]

const createTextHandler: CreateHandler<ISimpleTextShape> = ({ event, shape }) => {
	return [
		{
			type: 'createShape',
			description: event.intent ?? '',
			shape: {
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
			},
		},
	]
}

const createLineHandler: CreateHandler<ISimpleLineShape> = ({ event, shape }) => {
	const minX = Math.min(shape.x1, shape.x2)
	const minY = Math.min(shape.y1, shape.y2)

	return [
		{
			type: 'createShape',
			description: event.intent ?? '',
			shape: {
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
			},
		},
	]
}

const createArrowHandler: CreateHandler<ISimpleArrowShape> = ({ prompt, event, shape }) => {
	const { shapeId, fromId, toId, x1, x2, y1, y2 } = shape

	const changes: (TLAiChange & { type: 'createShape' | 'createBinding' })[] = []

	// Make sure that the shape itself is the first change
	changes.push({
		type: 'createShape',
		description: event.intent ?? '',
		shape: {
			id: shapeId as any,
			type: 'arrow',
			x: 0,
			y: 0,
			props: {
				color: shape.color ?? 'black',
				text: shape.text ?? '',
				start: { x: x1, y: y1 },
				end: { x: x2, y: y2 },
			},
		} satisfies TLShapePartial<TLArrowShape>,
	})

	// Does the arrow have a start shape? Then try to create the binding

	const startShape = fromId ? prompt.canvasContent.shapes.find((s) => s.id === fromId) : null

	if (startShape) {
		changes.push({
			type: 'createBinding',
			description: event.intent ?? '',
			binding: {
				type: 'arrow',
				fromId: shapeId as any,
				toId: startShape.id,
				props: {
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					terminal: 'start',
				},
				meta: {},
				typeName: 'binding',
			} satisfies Omit<TLArrowBinding, 'id'>,
		})
	}

	// Does the arrow have an end shape? Then try to create the binding

	const endShape = toId ? prompt.canvasContent.shapes.find((s) => s.id === toId) : null

	if (endShape) {
		changes.push({
			type: 'createBinding',
			description: event.intent ?? '',
			binding: {
				type: 'arrow',
				fromId: shapeId as any,
				toId: endShape.id,
				props: {
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					terminal: 'end',
				},
				meta: {},
				typeName: 'binding',
			} satisfies Omit<TLArrowBinding, 'id'>,
		})
	}

	return changes
}

const createGeoHandler: CreateHandler<ISimpleEllipseShape | ISimpleRectangleShape> = ({
	event,
	shape,
}) => {
	return [
		{
			type: 'createShape',
			description: event.intent ?? '',
			shape: {
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
			},
		},
	]
}
