import { DurableObjectNamespace } from '@cloudflare/workers-types'

export interface Environment {
	TLDRAW_AI_DURABLE_OBJECT: DurableObjectNamespace
	GOOGLE_GENERATIVE_AI_API_KEY: string
	GOOGLE_GENERATIVE_AI_API_KEY_2: string
	OPENAI_API_KEY: string
}
