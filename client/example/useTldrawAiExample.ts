import { useCallback } from 'react'
import { TLAiChange, TLAiPrompt, TLAiResult, TLAiSerializedPrompt } from '../../shared/types'
import { useTldrawAi } from '../ai/useTldrawAi'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { SimpleIds } from './transforms/SimpleIds'

export function useTldrawAiExample() {
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
	const res = await fetch(`${process.env.VITE_AI_SERVER_URL}/generate`, {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal: signal,
	})

	const result: TLAiResult = await res.json()

	console.log(result)

	return result.changes
}

async function repeatChangesFromBackend({
	signal,
}: {
	signal: AbortSignal
}): Promise<TLAiChange[]> {
	const res = await fetch(`${process.env.VITE_AI_SERVER_URL}/repeat`, {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal: signal,
	})

	const result: TLAiResult = await res.json()

	return result.changes
}

async function* streamChangesFromBackend({
	prompt,
	signal,
}: {
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}): AsyncGenerator<TLAiChange> {
	const res = await fetch(`${process.env.VITE_AI_SERVER_URL}/stream`, {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal: signal,
	})

	if (!res.body) {
		throw Error('bad response')
	}

	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })

			// Split on double newlines (SSE format)
			const events = buffer.split('\n\n')
			// Keep the last potentially incomplete event in the buffer
			buffer = events.pop() || ''

			for (const event of events) {
				const match = event.match(/^data: (.+)$/m)
				if (match) {
					try {
						const change = JSON.parse(match[1])
						yield change
					} catch (err) {
						console.error('JSON parsing error:', err, match[1])
					}
				}
			}
		}
	} catch (err) {
		console.log('Stream error:', err)
		throw err
	} finally {
		reader.releaseLock()
	}
}
