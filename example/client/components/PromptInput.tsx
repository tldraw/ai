import { FormEvent, FormEventHandler, useCallback, useEffect, useState } from 'react'
import { DefaultSpinner, preventDefault, useEditor } from 'tldraw'
import { useTldrawAiExample } from '../useTldrawAiExample'

type PromptInputState =
	| {
			name: 'idle'
	  }
	| {
			name: 'loading'
			cancel: (e: FormEvent<HTMLFormElement>) => void
	  }

export function PromptInput() {
	const editor = useEditor()
	const ai = useTldrawAiExample()

	// The state of the prompt input, either idle or loading with a cancel callback
	const [state, setState] = useState<PromptInputState>({ name: 'idle' })

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()

			try {
				const formData = new FormData(e.currentTarget)
				const value = formData.get('input') as string

				// We call the ai module with the value from the input field and get back a promise and a cancel function
				// The promise will resolve once the generation completes; the cancel function will cancel the generation
				const { promise, cancel } = ai.prompt({ message: value, stream: false }) // can also be ai.prompt() or ai.repeat() or

				// Set the state to loading and include the cancel function
				setState({
					name: 'loading',
					cancel: (e) => {
						preventDefault(e)
						cancel()
						setState({ name: 'idle' })
					},
				})

				// Wait for the promise to resolve
				await promise

				// Set the state back to idle
				setState({ name: 'idle' })
			} catch (e: any) {
				console.error(e)
				setState({ name: 'idle' })
			}
		},
		[prompt]
	)

	// For convenience, we also put the editor and the ai module on
	// the window object so that we can access it via the console
	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	return (
		<div className="prompt-input">
			<form
				onSubmit={
					state.name === 'idle' ? handleSubmit : state.name === 'loading' ? state.cancel : undefined
				}
			>
				<input name="input" type="text" autoComplete="off" />
				<button>{state.name === 'loading' ? <DefaultSpinner /> : 'Send'}</button>
			</form>
		</div>
	)
}
