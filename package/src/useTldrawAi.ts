import { useCallback, useMemo, useRef } from 'react'
import { Editor, uniqueId, useEditor } from 'tldraw'
import { TldrawAiModule, TldrawAiModuleOptions } from './TldrawAiModule'
import { TLAiChange, TLAiPrompt, TLAiSerializedPrompt } from './types'

/**
 * The function signature for generating changes from an AI prompt.
 */
export type TldrawAiGenerateFn = (opts: {
	editor: Editor
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}) => Promise<TLAiChange[]>

/**
 * The function signature for streaming changes from an AI prompt.
 */
export type TldrawAiStreamFn = (opts: {
	editor: Editor
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}) => AsyncGenerator<TLAiChange>

export interface TldrawAiOptions extends Omit<TldrawAiModuleOptions, 'editor'> {
	editor?: Editor
	generate?: TldrawAiGenerateFn
	stream?: TldrawAiStreamFn
}

export type TldrawAiPromptOptions = string | { message: TLAiPrompt['message']; stream?: boolean }

export function useTldrawAi(opts: TldrawAiOptions) {
	const { editor: _editor, generate: generateFn, stream: streamFn, transforms } = opts

	// If the editor is provided as a prop, use that. Otherwise, use the editor in react context and throw if not present.
	const editor = _editor ?? useEditor()
	const ai = useMemo(() => new TldrawAiModule({ editor, transforms }), [editor, transforms])

	const rCancelFunction = useRef<(() => void) | null>(null)
	const rPreviousArguments = useRef<TldrawAiPromptOptions>('')
	const rPreviousChanges = useRef<TLAiChange[]>([])

	/**
	 * Prompt the AI for a response. If the stream flag is set to true, the call will stream changes as they are ready.
	 *
	 * @param message The message to prompt the AI with OR an object with the message and stream flag.
	 *
	 * @returns An object with a promise that will resolve when all changes have been applied and a cancel function to abort the work.
	 */
	const prompt = useCallback(
		(message: TldrawAiPromptOptions) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal

			// Pull out options, keeping in mind that the argument may be just a string
			const opts = typeof message === 'string' ? { message } : message
			const { stream = false } = opts

			const markId = 'generating_' + uniqueId()

			const promise = new Promise<void>(async (resolve, reject) => {
				if (!ai) {
					reject()
					return
				}

				const { prompt, handleChange } = await ai.generate(message)

				const serializedPrompt: TLAiSerializedPrompt = {
					...prompt,
					promptBounds: prompt.promptBounds.toJson(),
					contextBounds: prompt.contextBounds.toJson(),
				}

				const pendingChanges: TLAiChange[] = []

				if (stream) {
					if (!streamFn) {
						throw Error(
							`Stream function not found. You should pass a generate method in your call to the useTldrawAi hook.`
						)
					}
					// Handle a stream of changes
					// todo: consider history while streaming... we could keep track of all of the changes that were made, apply them as they come in; and then once completed, revert those changes, make a history entry, and then reapply them all

					editor.markHistoryStoppingPoint(markId)
					for await (const change of streamFn({
						editor,
						prompt: serializedPrompt,
						signal,
					})) {
						if (!cancelled) {
							try {
								editor.run(
									() => {
										handleChange(change)
									},
									{
										ignoreShapeLock: false, // ? should this be true?
										history: 'record', // ? should this be 'ignore'?
									}
								)
								pendingChanges.push(change)
							} catch (e) {
								// If we encounter an error, revert previous changes and throw the error
								editor.bailToMark(markId)
								throw e
							}
						}
					}
				} else {
					if (!generateFn) {
						throw Error(
							`Stream function not found. You should pass a stream method in your call to the useTldrawAi hook.`
						)
					}
					// Handle a one-off generation
					const changes = await generateFn({ editor, prompt: serializedPrompt, signal }).catch(
						(error) => {
							if (error.name === 'AbortError') {
								console.error('Cancelled')
							} else {
								console.error('Fetch error:', error)
							}
						}
					)

					if (changes && !cancelled) {
						// todo: consider history while generating. Is this configurable? Can we guarantee that these changes won't interrupt the user's changes?
						editor.markHistoryStoppingPoint(markId)
						try {
							editor.run(
								() => {
									for (const change of changes) {
										pendingChanges.push(change)
										handleChange(change)
									}
								},
								{
									ignoreShapeLock: false, // ? should this be true?
									history: 'record', // ? should this be 'ignore'?
								}
							)
						} catch (e) {
							// If we encounter an error, revert previous changes and throw the error
							editor.bailToMark(markId)
							throw e
						}
					}
				}

				// If successful, save the previous options / response
				rPreviousArguments.current = opts
				rPreviousChanges.current = pendingChanges

				rCancelFunction.current = null
				resolve()
			})

			rCancelFunction.current = () => {
				cancelled = true
				controller.abort('Cancelled by user')
				editor.bailToMark(markId) // ? should we bail on cancels or preserve the generated items so far?
				rCancelFunction.current = null
			}

			return {
				// the promise that will resolve the changes
				promise,
				// a helper to cancel the request
				cancel: rCancelFunction.current,
			}
		},
		[ai, generateFn, streamFn]
	)

	/**
	 * Repeat the previous prompt and changes.
	 *
	 * This is useful for when you want to re-run the same prompt and changes
	 * without having to re-generate the prompt. Mainly used for debugging.
	 *
	 * @returns A promise that resolves when all changes have been applied.
	 */
	const repeat = useCallback(() => {
		const promise = new Promise<void>(async (resolve, reject) => {
			if (!ai) {
				reject()
				return
			}

			// Repeat the previous arguments and changes
			const prevOpts = rPreviousArguments.current
			const { handleChange } = await ai.generate(prevOpts)
			editor.run(
				() => {
					for (const change of rPreviousChanges.current) {
						handleChange(change)
					}
				},
				{
					ignoreShapeLock: false, // should this be true?
					history: 'record', // should this be 'ignore'?
				}
			)

			rCancelFunction.current = null
			resolve()
		})

		return {
			promise,
			cancel: rCancelFunction.current,
		}
	}, [ai])

	const cancel = useCallback(() => {
		rCancelFunction.current?.()
	}, [])

	return { prompt, repeat, cancel }
}
