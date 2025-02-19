import { z } from 'zod'

const SimpleColor = z.enum([
	'red',
	'light-red',
	'green',
	'light-green',
	'blue',
	'light-blue',
	'orange',
	'yellow',
	'black',
	'violet',
	'light-violet',
	'grey',
	'white',
])

const SimpleFill = z.enum(['none', 'solid', 'semi', 'fill', 'pattern'])

const SimpleLabel = z.string()

const SimpleRectangleShape = z.object({
	type: z.literal('rectangle'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor.optional(),
	fill: SimpleFill.optional(),
	text: SimpleLabel.optional(),
})

export type ISimpleRectangleShape = z.infer<typeof SimpleRectangleShape>

const SimpleEllipseShape = z.object({
	type: z.literal('ellipse'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: SimpleColor.optional(),
	fill: SimpleFill.optional(),
	text: SimpleLabel.optional(),
})

export type ISimpleEllipseShape = z.infer<typeof SimpleEllipseShape>

const SimpleLineShape = z.object({
	type: z.literal('line'),
	shapeId: z.string(),
	note: z.string(),
	x1: z.number(),
	y1: z.number(),
	x2: z.number(),
	y2: z.number(),
	color: SimpleColor.optional(),
})

export type ISimpleLineShape = z.infer<typeof SimpleLineShape>

const SimpleNoteShape = z.object({
	type: z.literal('note'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	color: SimpleColor.optional(),
	text: SimpleLabel.optional(),
})

export type ISimpleNoteShape = z.infer<typeof SimpleNoteShape>

const SimpleTextShape = z.object({
	type: z.literal('text'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
	color: SimpleColor.optional(),
	text: z.string().optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
})

export type ISimpleTextShape = z.infer<typeof SimpleTextShape>

const SimpleArrowShape = z.object({
	type: z.literal('arrow'),
	shapeId: z.string(),
	note: z.string(),
	fromId: z.string().nullable(),
	toId: z.string().nullable(),
	x1: z.number(),
	y1: z.number(),
	x2: z.number(),
	y2: z.number(),
	color: SimpleColor.optional(),
	text: SimpleLabel.optional(),
})

export type ISimpleArrowShape = z.infer<typeof SimpleArrowShape>

const SimpleUnknownShape = z.object({
	type: z.literal('unknown'),
	shapeId: z.string(),
	note: z.string(),
	x: z.number(),
	y: z.number(),
})

export type ISimpleUnknownShape = z.infer<typeof SimpleUnknownShape>

const SimpleShape = z.union([
	SimpleUnknownShape,
	SimpleRectangleShape,
	SimpleEllipseShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
])

export type ISimpleShape = z.infer<typeof SimpleShape>

// Events

export const SimpleCreateEvent = z.object({
	type: z.literal('create'),
	shape: SimpleShape,
	intent: z.string(),
})

export type ISimpleCreateEvent = z.infer<typeof SimpleCreateEvent>

// export const SimpleUpdateEvent = z.object({
// 	type: z.literal('update'),
// 	shape: SimpleShape,
// 	intent: z.string(),
// })

// export type ISimpleUpdateEvent = z.infer<typeof SimpleUpdateEvent>

export const SimpleMoveEvent = z.object({
	type: z.literal('move'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	intent: z.string(),
})

export type ISimpleMoveEvent = z.infer<typeof SimpleMoveEvent>

// const SimpleConnectEvent = z.object({
// 	type: z.literal('connect'),
// 	method: z.enum(['arrow', 'line']),
// 	fromId: z.string(),
// 	toId: z.string(),
// 	text: z.string(),
// 	intent: z.string(),
// })

const SimpleLabelEvent = z.object({
	type: z.literal('label'),
	shapeId: z.string(),
	text: z.string(),
	intent: z.string(),
})
export type ISimpleLabelEvent = z.infer<typeof SimpleLabelEvent>

const SimpleDeleteEvent = z.object({
	type: z.literal('delete'),
	shapeId: z.string(),
	intent: z.string(),
})
export type ISimpleDeleteEvent = z.infer<typeof SimpleLabelEvent>

const SimpleThinkEvent = z.object({
	type: z.literal('think'),
	text: z.string(),
	intent: z.string(),
})
export type ISimpleThinkEvent = z.infer<typeof SimpleLabelEvent>

export const SimpleEvent = z.union([
	SimpleThinkEvent,
	SimpleCreateEvent,
	// SimpleUpdateEvent,
	SimpleMoveEvent,
	SimpleLabelEvent,
	// SimpleConnectEvent,
	SimpleDeleteEvent,
])

export type ISimpleEvent = z.infer<typeof SimpleEvent>

// Model response schema

export const ModelResponse = z.object({
	long_description_of_strategy: z.string(),
	events: z.array(SimpleEvent),
})

export type IModelResponse = z.infer<typeof ModelResponse>
