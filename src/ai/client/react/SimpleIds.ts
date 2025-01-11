import { createShapeId } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '../../shared/utils'
import { TLAiChange, TLAiPrompt, TLAiTransform } from '../../shared/ai-shared'
import { Box, isPageId } from 'tldraw'

export class SimpleIds extends TLAiTransform {
	originalIdsToSimpleIds = new Map()
	simpleIdsToOriginalIds = new Map()
	nextSimpleId = 0
	offset = { x: 0, y: 0 }

	transformInput = (input: TLAiPrompt) => {
		const { editor } = this
		// Collect all ids, write simple ids, and write the simple ids
		for (const shape of input.content.shapes) {
			this.collectAllIdsRecursively(shape, this.mapObjectWithIdAndWriteSimple)
		}

		const bounds = Box.Common(
			input.content.shapes.map((s) => editor.getShapePageBounds(s.id)!)
		)

		this.offset.x = bounds.x
		this.offset.y = bounds.y

		input.content.shapes = input.content.shapes.map((s) => {
			return {
				...s,
				x: s.x - this.offset.x,
				y: s.y - this.offset.y,
			}
		})

		return input
	}

	transformChange = (change: TLAiChange) => {
		switch (change.type) {
			case 'createShape': {
				const shape = this.collectAllIdsRecursively(
					change.shape,
					this.writeOriginalIds
				)

				if (!shape.parentId || isPageId(shape.parentId)) {
					shape.x += this.offset.x
					shape.y += this.offset.y
				}

				shape.meta = {
					...shape.meta,
					description: shape.description ?? '',
				}

				delete shape.description

				return {
					...change,
					shape,
				}
			}
			case 'updateShape': {
				const shape = this.collectAllIdsRecursively(
					change.shape,
					this.writeOriginalIds
				)

				if (!shape.parentId || isPageId(shape.parentId)) {
					if ('x' in shape) shape.x += this.offset.x
					if ('y' in shape) shape.y += this.offset.y
				}

				shape.meta = {
					...shape.meta,
					description: shape.description ?? '',
				}

				delete shape.description

				return {
					...change,
					shape,
				}
			}
			case 'deleteShape': {
				return {
					...change,
					shapeId: createShapeId('1'), // this isn't going to be in our map of ids
				}
			}
			default:
				return exhaustiveSwitchError(change)
		}
	}

	private mapObjectWithIdAndWriteSimple(obj: { id: string }) {
		const { originalIdsToSimpleIds, simpleIdsToOriginalIds, nextSimpleId } =
			this

		if (!originalIdsToSimpleIds.has(obj.id)) {
			originalIdsToSimpleIds.set(obj.id, `${nextSimpleId}`)
			simpleIdsToOriginalIds.set(`${nextSimpleId}`, obj.id)
			const tId = `${nextSimpleId}`
			this.nextSimpleId++
			return { ...obj, id: tId }
		}
		return obj
	}

	private writeOriginalIds(obj: { id: string }) {
		const { simpleIdsToOriginalIds } = this
		const id = simpleIdsToOriginalIds.get(obj.id)
		if (id) {
			return { ...obj, id }
		}
		return obj
	}

	private collectAllIdsRecursively(value: any, cb: (obj: any) => any) {
		if (!value || typeof value !== 'object') {
			return value
		}

		if (Array.isArray(value)) {
			value.forEach((item) => this.collectAllIdsRecursively(item, cb))
			return value
		}

		// If object has an id property that's a string, map it
		if ('id' in value && typeof value.id === 'string') {
			return cb(value)
		}

		// Recursively process all object properties
		Object.entries(value).forEach(([key, propValue]) => {
			value[key] = this.collectAllIdsRecursively(propValue, cb)
		})

		return value
	}
}
