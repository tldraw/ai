import { useCallback } from 'react'
import { SimpleIds } from './transforms/SimpleIds'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { TLAiPrompt, TLAiChange } from '../../shared/types'
import { useTldrawAi } from '../ai/useTldrawAi'

export function useTldrawAiDemo() {
	const ai = useTldrawAi({
		transforms: [SimpleIds, ShapeDescriptions, SimpleCoordinates],
	})

	return useCallback(
		(message: TLAiPrompt['message']) =>
			new Promise<void>(async (r) => {
				if (!ai) return

				const { prompt, handleChange } = await ai.generate(message)

				const changes = await getChangesFromBackend(prompt)

				for (const change of changes) {
					handleChange(change)
				}

				r()
			}),
		[ai]
	)
}

async function getChangesFromBackend(
	prompt: TLAiPrompt
): Promise<TLAiChange[]> {
	const res = await fetch(`${process.env.VITE_AI_SERVER_URL}/generate`, {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
	})

	const result: {
		changes: TLAiChange[]
		description: string
		summary: string
	} = await res.json()

	console.log(result)

	return result.changes
}
