import {
	type Box,
	type TLBinding,
	type TLContent,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
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

/**
 * A prompt with information from the editor.
 */
export interface TLAiPrompt {
	// The user's written prompt
	message: string | TLAiMessage[]
	// A screenshot
	image?: string
	// A mapping of shape type to shape props
	defaultShapeProps: Record<TLShape['type'], TLShape['props']>
	// A mapping of binding type to binding props
	defaultBindingProps: Record<TLBinding['type'], TLBinding['props']>
	// The content pulled from the editor
	canvasContent: TLAiContent
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
export type TLAiChange = CreateShapeChange | UpdateShapeChange | DeleteShapeChange

export type TLAiContent = Omit<TLContent, 'schema'>
