import { useMemo } from 'react'
import { useEditor } from 'tldraw'
import { useShallowObjectIdentity } from '../../shared/utils'
import { TldrawAiManager, TldrawAiManagerOptions } from '../TldrawAiManager'

export function useTldrawAi(options: TldrawAiManagerOptions = {}) {
	const editor = useEditor()
	const stableOptions = useShallowObjectIdentity(options)
	const manager = useMemo(
		() => new TldrawAiManager(editor, stableOptions),
		[editor, stableOptions]
	)

	return manager
}
