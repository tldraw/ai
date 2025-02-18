import type {
	Box,
	BoxModel,
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLBindingUpdate,
	TLContent,
	TLShapeId,
	TLShapePartial,
} from 'tldraw'

export interface TLAiTextMessage {
	type: 'text'
	text: string
}

export interface TLAiImageMessage {
	type: 'image'
	mimeType: string
	src: string
}

export type TLAiMessage = TLAiTextMessage | TLAiImageMessage

export type TLAiMessages = string | TLAiMessage | TLAiMessage[]

/**
 * A prompt with information from the editor.
 */
export interface TLAiPrompt {
	/** The user's written prompt or an array of messages */
	message: string | TLAiMessage[]
	/** A screenshot */
	image?: string
	/** The content pulled from the editor */
	canvasContent: TLAiContent
	/** The bounds of the context in the editor */
	contextBounds: Box
	/** The bounds of the prompt in the editor */
	promptBounds: Box
	/** Any additional information. Must be JSON serializable! */
	meta?: any
}

/**
 * A prompt with information from the editor, serialized to JSON.
 */
export interface TLAiSerializedPrompt extends Omit<TLAiPrompt, 'contextBounds' | 'promptBounds'> {
	/** The bounds of the context in the editor */
	contextBounds: BoxModel
	/** The bounds of the prompt in the editor */
	promptBounds: BoxModel
}

export interface CreateShapeChange {
	type: 'createShape'
	description: string
	shape: TLShapePartial
}

export interface UpdateShapeChange {
	type: 'updateShape'
	description: string
	shape: Omit<TLShapePartial, 'type'>
}

export interface DeleteShapeChange {
	type: 'deleteShape'
	description: string
	shapeId: TLShapeId
}

export interface CreateBindingChange {
	type: 'createBinding'
	description: string
	binding: TLBindingCreate
}

export interface UpdateBindingChange {
	type: 'updateBinding'
	description: string
	binding: TLBindingUpdate
}

export interface DeleteBindingChange {
	type: 'deleteBinding'
	description: string
	bindingId: TLBindingId
}

/**
 * A generated change that can be applied to the editor.
 */
export type TLAiChange =
	| CreateShapeChange
	| UpdateShapeChange
	| DeleteShapeChange
	| CreateBindingChange
	| UpdateBindingChange
	| DeleteBindingChange

export type TLAiContent = Omit<TLContent, 'schema' | 'rootShapeIds'> & {
	bindings: TLBinding[]
}

/**
 * The response from the AI.
 */
export type TLAiResult = {
	changes: TLAiChange[]
}
