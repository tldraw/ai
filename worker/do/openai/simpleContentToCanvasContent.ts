import { IndexKey, TLShapePartial } from 'tldraw'
import { ISimpleShape } from './schema'

function simpleShapeToCanvasShape(shape: ISimpleShape): TLShapePartial {
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
