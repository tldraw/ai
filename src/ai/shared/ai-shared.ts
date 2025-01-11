import {
	TLShape,
	Box,
	TLShapePartial,
	TLShapeId,
	TLContent,
	TLBinding,
	Editor,
} from 'tldraw'

export abstract class TLAiTransform {
	constructor(public editor: Editor) {}
	transformPrompt?(prompt: TLAiPrompt): TLAiPrompt
	transformChange?(change: TLAiChange): TLAiChange
}

export interface TLAiTransformConstructor {
	new (editor: Editor): TLAiTransform
}

type TLAiMessage =
	| {
			type: 'text'
			text: string
	  }
	| {
			type: 'image'
			mimeType: string
			src: string
	  }

/**
 * A prompt with information from the editor.
 */
export interface TLAiPrompt {
	// The user's written prompt
	message: string | TLAiMessage[]
	// A screenshot
	image?: string
	// A mapping of shape type to shape props
	shapes: Record<TLShape['type'], TLShape['props']>
	// A mapping of binding type to binding props
	bindings: Record<TLBinding['type'], TLBinding['props']>
	// The content pulled from the editor
	content: TLContent
	// The bounds of the context in the editor
	contextBounds: Box
	// The bounds of the prompt in the editor
	promptBounds: Box
}

export interface CreateShapeChange {
	type: 'createShape'
	description: string
	shape: TLShapePartial
}

export interface UpdateShapeChange {
	type: 'updateShape'
	description: string
	shape: TLShapePartial
}

export interface DeleteShapeChange {
	type: 'deleteShape'
	description: string
	shapeId: TLShapeId
}

/**
 * A generated change that can be applied to the editor.
 */
export type TLAiChange =
	| CreateShapeChange
	| UpdateShapeChange
	| DeleteShapeChange
