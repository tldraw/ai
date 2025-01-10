import { createShapeId, TLShapeId } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '../shared/utils'
import {
	createTldrawAiTransform,
	TLAiChange,
	TLAiPrompt,
	TLAiTransform,
} from '../shared/ai-shared'

interface SimpleIdsMemo {
	originalIdsToSimpleIds: Map<string, string>
	simpleIdsToOriginalIds: Map<string, string>
	nextSimpleId: number
}

function mapObjectWithIdAndWriteSimple(
	obj: { id: string },
	memo: SimpleIdsMemo
) {
	const { originalIdsToSimpleIds, simpleIdsToOriginalIds, nextSimpleId } = memo

	if (!originalIdsToSimpleIds.has(obj.id)) {
		originalIdsToSimpleIds.set(obj.id, `${nextSimpleId}`)
		simpleIdsToOriginalIds.set(`${nextSimpleId}`, obj.id)
		obj.id = `${nextSimpleId}`
		memo.nextSimpleId++
	}
}

function writeOriginalIds(obj: { id: string }, memo: SimpleIdsMemo) {
	const { simpleIdsToOriginalIds } = memo
	const id = simpleIdsToOriginalIds.get(obj.id)
	if (id) obj.id = id
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
		cb(value, memo)
	}

	// Recursively process all object properties
	Object.values(value).forEach((propValue) => {
		collectAllIdsRecursively(propValue, memo, cb)
	})

	return value
}

export const simpleIdTransforms = createTldrawAiTransform(() => {
	const memo: SimpleIdsMemo = {
		originalIdsToSimpleIds: new Map(),
		simpleIdsToOriginalIds: new Map(),
		nextSimpleId: 0,
	}

	return {
		transformInput: (input: TLAiPrompt) => {
			// Collect all ids, write simple ids, and write the simple ids
			for (const shape of input.content.shapes) {
				collectAllIdsRecursively(shape, memo, mapObjectWithIdAndWriteSimple)
			}
			return input
		},
		transformChange: (change: TLAiChange) => {
			switch (change.type) {
				case 'createShape':
					return {
						...change,
						// now restore the original ids
						shape: collectAllIdsRecursively(
							change.shape,
							memo,
							writeOriginalIds
						),
					}
				case 'updateShape':
					return {
						...change,
						// now restore the original ids
						shape: collectAllIdsRecursively(
							change.shape,
							memo,
							writeOriginalIds
						),
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
