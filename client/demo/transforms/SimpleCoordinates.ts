import { isPageId } from 'tldraw'
import { TLAiChange, TLAiPrompt } from '../../../shared/types'
import { TldrawAiTransform } from '../../ai/TldrawAiTransform'

export class SimpleCoordinates extends TldrawAiTransform {
	offset = { x: 0, y: 0 }
	offsetIds = new Set<string>()
	adjustments: Record<string, number> = {}

	transformPrompt = (input: TLAiPrompt) => {
		const { editor } = this

		const { promptBounds, canvasContent } = input

		for (const s of canvasContent.shapes) {
			for (const prop of ['x', 'y'] as const) {
				s[prop] = Math.floor(s[prop])
				this.adjustments[s.id + '_' + prop] = s[prop]
			}
			for (const key in s.props) {
				// @ts-expect-error
				const val = s.props[key]
				if (Number.isFinite(val)) {
					;(s.props as any)[key] = Math.floor(val)
					this.adjustments[s.id + '_' + key] = val
					;(s.props as any)[key] = Math.floor(val)
				}
			}
		}

		// Bounds of the shapes
		// if (canvasContent.shapes.length) {
		// 	const bounds = Box.Common(canvasContent.shapes.map((s) => editor.getShapePageBounds(s.id)!))
		// 	this.offset.x = bounds.x - promptBounds.x
		// 	this.offset.y = bounds.y - promptBounds.y
		// } else {
		// 	this.offset.x = promptBounds.x
		// 	this.offset.y = promptBounds.y
		// }

		canvasContent.shapes = canvasContent.shapes.map((s) => {
			if (isPageId(s.parentId)) {
				this.offsetIds.add(s.id)
				return {
					...s,
					x: s.x - this.offset.x,
					y: s.y - this.offset.y,
				}
			} else {
				return s
			}
		})

		return input
	}

	transformChange = (change: TLAiChange) => {
		const { offsetIds } = this
		switch (change.type) {
			case 'createShape': {
				const { shape } = change
				shape.x ??= 0
				shape.y ??= 0
				shape.x += this.offset.x
				shape.y += this.offset.y

				return {
					...change,
					shape,
				}
			}
			case 'updateShape': {
				const { shape } = change
				if (offsetIds.has(shape.id)) {
					if (shape.x) shape.x += this.offset.x
					if (shape.y) shape.y += this.offset.y
				}

				return {
					...change,
					shape,
				}
			}
			default: {
				return change
			}
		}
	}
}
