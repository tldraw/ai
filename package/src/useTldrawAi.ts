import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { TldrawAiManager, TldrawAiManagerOptions } from './TldrawAiManager'

export function useTldrawAi({ transforms }: TldrawAiManagerOptions = {}) {
	const editor = useEditor()
	const manager = useMemo(() => new TldrawAiManager(editor, { transforms }), [editor, transforms])

	return manager
}
