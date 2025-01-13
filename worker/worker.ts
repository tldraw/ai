import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { Environment } from './types'
import { ExecutionContext } from '@cloudflare/workers-types'
import {
	getGoogleApiKey,
	getGoogleModel,
	promptGoogleModel,
} from './models/google'

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
	// eventually... use some kind of per-user id, so that each user has their own worker
	const id = env.TLDRAW_AI_DURABLE_OBJECT.idFromName('anonymous')
	const DO = env.TLDRAW_AI_DURABLE_OBJECT.get(id)
	const response = await DO.fetch(request.url, {
		method: 'POST',
		body: request.body as any,
	})

	// todo: getting an immutable headers error from our cors middleware unless we create a new response
	return new Response(response.body as BodyInit, {
		headers: { 'Content-Type': 'application/json' },
	})
})

// export our router for cloudflare
export default router
