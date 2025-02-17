import { TLAiChange, TLAiPrompt, TldrawAiTransform } from '@tldraw/ai'
import { isPageId } from 'tldraw'

export class SimpleCoordinates extends TldrawAiTransform {
	offset = { x: 0, y: 0 }
	offsetIds = new Set<string>()
	adjustments: Record<string, number> = {}

	override transformPrompt = (input: TLAiPrompt) => {
		const { canvasContent } = input

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

	override transformChange = (change: TLAiChange) => {
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
