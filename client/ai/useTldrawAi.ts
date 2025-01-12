import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { TldrawAiManager, TldrawAiManagerOptions } from './TldrawAiManager'
import { useShallowObjectIdentity } from '../../shared/utils'

export function useTldrawAi(options: TldrawAiManagerOptions = {}) {
	const editor = useEditor()
	const stableOptions = useShallowObjectIdentity(options)
	const manager = useMemo(
		() => new TldrawAiManager(editor, stableOptions),
		[editor, stableOptions]
	)

	return manager
}
