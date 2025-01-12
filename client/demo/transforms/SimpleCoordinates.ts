import { Box, isPageId } from 'tldraw'
import { TLAiPrompt, TLAiChange } from '../../../shared/types'
import { TldrawAiTransform } from '../../ai/TldrawAiTransform'

export class SimpleCoordinates extends TldrawAiTransform {
	offset = { x: 0, y: 0 }
	offsetIds = new Set<string>()

	transformPrompt = (input: TLAiPrompt) => {
		const { editor } = this

		const bounds = Box.Common(
			input.content.shapes.map((s) => editor.getShapePageBounds(s.id)!)
		)

		this.offset.x = bounds.x
		this.offset.y = bounds.y

		input.content.shapes = input.content.shapes.map((s) => {
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
