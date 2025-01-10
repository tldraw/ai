import { createShapeId } from 'tldraw'
import { sleep } from './ai/shared/utils'
import { createTldrawAiResponder } from './ai/server/ai-server'
import { promptModel } from './models/google'

export const fakeAiServer = createTldrawAiResponder(async function* (input) {
	const res = await promptModel(input)
	console.log(res)

	let text = ''
	if (typeof input.prompt === 'string') {
		text = input.prompt
	}

	const { x, y } = input.contextBounds.center
	await sleep(1000)
	yield {
		type: 'createShape',
		shape: {
			id: createShapeId('1'),
			type: 'geo',
			x,
			y,
			props: { w: 100, h: 100 },
		},
	}
	await sleep(1000)
	yield {
		type: 'createShape',
		shape: {
			id: createShapeId('2'),
			type: 'geo',
			x,
			y: y + 120,
			props: { w: 100, h: 100, text },
		},
	}
	await sleep(1000)
	yield {
		type: 'updateShape',
		shape: {
			id: createShapeId('2'),
			type: 'geo',
			props: { fill: 'solid' },
		},
	}
	await sleep(1000)
	yield {
		type: 'deleteShape',
		shapeId: createShapeId('1'),
	}
	return
})
