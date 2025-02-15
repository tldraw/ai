import {
	GenerateContentRequest,
	GenerateContentResult,
	GoogleGenerativeAI,
	InlineDataPart,
	Part,
	ResponseSchema,
	SchemaType,
	SingleRequestOptions,
} from '@google/generative-ai'
import { TLAiSerializedPrompt } from '../../../shared/types'
import { Environment } from '../../types'
import { SYSTEM_INSTRUCTION } from './prompt'

const IS_GEMINI_2 = true

/**
 * Get a base64 string from a URL. Fetch the URL and return the mimetype and data as base64.
 *
 * @param src - The URL of the base64 string.
 */
export async function getBase64FromUrl(src: string) {
	const response = await fetch(src)
	const buffer = await response.arrayBuffer()
	return {
		base64Data: Buffer.from(buffer).toString('base64'),
		mimeType: response.headers.get('content-type') || 'application/octet-stream',
	}
}

export interface GoogleModel {
	generateContent(
		request: GenerateContentRequest | string | Array<string | Part>,
		requestOptions?: SingleRequestOptions
	): Promise<GenerateContentResult>
}

const commandsSchema: ResponseSchema = {
	type: SchemaType.OBJECT,
	properties: {
		summary: {
			type: SchemaType.STRING,
			description: 'A detailed description of what you have done on the canvas.',
		},
		// should be an array of TLAiChange
		changes: {
			type: SchemaType.ARRAY,
			items: {
				type: SchemaType.OBJECT,
				properties: {
					type: {
						type: SchemaType.STRING,
						description: 'The type of change to make.',
						enum: [
							'createShape',
							'updateShape',
							'deleteShape',
							'createBinding',
							'updateBinding',
							'deleteBinding',
						],
					},
					description: {
						type: SchemaType.STRING,
						description:
							'The description of the shape, its role or function in the drawing; an answer to the question, "what is this shape for?".',
					},
					fromId: {
						type: SchemaType.STRING,
						description: 'The id of the shape that the binding is from.',
					},
					toId: {
						type: SchemaType.STRING,
						description: 'The id of the shape that the binding is to.',
					},
					binding: {
						type: SchemaType.OBJECT,
						description: 'The binding to create.',
						properties: {
							id: {
								type: SchemaType.STRING,
								description: 'The id of the binding.',
							},
							type: {
								type: SchemaType.STRING,
								description:
									'The type of the binding. Refer to the `default binding props` in the prompt for a list of which bindings are valid.',
								enum: ['arrow'],
							},
							props: {
								type: SchemaType.STRING,
								description:
									'The properties of the binding as stringified JSON. We will use JSON.parse to parse it. Refer to the `default binding props` in the prompt for an idea about what props are valid and what their defaults are. You only need to provide props that are different from the defaults; the defaults will be used for all props not provided here.',
							},
						},
						required: ['id', 'type'],
					},
					shape: {
						type: SchemaType.OBJECT,
						description: 'The shape to create.',
						properties: {
							id: {
								type: SchemaType.STRING,
								description: 'The id of the shape.',
							},
							type: {
								type: SchemaType.STRING,
								description:
									'The type of the shape. Refer to the `default shape props` in the prompt for a list of which shapes are valid.',
								enum: ['geo', 'text', 'line', 'arrow', 'frame', 'draw'],
							},
							x: {
								type: SchemaType.NUMBER,
								description: 'The x position of the shape as an integer.',
							},
							y: {
								type: SchemaType.NUMBER,
								description: 'The y position of the shape as an integer.',
							},
							props: {
								type: SchemaType.STRING,
								description:
									'The properties of the shape as stringified JSON. We will use JSON.parse to parse it. Refer to the `default shape props` in the prompt for an idea about what props are valid and what their defaults are. You only need to provide props that are different from the defaults; the defaults will be used for all props not provided here.',
							},
						},
						required: ['id', 'type'],
					},
				},
				required: ['type', 'description'],
			},
		},
	},
	required: ['summary', 'changes'],
}

export function getGoogleModel(apiKey: string) {
	return new GoogleGenerativeAI(apiKey).getGenerativeModel({
		model: IS_GEMINI_2 ? 'gemini-2.0-flash-exp' : 'gemini-1.5-flash-latest',
		systemInstruction: SYSTEM_INSTRUCTION,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: commandsSchema,
		},
	})
}

export function getGoogleApiKey(env: Environment) {
	return IS_GEMINI_2 ? env.GOOGLE_GENERATIVE_AI_API_KEY_2 : env.GOOGLE_GENERATIVE_AI_API_KEY
}

/**
 * Generate text from a generative model with a given text prompt and inputs.
 *
 * @param model - The generative model to prompt.
 * @param rawInputs - The inputs to prompt the model with.
 * @param inputsDescription - The description of the inputs to give to the model.
 * @param procedure - The procedure to give to the model.
 */
export async function promptGoogleModel(model: GoogleModel, prompt: TLAiSerializedPrompt) {
	const imageParts: InlineDataPart[] = []

	if (prompt.image) {
		imageParts.push({
			inlineData: {
				data: prompt.image.split('base64,')[1],
				mimeType: 'image/jpeg',
			},
		})
	}

	const safePrompt = { ...prompt }
	// delete safePrompt.defaultBindingProps
	// delete safePrompt.defaultShapeProps
	// delete safePrompt.promptBounds
	// delete safePrompt.contextBounds

	return await model
		.generateContent([JSON.stringify(prompt), ...imageParts])
		.then((r) => r.response.text())
}
