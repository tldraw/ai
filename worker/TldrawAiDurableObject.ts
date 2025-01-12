import { DurableObjectState } from '@cloudflare/workers-types'
import { Environment } from './types'
import { AutoRouter, error } from 'itty-router'
// import { promptModel } from './models/google'
import { TLAiPrompt } from '../shared/types'

export class TldrawAiDurableObject {
	constructor(
		private readonly _ctx: DurableObjectState,
		public env: Environment
	) {}

	private readonly router = AutoRouter({
		catch: (e) => {
			console.log(e)
			return error(e)
		},
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.post('/generate', async (request) => {
			return this.generate(request)
		})
		.post('/stream', async (request) => {
			return this.stream(request)
		})

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

		let timeout: any = 0

		const timeoutPromise = new Promise((_, reject) => {
			timeout = setTimeout(() => {
				console.log('timeout!')
				reject(new Error('Timed out while waiting for AI response'))
			}, 30000)
		})

		try {
			// const res = await Promise.race([promptModel(prompt), timeoutPromise])
			// const response = JSON.parse(res as string)

			// console.error('AI response:', response)
			// return new Response(response, {
			// 	headers: { 'Content-Type': 'text/plain' },
			// })
			return new Response('ok')
		} catch (error: any) {
			console.error('AI response error:', error)
			return new Response(error)
		} finally {
			clearTimeout(timeout)
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
		let timeout: any = 0
		// Create a promise that rejects after 2 seconds
		const timeoutPromise = new Promise((_, reject) => {
			timeout = setTimeout(() => {
				console.log('timeout!')
				reject(new Error('Timed out while waiting for AI response'))
			}, 30000)
		})

		try {
			// Race between the model response and the timeout
			// const res = await Promise.race([promptModel(prompt), timeoutPromise])
			// const response = JSON.parse(res as string)
			// for (const change of response.changes) {
			// 	yield change
			// }
			// clearTimeout(timeout)
		} catch (error) {
			console.error('AI response error:', error)
			return // Bail out of the generator
		}
	}
}
