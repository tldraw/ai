import { TLComponents, Tldraw } from 'tldraw'
import { PromptInput } from './components/PromptInput'

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		return (
			<>
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
