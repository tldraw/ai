import {
	InlineDataPart,
	GenerateContentRequest,
	Part,
	SingleRequestOptions,
	GenerateContentResult,
	GoogleGenerativeAI,
	ResponseSchema,
	SchemaType,
} from '@google/generative-ai'
import { Environment } from '../types'
// import { TLShapePartial } from 'tldraw'
// import { TLAiPrompt } from '../../shared/types'

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
		mimeType:
			response.headers.get('content-type') || 'application/octet-stream',
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
			description:
				'A detailed description of what you have done on the canvas.',
		},
		description: {
			type: SchemaType.STRING,
			description:
				'The description of the shape, its role or function in the drawing; an answer to the question, "what is this shape for?".',
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
						enum: ['createShape', 'updateShape', 'deleteShape'],
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
								description: 'The type of the shape.',
								enum: ['geo'],
							},
							x: {
								type: SchemaType.NUMBER,
								description: 'The x position of the shape.',
							},
							y: {
								type: SchemaType.NUMBER,
								description: 'The y position of the shape.',
							},
							props: {
								type: SchemaType.OBJECT,
								properties: {
									w: {
										type: SchemaType.NUMBER,
										description: 'The width of the shape.',
									},
									h: {
										type: SchemaType.NUMBER,
										description: 'The height of the shape.',
									},
									color: {
										type: SchemaType.STRING,
										description: 'The color of the shape.',
										enum: ['red', 'blue', 'green', 'black'],
									},
									fill: {
										type: SchemaType.STRING,
										description: 'The fill of the shape.',
										enum: ['none', 'solid', 'fill', 'pattern'],
									},
									text: {
										type: SchemaType.STRING,
										description: 'The text to display inside of the shape.',
									},
								},
								required: ['w', 'h', 'color', 'fill'],
							},
						},
						required: ['id', 'type'],
					},
				},
				required: ['type', 'shape'],
			},
		},
	},
	required: ['summary', 'changes'],
}

const isGemeni2 = true

export function getModel(apiKey: string) {
	return new GoogleGenerativeAI(apiKey).getGenerativeModel({
		model: isGemeni2 ? 'gemini-2.0-flash-exp' : 'gemini-1.5-flash-latest',
		systemInstruction:
			'You are an AI assistant that can create, update, and delete shapes on a canvas. Examine the provided prompt, data about the existing canvas content, and image of the canvas. Using the schema provided, product changes to be applied to the canvas in response to the user prompt. All shape ids must be formatted as "shape:1", "shape:2", etc. You must produce a response every time you are prompted. All numbers in your responses must be integers.',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: commandsSchema,
		},
	})
}

export function getApiKey(env: Environment) {
	return isGemeni2
		? env.GOOGLE_GENERATIVE_AI_API_KEY_2
		: env.GOOGLE_GENERATIVE_AI_API_KEY
}

/**
 * Generate text from a generative model with a given text prompt and inputs.
 *
 * @param model - The generative model to prompt.
 * @param rawInputs - The inputs to prompt the model with.
 * @param inputsDescription - The description of the inputs to give to the model.
 * @param procedure - The procedure to give to the model.
 */
export async function promptModel(model: GoogleModel, prompt: any) {
	const imageParts: InlineDataPart[] = []

	if (prompt.image) {
		imageParts.push({
			inlineData: {
				data: prompt.image.split('base64,')[1],
				mimeType: 'image/jpeg',
			},
		})
	}

	return await model
		.generateContent([JSON.stringify(prompt), ...imageParts])
		.then((r) => r.response.text())
}
