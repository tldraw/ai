import { useCallback } from 'react'
import { generateChangesFromPrompt } from './generateChangesFromInput'
import { TLAiPrompt } from '../shared/ai-shared'
import { SimpleIds } from './transforms/SimpleIds'
import { useTldrawAi } from '../client/client'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'

export function useTldrawAiDemo() {
	// Adding our simpleids helper here
	const ai = useTldrawAi({
		transforms: [SimpleIds, ShapeDescriptions, SimpleCoordinates],
	})

	return useCallback(
		(message: TLAiPrompt['message']) =>
			new Promise<void>(async (r) => {
				if (!ai) return
				const { prompt, handleChange } = await ai.generate(message)
				const generatedChanges = generateChangesFromPrompt(prompt)

				for await (const change of generatedChanges) {
					handleChange(change)
				}

				r()
			}),
		[ai]
	)
}
