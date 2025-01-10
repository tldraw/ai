import { createShapeId, TLShapeId } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '../../shared/utils'
import {
	createTldrawAiTransform,
	TLAiChange,
	TLAiPrompt,
	TLAiTransform,
} from '../../shared/ai-shared'
import { Box, Editor, isPageId } from 'tldraw'

interface SimpleIdsMemo {
	originalIdsToSimpleIds: Map<string, string>
	simpleIdsToOriginalIds: Map<string, string>
	nextSimpleId: number
	offset: { x: number; y: number }
}

function mapObjectWithIdAndWriteSimple(
	obj: { id: string },
	memo: SimpleIdsMemo
) {
	const { originalIdsToSimpleIds, simpleIdsToOriginalIds, nextSimpleId } = memo

	if (!originalIdsToSimpleIds.has(obj.id)) {
		originalIdsToSimpleIds.set(obj.id, `${nextSimpleId}`)
		simpleIdsToOriginalIds.set(`${nextSimpleId}`, obj.id)
		const tId = `${nextSimpleId}`
		memo.nextSimpleId++
		return { ...obj, id: tId }
	}
	return obj
}

function writeOriginalIds(obj: { id: string }, memo: SimpleIdsMemo) {
	const { simpleIdsToOriginalIds } = memo
	const id = simpleIdsToOriginalIds.get(obj.id)
	if (id) {
		return { ...obj, id }
	}
	return obj
}

function collectAllIdsRecursively(
	value: any,
	memo: SimpleIdsMemo,
	cb: (obj: any, memo: SimpleIdsMemo) => any
) {
	if (!value || typeof value !== 'object') {
		return value
	}

	if (Array.isArray(value)) {
		value.forEach((item) => collectAllIdsRecursively(item, memo, cb))
		return value
	}

	// If object has an id property that's a string, map it
	if ('id' in value && typeof value.id === 'string') {
		return cb(value, memo)
	}

	// Recursively process all object properties
	Object.entries(value).forEach(([key, propValue]) => {
		value[key] = collectAllIdsRecursively(propValue, memo, cb)
	})

	return value
}

export const simpleIdTransforms = createTldrawAiTransform(() => {
	const memo: SimpleIdsMemo = {
		originalIdsToSimpleIds: new Map(),
		simpleIdsToOriginalIds: new Map(),
		nextSimpleId: 0,
		offset: { x: 0, y: 0 },
	}

	return {
		transformInput: (editor: Editor, input: TLAiPrompt) => {
			// Collect all ids, write simple ids, and write the simple ids
			for (const shape of input.content.shapes) {
				collectAllIdsRecursively(shape, memo, mapObjectWithIdAndWriteSimple)
			}

			const bounds = Box.Common(
				input.content.shapes.map((s) => editor.getShapePageBounds(s.id)!)
			)

			memo.offset.x = bounds.x
			memo.offset.y = bounds.y

			input.content.shapes = input.content.shapes.map((s) => {
				return {
					...s,
					x: s.x - memo.offset.x,
					y: s.y - memo.offset.y,
				}
			})

			return input
		},
		transformChange: (_editor: Editor, change: TLAiChange) => {
			switch (change.type) {
				case 'createShape': {
					const shape = collectAllIdsRecursively(
						change.shape,
						memo,
						writeOriginalIds
					)

					if (!shape.parentId || isPageId(shape.parentId)) {
						shape.x += memo.offset.x
						shape.y += memo.offset.y
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
					const shape = collectAllIdsRecursively(
						change.shape,
						memo,
						writeOriginalIds
					)

					if (!shape.parentId || isPageId(shape.parentId)) {
						if ('x' in shape) shape.x += memo.offset.x
						if ('y' in shape) shape.y += memo.offset.y
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
		},
	}
})
