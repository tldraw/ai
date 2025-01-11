import { createTldrawAiGenerator } from '../server/server'
import { promptModel } from '../../models/google'

export const generateChangesFromPrompt = createTldrawAiGenerator(
	async function* (input) {
		let timeout: any = 0
		// Create a promise that rejects after 2 seconds
		const timeoutPromise = new Promise((_, reject) => {
			timeout = setTimeout(() => {
				console.log('timeout!')
				reject(new Error('Timeout after 2 seconds'))
			}, 30000)
		})

		try {
			// Race between the model response and the timeout
			const res = await Promise.race([promptModel(input), timeoutPromise])
			const response = JSON.parse(res as string)

			for (const change of response.changes) {
				yield change
			}

			clearTimeout(timeout)
		} catch (error) {
			console.error('AI response error:', error)
			return // Bail out of the generator
		}
	}
)
