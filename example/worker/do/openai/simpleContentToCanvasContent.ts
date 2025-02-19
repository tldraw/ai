import { TLAiChange, TLAiSerializedPrompt } from '@tldraw/ai'
import { IndexKey, TLArrowBinding, TLArrowShape, TLDefaultFillStyle, TLShapePartial } from 'tldraw'
import { ISimpleCreateEvent, ISimpleFill, ISimpleShape } from './schema'

export function simpleContentToCanvasContent({
	prompt,
	event,
	shape,
}: {
	prompt: TLAiSerializedPrompt
	event: ISimpleCreateEvent
	shape: ISimpleShape
}): TLAiChange[] {
	switch (shape.type) {
		case 'text': {
			return [
				{
					type: 'createShape',
					description: shape.note ?? '',
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
					},
				},
			]
		}
		case 'line': {
			const minX = Math.min(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)

			return [
				{
					type: 'createShape',
					description: shape.note ?? '',
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
		case 'arrow': {
			const { shapeId, fromId, toId, x1, x2, y1, y2 } = shape

			const changes: (TLAiChange & { type: 'createShape' | 'createBinding' })[] = []

			// Make sure that the shape itself is the first change
			changes.push({
				type: 'createShape',
				description: shape.note ?? '',
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
					description: shape.note ?? '',
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
					description: shape.note ?? '',
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
		case 'rectangle':
		case 'ellipse': {
			return [
				{
					type: 'createShape',
					description: shape.note ?? '',
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
							fill: simpleFillToShapeFill(shape.fill ?? 'none'),
							text: shape.text ?? '',
						},
					},
				},
			]
		}

		case 'note': {
			return [
				{
					type: 'createShape',
					description: shape.note ?? '',
					shape: {
						id: shape.shapeId as any,
						type: 'note',
						x: shape.x,
						y: shape.y,
						props: {
							geo: shape.type,
							color: shape.color ?? 'black',
							text: shape.text ?? '',
						},
					},
				},
			]
		}

		case 'unknown': {
			// shouldn't really appear here...

			const originalShape = prompt.canvasContent.shapes.find((s) => s.id === shape.shapeId)
			if (!originalShape) return []

			return [
				{
					type: 'createShape',
					description: shape.note ?? '',
					shape: originalShape,
				},
			]
		}
	}
}

const FILL_MAP: Record<ISimpleFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'fill',
	semi: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

function simpleFillToShapeFill(fill: ISimpleFill): TLDefaultFillStyle {
	return FILL_MAP[fill]
}
