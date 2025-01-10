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
import { TLAiPrompt } from '../ai/shared/ai-shared'

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
				'A detailed description of every the provided inputs, in order.',
		},
	},
	required: ['summary'],
}

const model = new GoogleGenerativeAI(
	import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY
).getGenerativeModel({
	model: 'gemini-1.5-flash-002',
	systemInstruction: 'Do stuff',
	generationConfig: {
		responseMimeType: 'application/json',
		responseSchema: commandsSchema,
	},
})

export async function generateContent(
	request: GenerateContentRequest | string | Array<string | Part>,
	requestOptions?: SingleRequestOptions
): Promise<GenerateContentResult> {
	return await model.generateContent(request, requestOptions)
}

/**
 * Generate text from a generative model with a given text prompt and inputs.
 *
 * @param model - The generative model to prompt.
 * @param rawInputs - The inputs to prompt the model with.
 * @param inputsDescription - The description of the inputs to give to the model.
 * @param procedure - The procedure to give to the model.
 */
export async function promptModel(prompt: TLAiPrompt) {
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
		.generateContent(['hello', ...imageParts])
		.then((r) => r.response.text())
}
