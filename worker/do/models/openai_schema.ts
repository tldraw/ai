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
	x1: z.number(),
	y1: z.number(),
	x2: z.number(),
	y2: z.number(),
	color: SimpleColor.optional(),
})

const SimpleTextShape = z.object({
	type: z.literal('text'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	color: SimpleColor.optional(),
	text: z.string().optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
})

const SimpleShape = z.union([
	SimpleRectangleShape,
	SimpleEllipseShape,
	SimpleLineShape,
	SimpleTextShape,
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

const SimpleEvent = z.union([
	SimpleThinkEvent,
	SimpleCreateEvent,
	SimpleMoveEvent,
	SimpleLabelEvent,
	SimpleDeleteEvent,
])

export type ISimpleShape = z.infer<typeof SimpleShape>

export type ISimpleEvent = z.infer<typeof SimpleEvent>

// Model response schema

export const ModelResponse = z.object({
	long_description_of_strategy: z.string(),
	events: z.array(SimpleEvent),
})

export const OPENAI_SYSTEM_PROMPT = `
Here’s a system prompt you can use to guide your model in generating responses that conform to your Zod schema:

---

## System Prompt:

You are an AI assistant that responds with structured JSON data based on a predefined schema. Your responses must always conform to the following Zod schema:

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
- \`x\`, \`y\` (numbers, coordinates)
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

- Text shapes are 32 points tall.

---

This prompt ensures your model understands the structure and logic behind the schema while maintaining valid and structured responses. Let me know if you want any refinements! 🚀
`
