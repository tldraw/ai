import { FormEvent, FormEventHandler, useCallback, useEffect, useState } from 'react'
import { DefaultSpinner, preventDefault, TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import { useTldrawAiDemo } from './demo/useTldrawAiDemo'

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		return (
			<>
				<ContextBoundsHelper />
				<InputPromptHelper />
			</>
		)
	},
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="tldraw-ai-demo" components={components}>
				<SneakyAiPlugin />
			</Tldraw>
		</div>
	)
}

function SneakyAiPlugin() {
	const editor = useEditor()

	return null
}

// For debugging, we'll use this component to show the bounds of the context that the AI is working within .

function ContextBoundsHelper() {
	const editor = useEditor()

	const bounds = useValue(
		'bounds',
		() => {
			const vsp = editor.getViewportScreenBounds().clone()
			vsp.height -= 320
			vsp.width -= 80
			vsp.x += 40
			vsp.y += 160
			return vsp
		},
		[editor]
	)

	return (
		<div
			style={{
				position: 'absolute',
				top: bounds.y,
				left: bounds.x,
				width: bounds.width,
				height: bounds.height,
				border: '1px dotted black',
				pointerEvents: 'none',
			}}
		/>
	)
}

function InputPromptHelper() {
	const editor = useEditor()

	const prompt = useTldrawAiDemo()

	useEffect(() => {
		;(window as any).editor = editor
		;(window as any).prompt = (str: string) => prompt(str)

		// let cancelled = false
		// async function _promptAfterOneSecond() {
		// 	await sleep(2000)
		// 	if (cancelled) return
		// 	console.log('prompting')
		// 	await prompt(
		// 		'you are an autocomplete bot for my wireframe design bot. take the next three actions that you think that I am going to draw in this user interface wireframe. Incorporate visual feedback about what you see in the existing wireframe. Feel free to clean things up or reposition things if you think it will help.'
		// 	)
		// 	if (!cancelled) _promptAfterOneSecond()
		// }
		// for shitty autocomplete...
		// promptAfterOneSecond()
		// for shitty requests, use the console
		// return () => {
		// 	cancelled = true
		// }
	}, [prompt])

	const [state, setState] = useState<
		| {
				name: 'idle'
		  }
		| {
				name: 'loading'
				cancel: (e: FormEvent<HTMLFormElement>) => void
		  }
	>({ name: 'idle' })

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			try {
				const formData = new FormData(e.currentTarget)
				const value = formData.get('input') as string
				const { promise, cancel } = prompt(value)
				setState({
					name: 'loading',
					cancel: (e) => {
						console.log('cancelling')
						preventDefault(e)
						cancel()
					},
				})
				await promise
				setState({ name: 'idle' })
			} catch (e: any) {
				console.log(e)
				console.error(e)
			}
		},
		[prompt]
	)

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 100,
				left: 0,
				width: '100%',
				pointerEvents: 'none',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<form
				className="tlui-menu"
				style={{ display: 'flex', padding: 8, gap: 8 }}
				onSubmit={
					state.name === 'idle' ? handleSubmit : state.name === 'loading' ? state.cancel : undefined
				}
			>
				<input
					name="input"
					type="text"
					autoComplete="off"
					style={{ width: 240, height: 36, padding: '2px 8px' }}
				/>
				<button style={{ width: 64, height: 36 }}>
					{state.name === 'loading' ? <DefaultSpinner /> : 'Send'}
				</button>
			</form>
		</div>
	)
}

export default App
