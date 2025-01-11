import { useCallback, useEffect, useState } from 'react'
import { useEditor } from 'tldraw'
import { TldrawAiManager } from '../TldrawAiManager'
import { fakeAiServer } from '../../server/aiDemoServer'
import { TLAiPrompt } from '../../shared/ai-shared'
import { SimpleIds } from './SimpleIds'

export function useTldrawAiDemo() {
	const editor = useEditor()
	const [ai, setAi] = useState<TldrawAiManager | null>(null)

	useEffect(() => {
		setAi(new TldrawAiManager(editor))

		return () => {
			ai?.dispose()
		}
	}, [editor])

	return useCallback(
		(prompt: TLAiPrompt['prompt']) =>
			new Promise<void>(async (r) => {
				if (!ai) return
				// Create the input information
				// Create the transformation helper
				// Transform the input
				// Send the transformed input to a backend that generates changes
				// As each change is generated... apply the reverse transform and then apply the change

				const input = await ai.makeInput(prompt)
				const idsHelper = new SimpleIds(editor)
				const transformedInput = idsHelper.transformInput(input)
				const generatedChanges = fakeAiServer(transformedInput)

				for await (const change of generatedChanges) {
					const transformedChange = idsHelper.transformChange(change)
					ai.applyChange(transformedChange)
				}

				r()
			}),
		[ai]
	)
}
