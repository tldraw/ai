import { createTldrawAiResponder } from './server'
import { promptModel } from '../../models/google'

export const fakeAiServer = createTldrawAiResponder(async function* (input) {
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

	// let text = ''
	// if (typeof input.prompt === 'string') {
	// 	text = input.prompt
	// }

	// const { x, y } = input.contextBounds.center
	// await sleep(1000)
	// yield {
	// 	type: 'createShape',
	// 	shape: {
	// 		id: createShapeId('1'),
	// 		type: 'geo',
	// 		x,
	// 		y,
	// 		props: { w: 100, h: 100 },
	// 	},
	// }
	// await sleep(1000)
	// yield {
	// 	type: 'createShape',
	// 	shape: {
	// 		id: createShapeId('2'),
	// 		type: 'geo',
	// 		x,
	// 		y: y + 120,
	// 		props: { w: 100, h: 100, text },
	// 	},
	// }
	// await sleep(1000)
	// yield {
	// 	type: 'updateShape',
	// 	shape: {
	// 		id: createShapeId('2'),
	// 		type: 'geo',
	// 		props: { fill: 'solid' },
	// 	},
	// }
	// await sleep(1000)
	// yield {
	// 	type: 'deleteShape',
	// 	shapeId: createShapeId('1'),
	// }
})
