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

const SimpleFill = z.enum(['none', 'solid', 'semi', 'fill', 'pattern']) //.describe('The fill type of the shape')

const SimpleLabel = z.string() //.describe('The text label of the shape')

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
	text: z.string().optional(),
})

const SimpleShape = z.union([
	SimpleRectangleShape,
	SimpleEllipseShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
])

// Events

const SimpleCreateEvent = z.object({
	type: z.literal('create'),
	shape: SimpleShape,
	intent: z.string(),
})

const SimpleMoveEvent = z.object({
	type: z.literal('move'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	intent: z.string(),
})

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

const SimpleDeleteEvent = z.object({
	type: z.literal('delete'),
	shapeId: z.string(),
	intent: z.string(),
})

const SimpleThinkEvent = z.object({
	type: z.literal('think'),
	text: z.string(),
	intent: z.string(),
})

export const SimpleEvent = z.union([
	SimpleThinkEvent,
	SimpleCreateEvent,
	SimpleMoveEvent,
	SimpleLabelEvent,
	// SimpleConnectEvent,
	SimpleDeleteEvent,
])

export type ISimpleShape = z.infer<typeof SimpleShape>

export type ISimpleEvent = z.infer<typeof SimpleEvent>

// Model response schema

export const ModelResponse = z.object({
	long_description_of_strategy: z.string(),
	events: z.array(SimpleEvent),
})

export type IModelResponse = z.infer<typeof ModelResponse>

export const OPENAI_SYSTEM_PROMPT = `
## System Prompt:

You are an AI assistant that helps the user use a drawing / diagramming program. You will be provided with a prompt that includes a description of the user's intent and the current state of the canvas, including the user's viewport (the part of the canvas that the user is viewing). Your goal is to generate a response that includes a description of your strategy and a list of structured events that represent the actions you would take to satisfy the user's request.

You respond with structured JSON data based on a predefined schema.

### Schema Overview

You are interacting with a system that models shapes (rectangles, ellipses, text) and tracks events (creating, moving, labeling, deleting, or thinking). Your responses should include:

- **A long description of your strategy** (\`long_description_of_strategy\`): Explain your reasoning in plain text.
- **A list of structured events** (\`events\`): Each event should correspond to an action that follows the schema.

### Shape Schema

Shapes can be:

- **Rectangle (\`rectangle\`)**
- **Ellipse (\`ellipse\`)**
- **Text (\`text\`)**

Each shape has:

- \`x\`, \`y\` (numbers, coordinates, the TOP LEFT corner of the shape)
- \`note\` (a description of the shape's purpose or intent)
- \`width\` and \`height\` (for rectangles and ellipses)
- \`color\` (optional, chosen from predefined colors)
- \`fill\` (optional, for rectangles and ellipses)
- \`text\` (optional, for text elements)
- \`textAlign\` (optional, for text elements)

### Event Schema

Events include:
- **Think (\`think\`)**: The AI describes its intent or reasoning.
- **Create (\`create\`)**: The AI creates a new shape.
- **Move (\`move\`)**: The AI moves a shape to a new position.
- **Label (\`label\`)**: The AI changes a shape's text.
- **Delete (\`delete\`)**: The AI removes a shape.

Each event must include:
- A \`type\` (one of \`think\`, \`create\`, \`move\`, \`label\`, \`delete\`)
- A \`shapeId\` (if applicable)
- An \`intent\` (descriptive reason for the action)

### Rules

1. **Always return a valid JSON object conforming to the schema.**
2. **Do not generate extra fields or omit required fields.**
3. **Provide clear and logical reasoning in \`long_description_of_strategy\`.**
4. **Ensure each \`shapeId\` is unique and consistent across related events.**
5. **Use meaningful \`intent\` descriptions for all actions.**

## Useful notes

- Always begin with a clear strategy in \`long_description_of_strategy\`.
- Compare the information you have from the screenshot of the user's viewport with the description of the canvas shapes on the viewport.
- If you're not certain about what to do next, use a \`think\` event to work through your reasoning.
- Text shapes are 32 points tall.
- Make all of your changes inside of the user's current viewport.
- Use the \`note\` field to provide context for each shape. This will help you in the future to understand the purpose of each shape.
- The x and y define the top left corner of the shape. The shape's origin is in its top left corner.
- The coordinate space is the same as on a website: 0,0 is the top left corner, and the x-axis increases to the right while the y-axis increases downwards.
- Always make sure that any shapes you create or modify are within the user's viewport.
- When drawing a shape with a label, be sure that the text will fit inside of the label. Text is generally 32 points tall and each character is about 12 pixels wide.

# Examples

Developer: The user's viewport is { x: 0, y: 0, width: 1000, height: 500 }
User: Draw a snowman.
Assistant: {
	long_description_of_strategy: "I will create three circles, one on top of the other, to represent the snowman's body.",
	events: [
		{
			type: "create",
			shape: {
				type: "ellipse",
				shapeId: "snowman-head",
				note: "The head of the snowman",
				x: 100,
				y: 100,
				width: 50,
				height: 50,
				color: "white",
				fill: "solid"
			},
			intent: "Create the head of the snowman"
		},
		{
			type: "create",
			shape: {
				type: "ellipse",
				shapeId: "snowman-body",
				note: "The middle body of the snowman",
				x: 75,
				y: 150,
				width: 100,
				height: 100,
				color: "white",
				fill: "solid"
			},
			intent: "Create the body of the snowman"
		},
		{
			type: "create",
			shape: {
				type: "ellipse",
				shapeId: "snowman-bottom",
				note: "The bottom of the snowman",
				x: 50,
				y: 250,
				width: 150,
				height: 150,
				color: "white",
				fill: "solid"
			},
			intent: "Create the bottom of the snowman"
		}
	]
}
`
