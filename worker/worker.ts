import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { Environment } from './types'
import { ExecutionContext } from '@cloudflare/workers-types'
import { getApiKey, getModel, promptModel } from './models/google'

// Make the durable object available to the cloudflare worker
export { TldrawAiDurableObject } from './TldrawAiDurableObject'

const { preflight, corsify } = cors({ origin: '*' })
const router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
	before: [preflight],
	finally: [corsify],
	catch: (e) => {
		console.error(e)
		return error(e)
	},
}).post('/generate', async (request, env) => {
	const prompt = await request.json()

	try {
		const apiKey = getApiKey(env)
		const model = getModel(apiKey)

		console.log('Prompting model...')
		const res = await promptModel(model, prompt)

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

	// The request should have an auth header, just so that each user has their own worker
	// const userId = request.headers.get('Authorization') ?? 'anonymous'
	// const id = env.TLDRAW_AI_DURABLE_OBJECT.idFromName(userId)
	// const DO = env.TLDRAW_AI_DURABLE_OBJECT.get(id)
	// return DO.fetch(request.url, {
	// 	method: 'POST',
	// 	body: request.body as any,
	// })
})

// export our router for cloudflare
export default router
