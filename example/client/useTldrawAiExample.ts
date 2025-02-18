import { TLAiChange, TLAiResult, TldrawAiOptions, useTldrawAi } from '@tldraw/ai'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { SimpleIds } from './transforms/SimpleIds'

export function useTldrawAiExample() {
	return useTldrawAi(options)
}

// Tip: It's best to define these options outside of any React function. If you do define them inside
// of a React hook / function, be sure to memoize them correctly with useMemo or useCallback hooks.
// See documentation in README.md or notes at the bottom of this file.

const options: TldrawAiOptions = {
	// [1]
	transforms: [SimpleIds, ShapeDescriptions, SimpleCoordinates],
	// [2]
	generate: async ({ editor, prompt, signal }) => {
		const res = await fetch('/generate', {
			method: 'POST',
			body: JSON.stringify(prompt),
			headers: {
				'Content-Type': 'application/json',
			},
			signal,
		})

		const result: TLAiResult = await res.json()

		return result.changes
	},
	// [3]
	stream: async function* ({ editor, prompt, signal }) {
		const res = await fetch('/stream', {
			method: 'POST',
			body: JSON.stringify(prompt),
			headers: {
				'Content-Type': 'application/json',
			},
			signal,
		})

		if (!res.body) {
			throw Error('No body in response')
		}

		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		try {
			while (true) {
				const { value, done } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const events = buffer.split('\n\n')
				buffer = events.pop() || ''

				for (const event of events) {
					const match = event.match(/^data: (.+)$/m)
					if (match) {
						try {
							const change: TLAiChange = JSON.parse(match[1])
							yield change
						} catch (err) {
							console.error(err)
							throw Error(`JSON parsing error: ${match[1]}`)
						}
					}
				}
			}
		} catch (err) {
			throw err
		} finally {
			reader.releaseLock()
		}
	},
}

/*
[1]
All of the transforms that will be applied to the prompt and changes, useful for
things like normalizing coordinates, adding descriptions, or simplifying IDs

[2]
A function that return changes. These can be generated locally or on the backend,
but usually are the result of passing your prompt to a LLM or other model.

[3]
A function similar to `generate` but that will stream changes from the AI as they are ready.
You don't need to implement both, you could implement only one or the other depending on
whether you want to use streaming.
*/
