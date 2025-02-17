import { TLAiChange, TLAiPrompt, TLAiSerializedPrompt, useTldrawAi } from '@tldraw/ai'
import { useCallback } from 'react'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { SimpleIds } from './transforms/SimpleIds'

export function useSomeOtherBackend() {
	const ai = useTldrawAi({
		transforms: [SimpleIds, ShapeDescriptions, SimpleCoordinates],
	})

	const prompt = useCallback(
		(message: TLAiPrompt['message']) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal

			const promise = new Promise<void>(async (resolve, reject) => {
				if (!ai) reject()
				const { prompt, handleChange } = await ai.generate(message)

				const serializedPrompt: TLAiSerializedPrompt = {
					...prompt,
					promptBounds: prompt.promptBounds.toJson(),
					contextBounds: prompt.contextBounds.toJson(),
				}

				const changes = await getChangesFromBackend({ prompt: serializedPrompt, signal }).catch(
					(error) => {
						if (error.name === 'AbortError') {
							console.error('Cancelled')
						} else {
							console.error('Fetch error:', error)
						}
					}
				)

				if (changes && !cancelled) {
					for (const change of changes) {
						handleChange(change)
					}
				}

				resolve()
			})

			return {
				// the promise that will resolve the changes
				promise,
				// a helper to cancel the request
				cancel: () => {
					cancelled = true
					controller.abort()
				},
			}
		},
		[ai]
	)

	const stream = useCallback(
		(message: TLAiPrompt['message']) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal

			const promise = new Promise<void>(async (resolve, reject) => {
				if (!ai) reject()

				const { prompt, handleChange } = await ai.generate(message)

				const serializedPrompt: TLAiSerializedPrompt = {
					...prompt,
					promptBounds: prompt.promptBounds.toJson(),
					contextBounds: prompt.contextBounds.toJson(),
				}

				for await (const change of streamChangesFromBackend({ prompt: serializedPrompt, signal })) {
					if (!cancelled) {
						requestAnimationFrame(() => handleChange(change))
					}
				}

				resolve()
			})

			return {
				// the promise that will resolve the changes
				promise,
				// a helper to cancel the request
				cancel: () => {
					cancelled = true
					controller.abort()
				},
			}
		},
		[ai]
	)

	const repeat = useCallback(() => {
		let cancelled = false
		const controller = new AbortController()
		const signal = controller.signal

		const promise = new Promise<void>(async (resolve) => {
			if (ai) {
				const { handleChange } = await ai.generate('')

				const changes = await repeatChangesFromBackend({ signal }).catch((error) => {
					if (error.name === 'AbortError') {
						console.error('Cancelled')
					} else {
						console.error('Fetch error:', error)
					}
				})

				if (changes && !cancelled) {
					for (const change of changes) {
						handleChange(change)
					}
				}
			}

			resolve()
		})

		return {
			promise,
			cancel: () => {
				cancelled = true
				controller.abort()
			},
		}
	}, [ai])

	return { prompt, stream, repeat }
}

async function getChangesFromBackend({
	prompt,
	signal,
}: {
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}): Promise<TLAiChange[]> {
	return []
}

async function repeatChangesFromBackend({
	signal,
}: {
	signal: AbortSignal
}): Promise<TLAiChange[]> {
	return []
}

async function* streamChangesFromBackend({
	prompt,
	signal,
}: {
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}): AsyncGenerator<TLAiChange> {}
