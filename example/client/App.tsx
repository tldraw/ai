import { TLComponents, Tldraw } from 'tldraw'
import { ContextBoundsHelper } from './components/ContextBoundsHelper'
import { PromptInput } from './components/PromptInput'

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		return (
			<>
				<ContextBoundsHelper />
				<PromptInput />
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
