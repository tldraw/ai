import { DurableObjectState } from '@cloudflare/workers-types'
import { GenerativeModel } from '@google/generative-ai'
import { AutoRouter, error } from 'itty-router'
import OpenAI from 'openai'
import { CreateShapeChange, TLAiChange, TLAiPrompt, TLAiSerializedPrompt } from '../../shared/types'
import { Environment } from '../types'
import { getGoogleApiKey, getGoogleModel, promptGoogleModel } from './models/google'
import { promptOpenaiModel } from './models/openai'

export class TldrawAiDurableObject {
	googleModel: GenerativeModel
	openaiModel: OpenAI

	provider = 'openai'

	constructor(
		private readonly _ctx: DurableObjectState,
		public env: Environment
	) {
		const apiKey = getGoogleApiKey(this.env)
		this.googleModel = getGoogleModel(apiKey)
		this.openaiModel = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		})
	}

	private readonly router = AutoRouter({
		catch: (e) => {
			console.log(e)
			return error(e)
		},
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.post('/generate', (request) => this.generate(request))
		.post('/stream', (request) => this.stream(request)) // todo: fully implement this

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
		const prompt = (await request.json()) as TLAiSerializedPrompt

		try {
			console.log('Prompting model...')

			const res = await promptOpenaiModel(this.openaiModel, prompt)

			const response = res.choices[0]?.message?.parsed

			const changes: TLAiChange[] = []

			if (!response) {
				throw Error('No response')
			}

			let finalResponse

			switch (this.provider) {
				case 'openai': {
					// build the changes
					for (const event of response.events) {
						switch (event.type) {
							case 'create': {
								let shape: CreateShapeChange['shape']

								if (event.shape.type === 'text') {
									shape = {
										type: 'text',
										x: event.shape.x,
										y: event.shape.y - 12,
										props: {
											text: event.shape.text,
											color: event.shape.color ?? 'black',
											textAlign: event.shape.textAlign ?? 'middle',
										},
									}
								} else if (event.shape.type === 'line') {
									const minX = Math.min(event.shape.x1, event.shape.x2)
									const minY = Math.min(event.shape.y1, event.shape.y2)
									shape = {
										type: 'line',
										x: minX,
										y: minY,
										props: {
											points: [
												{
													x: event.shape.x1 - minX,
													y: event.shape.y1 - minY,
												},
												{
													x: event.shape.x2 - minX,
													y: event.shape.y2 - minY,
												},
											],
											color: event.shape.color ?? 'black',
										},
									}
								} else {
									shape = {
										type: 'geo',
										x: event.shape.x,
										y: event.shape.y,
										props: {
											geo: event.shape.type,
											w: event.shape.width,
											h: event.shape.height,
											color: event.shape.color ?? 'black',
											fill: event.shape.fill ?? 'none',
											text: event.shape.text ?? '',
										},
									}
								}
								const change: CreateShapeChange = {
									type: 'createShape',
									description: event.intent ?? '',
									shape,
								}

								changes.push(change)
								break
							}
							case 'move': {
								const change: TLAiChange = {
									type: 'updateShape',
									description: event.intent ?? '',
									shape: {
										id: event.shapeId as any,
										x: event.x,
										y: event.y,
									},
								}

								changes.push(change)
								break
							}
							case 'label': {
								const change: TLAiChange = {
									type: 'updateShape',
									description: event.intent ?? '',
									shape: {
										id: event.shapeId as any,
										props: {
											text: event.text,
										},
									},
								}

								changes.push(change)
								break
							}
							case 'delete': {
								const change: TLAiChange = {
									type: 'deleteShape',
									description: event.intent ?? '',
									shapeId: event.shapeId as any,
								}

								changes.push(change)
								break
							}
						}
					}

					finalResponse = {
						changes,
						summary: response.long_description_of_strategy,
					}
					break
				}
				case 'google': {
					const res = await promptGoogleModel(this.googleModel, prompt)

					const response = JSON.parse(res as string) as {
						summary: string
						changes: TLAiChange[]
					}

					for (const change of response.changes) {
						if (change.type === 'createShape' || change.type === 'updateShape') {
							// problem here
							if (change.shape?.props) {
								change.shape.props = JSON.parse(change.shape.props as any)
							}
							// 	if (change.binding?.props) {
							// 		change.binding.props = JSON.parse(change.binding.props)
							// 	}
						}
					}

					finalResponse = {
						changes: response.changes,
						summary: response.summary,
					}
				}
			}

			console.log(JSON.stringify(finalResponse, null, 2))

			// Send back the response as a JSON object
			return new Response(JSON.stringify(finalResponse), {
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
