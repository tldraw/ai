import { Tldraw } from 'tldraw'
import { useTldrawAi } from './ai/client/react/useTldrawAi'
import { simpleIdTransforms } from './ai/server/simpleIds'
import { useEffect } from 'react'
import { fakeAiServer } from './fakeAiServer'

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
	const ai = useTldrawAi({
		transform: simpleIdTransforms,
	})

	useEffect(() => {
		ai.generate('hello world').then(async ({ input, handleChange }) => {
			for await (const change of fakeAiServer(input)) {
				console.log('change!', change)
				handleChange(change)
			}
		})
	}, [ai])

	return null
}

export default App
