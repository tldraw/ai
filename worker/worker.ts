import { ExecutionContext } from '@cloudflare/workers-types'
import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { generate } from './routes/generate'
import { repeat } from './routes/repeat'
import { stream } from './routes/stream'
import { Environment } from './types'

const { preflight, corsify } = cors({ origin: '*' })

const router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
	before: [preflight],
	finally: [corsify],
	catch: (e) => {
		console.error(e)
		return error(e)
	},
})
	.post('/generate', generate)
	.post('/stream', stream)
	.post('/repeat', repeat)

// export our router for cloudflare
export default router

// Make the durable object available to the cloudflare worker
export { TldrawAiDurableObject } from './do/TldrawAiDurableObject'
