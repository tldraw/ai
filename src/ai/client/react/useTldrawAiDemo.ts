import { useCallback, useEffect, useState } from 'react'
import { useEditor } from 'tldraw'
import { TldrawAiManager } from '../TldrawAiManager'
import { simpleIdTransforms } from './simpleIds'
import { fakeAiServer } from '../../server/aiDemoServer'
import { TLAiPrompt } from '../../shared/ai-shared'

export function useTldrawAiDemo() {
	const editor = useEditor()
	const [ai, setAi] = useState<TldrawAiManager | null>(null)

	useEffect(() => {
		setAi(
			new TldrawAiManager(editor, {
				transform: simpleIdTransforms,
			})
		)

		return () => {
			ai?.dispose()
		}
	}, [editor])

	return useCallback(
		(prompt: TLAiPrompt['prompt']) =>
			new Promise<void>((r) => {
				if (!ai) return
				ai.generate(prompt).then(async ({ input, handleChange }) => {
					console.log('input!', input)
					for await (const change of fakeAiServer(input)) {
						handleChange(change)
					}
					console.log('done!')
					r()
				})
			}),
		[ai]
	)
}
