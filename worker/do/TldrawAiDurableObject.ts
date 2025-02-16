import { DurableObjectState } from '@cloudflare/workers-types'
import { GenerativeModel } from '@google/generative-ai'
import { AutoRouter, error } from 'itty-router'
import OpenAI from 'openai'
import { TLArrowBinding, TLArrowShape, TLShapePartial } from 'tldraw'
import { CreateShapeChange, TLAiChange, TLAiPrompt, TLAiSerializedPrompt } from '../../shared/types'
import { Environment } from '../types'
import { getGoogleApiKey, getGoogleModel, promptGoogleModel } from './models/google'
import { promptOpenaiModel, simpleShapeToCanvasShape } from './models/openai'
import { ISimpleEvent } from './models/openai_schema'

export class TldrawAiDurableObject {
	googleModel: GenerativeModel
	openaiModel: OpenAI

	provider = 'openai'

	prevResponse = null as null | {
		changes: TLAiChange[]
		summary: string
	}

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
		.post('/repeat', (request) => this.repeat(request))
		.post('/stream', (request) => this.stream(request)) // todo: fully implement this

	// `fetch` is the entry point for all requests to the Durable Object
	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	private async repeat(_request: Request) {
		if (this.prevResponse) {
			return new Response(JSON.stringify(this.prevResponse), {
				headers: { 'Content-Type': 'application/json' },
			})
		}

		return new Response('No previous response', {
			status: 404,
		})
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
			const changes: TLAiChange[] = []
			let finalResponse

			switch (this.provider) {
				case 'openai': {
					const events: ISimpleEvent[] = []

					for await (const event of promptOpenaiModel(this.openaiModel, prompt)) {
						switch (event.type) {
							case 'create': {
								if (event.shape.type === 'arrow') {
									const { shapeId, fromId, toId, x1, x2, y1, y2 } = event.shape

									// Make sure that the shape itself is the first change

									const change: CreateShapeChange = {
										type: 'createShape',
										description: event.intent ?? '',
										shape: {
											id: shapeId as any,
											type: 'arrow',
											x: 0,
											y: 0,
											props: {
												color: event.shape.color ?? 'black',
												text: event.shape.text ?? '',
												start: { x: x1, y: y1 },
												end: { x: x2, y: y2 },
											},
										} satisfies TLShapePartial<TLArrowShape>,
									}

									changes.push(change)

									// Does the arrow have a start shape? Then try to create the binding

									const startShape = fromId
										? prompt.canvasContent.shapes.find((s) => s.id === fromId)
										: null

									if (startShape) {
										changes.push({
											type: 'createBinding',
											description: event.intent ?? '',
											binding: {
												type: 'arrow',
												fromId: shapeId as any,
												toId: startShape.id,
												props: {
													normalizedAnchor: { x: 0.5, y: 0.5 },
													isExact: false,
													isPrecise: false,
													terminal: 'start',
												},
												meta: {},
												typeName: 'binding',
											} satisfies Omit<TLArrowBinding, 'id'>,
										})
									}

									// Does the arrow have an end shape? Then try to create the binding

									const endShape = toId
										? prompt.canvasContent.shapes.find((s) => s.id === toId)
										: null

									if (endShape) {
										changes.push({
											type: 'createBinding',
											description: event.intent ?? '',
											binding: {
												type: 'arrow',
												fromId: shapeId as any,
												toId: endShape.id,
												props: {
													normalizedAnchor: { x: 0.5, y: 0.5 },
													isExact: false,
													isPrecise: false,
													terminal: 'end',
												},
												meta: {},
												typeName: 'binding',
											} satisfies Omit<TLArrowBinding, 'id'>,
										})
									}
								} else {
									const change: CreateShapeChange = {
										type: 'createShape',
										description: event.intent ?? '',
										shape: simpleShapeToCanvasShape(event.shape),
									}

									changes.push(change)
								}

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
						summary: events.find((e) => e.type === 'think')?.text ?? '',
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

			if (!finalResponse) throw Error('No response')

			this.prevResponse = finalResponse

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
