import {
	TLShape,
	Box,
	TLShapePartial,
	TLShapeId,
	TLContent,
	TLBinding,
	Editor,
} from 'tldraw'

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
// Include responses? Or just the description / intent of the response?

export abstract class TLAiTransform {
	constructor(public editor: Editor) {}
	transformInput?(prompt: TLAiPrompt): TLAiPrompt
	transformChange?(change: TLAiChange): TLAiChange
}

export interface TLAiTransformConstructor {
	new (editor: Editor): TLAiTransform
}

export function createTldrawAiTransform<const T extends TLAiTransform>(
	transform: T
) {
	return transform
}

/** @internal */
export interface TLAiPrompt {
	// The user's written prompt
	prompt: string | TLAiMessage[]
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

/** @internal */
export interface TLAiGenerateOptions {
	// Specific canvas content
	content?: TLContent
	// The bounds of the context in the editor
	contextBounds?: Box
	// The bounds of the prompt in the editor
	promptBounds?: Box
}

/** @internal */
export interface CreateShapeChange {
	type: 'createShape'
	description: string
	shape: TLShapePartial
}

/** @internal */
export interface UpdateShapeChange {
	type: 'updateShape'
	description: string
	shape: TLShapePartial
}

/** @internal */
export interface DeleteShapeChange {
	type: 'deleteShape'
	description: string
	shapeId: TLShapeId
}

/** @internal */
export type TLAiChange =
	| CreateShapeChange
	| UpdateShapeChange
	| DeleteShapeChange
