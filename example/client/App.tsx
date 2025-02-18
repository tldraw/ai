import { TLComponents, Tldraw } from 'tldraw'
import { ContextBoundsHelper } from './components/ContextBoundsHelper'
import { PromptInput } from './components/PromptInput'
import { useTldrawAiExample } from './useTldrawAiExample'

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		const ai = useTldrawAiExample()

		return (
			<>
				<ContextBoundsHelper />
				<PromptInput ai={ai} />
			</>
		)
	},
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="tldraw-ai-demo" components={components} />
		</div>
	)
}

export default App
