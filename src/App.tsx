import { Tldraw, useEditor } from 'tldraw'
import { useEffect } from 'react'
import { useTldrawAiDemo } from './ai/client/client'
import { sleep } from './ai/shared/utils'

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="tldraw-ai-demo">
				<SneakyAiPlugin />
			</Tldraw>
		</div>
	)
}

function SneakyAiPlugin() {
	const editor = useEditor()
	const prompt = useTldrawAiDemo()

	useEffect(() => {
		;(window as any).editor = editor

		let cancelled = false
		async function promptAfterOneSecond() {
			await sleep(2000)
			if (cancelled) return
			console.log('prompting')
			await prompt(
				'you are an autocomplete bot for my wireframe design bot. take the next three actions that you think that I am going to draw in this user interface wireframe. Incorporate visual feedback about what you see in the existing wireframe. Feel free to clean things up or reposition things if you think it will help.'
			)
			if (!cancelled) promptAfterOneSecond()
		}

		// for shitty autocomplete...
		// promptAfterOneSecond()

		// for shitty requests, use the console
		;(window as any).prompt = (str: string) => prompt(str)

		return () => {
			cancelled = true
		}
	}, [prompt])

	return null
}

export default App
