import { useCallback } from 'react'
import { TLAiChange, TLAiPrompt } from '../../shared/types'
import { useTldrawAi } from '../ai/useTldrawAi'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { SimpleIds } from './transforms/SimpleIds'

export function useTldrawAiDemo() {
	const ai = useTldrawAi({
		transforms: [SimpleIds, ShapeDescriptions, SimpleCoordinates],
	})

	return useCallback(
		(message: TLAiPrompt['message']) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal

			const promise = new Promise<void>(async (resolve) => {
				if (ai) {
					const { prompt, handleChange } = await ai.generate(message)

					console.log(prompt)

					const changes = await getChangesFromBackend(prompt, signal).catch((error) => {
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
}

async function getChangesFromBackend(
	prompt: TLAiPrompt,
	signal: AbortSignal
): Promise<TLAiChange[]> {
	const res = await fetch(`${process.env.VITE_AI_SERVER_URL}/generate`, {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal: signal,
	})

	const result: {
		changes: TLAiChange[]
		description: string
		summary: string
	} = await res.json()

	console.log(result)

	return result.changes
}
