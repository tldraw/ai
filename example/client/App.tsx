import { useEffect, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import { PromptInput } from './components/PromptInput'
import { useTldrawAiExample } from './useTldrawAiExample'

function App() {
	const [editor, setEditor] = useState<Editor | null>(null) // [1]
	return (
		<div className="tldraw-ai-container">
			<Tldraw persistenceKey="tldraw-ai-demo" onMount={setEditor} />
			{editor && <InputBar editor={editor} />}
		</div>
	)
}

function InputBar({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	useEffect(() => {
		// [2]
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	return <PromptInput ai={ai} />
}

export default App

/*
[1]
When the editor mounts, juggle it up to this component level so we can pass it down to the input bar.

[2]
Put the editor and ai helpers onto the window for debugging. You can run commands like `ai.prompt('draw a unicorn')` in the console.
*/
