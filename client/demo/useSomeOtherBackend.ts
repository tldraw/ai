import { useCallback } from 'react'
import { TLAiChange, TLAiPrompt, TLAiSerializedPrompt } from '../../shared/types'
import { useTldrawAi } from '../ai/useTldrawAi'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { SimpleIds } from './transforms/SimpleIds'

export function useSomeOtherBackend() {
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

// Your implementation here...

async function getChangesFromBackend(prompt: TLAiSerializedPrompt): Promise<TLAiChange[]> {
	return []
}
