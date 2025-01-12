import { Editor } from 'tldraw'
import { TLAiPrompt, TLAiChange } from '../../shared/types'

export abstract class TldrawAiTransform {
	constructor(public editor: Editor) {}
	transformPrompt?(prompt: TLAiPrompt): TLAiPrompt
	transformChange?(change: TLAiChange): TLAiChange
}

export interface TldrawAiTransformConstructor {
	new (editor: Editor): TldrawAiTransform
}
