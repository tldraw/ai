import { Box, isPageId } from 'tldraw'
import { TLAiChange, TLAiPrompt } from '../../../shared/types'
import { TldrawAiTransform } from '../../ai/TldrawAiTransform'

export class SimpleCoordinates extends TldrawAiTransform {
	offset = { x: 0, y: 0 }
	offsetIds = new Set<string>()
	adjustments: Record<string, number> = {}

	transformPrompt = (input: TLAiPrompt) => {
		const { editor } = this

		const bounds = Box.Common(
			input.canvasContent.shapes.map((s) => editor.getShapePageBounds(s.id)!)
		)

		this.offset.x = bounds.x
		this.offset.y = bounds.y

		for (const s of input.canvasContent.shapes) {
			for (const prop of ['x', 'y'] as const) {
				this.adjustments[s.id + '_' + prop] = s[prop]
			}
			for (const key in s.props) {
				// @ts-expect-error
				const val = s.props[key]
				if (Number.isFinite(val)) {
					this.adjustments[s.id + '_' + key] = val
					;(s.props as any)[key] = Math.floor(val)
				}
			}
		}

		input.canvasContent.shapes = input.canvasContent.shapes.map((s) => {
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
			case 'createShape':
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
