import { DurableObjectState } from '@cloudflare/workers-types'
import { Environment } from './types'
import { AutoRouter, error } from 'itty-router'
import { TLAiPrompt } from '../shared/types'
import {
	getGoogleApiKey,
	getGoogleModel,
	promptGoogleModel,
} from './models/google'
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai'

export class TldrawAiDurableObject {
	googleModel: GenerativeModel

	constructor(
		private readonly _ctx: DurableObjectState,
		public env: Environment
	) {
		const apiKey = getGoogleApiKey(this.env)
		const model = getGoogleModel(apiKey)
		this.googleModel = model
	}

	private readonly router = AutoRouter({
		catch: (e) => {
			console.log(e)
			return error(e)
		},
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.post('/generate', (request) => this.generate(request))
		.post('/stream', (request) => this.stream(request))

	// `fetch` is the entry point for all requests to the Durable Object
	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	/**
	 * Generate a set of changes from the model.
	 *
	 * @param request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the generated changes.
	 */
	private async generate(request: Request) {
		const prompt = await request.json()

		try {
			console.log('Prompting model...')
			const res = await promptGoogleModel(this.googleModel, prompt)

			const response = JSON.parse(res as string)
			console.error('AI response:', response)

			// Send back the response as a JSON object
			return new Response(res, {
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error: any) {
			console.error('AI response error:', error)
			return new Response(error)
		}
	}

	/**
	 * TODO
	 * Stream changes from the model
	 *
	 * @param request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the generated changes.
	 */
	private async stream(request: Request): Promise<Response> {
		const stream = new ReadableStream({
			start: async (controller) => {
				try {
					const prompt = await request.json()
					for await (const change of this.generateChanges(prompt)) {
						controller.enqueue(JSON.stringify(change) + '\n')
					}
					controller.close()
				} catch (error) {
					console.error('Stream error:', error)
					controller.error(error)
				}
			},
		})

		return new Response(stream, {
			headers: { 'Content-Type': 'text/plain' },
		})
	}

	private async *generateChanges(prompt: TLAiPrompt) {
		try {
			const res = await promptGoogleModel(this.googleModel, prompt)
			const response = JSON.parse(res as string)
			for (const change of response.changes) {
				yield change
			}
		} catch (error) {
			console.error('AI response error:', error)
			return // Bail out of the generator
		}
	}
}
