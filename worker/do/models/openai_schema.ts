import { z } from 'zod'

const IColor = z.enum([
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
	'grey',
	// 'white',
])
// .describe('The color of the shape')

const IFill = z.enum(['none', 'solid', 'fill']) //.describe('The fill type of the shape')

const ILabel = z.string() //.describe('The text label of the shape')

export const IRectangleShape = z.object({
	type: z.literal('rectangle'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: IColor.optional(),
	fill: IFill.optional(),
	text: ILabel.optional(),
})
// .describe('A rectangle shape')

export const IEllipseShape = z.object({
	type: z.literal('ellipse'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	color: IColor.optional(),
	fill: IFill.optional(),
	text: ILabel.optional(),
})
// .describe('A circle shape')

export const ILineShape = z.object({
	type: z.literal('line'),
	shapeId: z.string(),
	x1: z.number(),
	y1: z.number(),
	x2: z.number(),
	y2: z.number(),
	color: IColor.optional(),
})
// .describe('A line shape')

export const ITextShape = z.object({
	type: z.literal('text'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	color: IColor.optional(),
	text: z.string().optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
})
// .describe('A circle shape')

export const IShape = z.union([IRectangleShape, IEllipseShape, ILineShape, ITextShape])

// Events

export const ICreateEvent = z.object({
	type: z.literal('create'),
	shape: IShape,
	intent: z.string(),
})
// .describe('An event that created a shape')

export const IMoveEvent = z.object({
	type: z.literal('move'),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
	intent: z.string(),
})
// .describe('An event that moved a shape')

export const ILabelEvent = z.object({
	type: z.literal('label'),
	shapeId: z.string(),
	text: z.string(),
	intent: z.string(),
})
// .describe('An event that labeled a shape')

export const IDeleteEvent = z.object({
	type: z.literal('delete'),
	shapeId: z.string(),
	intent: z.string(),
})
// .describe('An event that deleted a shape')

export const IThinkEvent = z.object({
	type: z.literal('think'),
	text: z.string(),
	intent: z.string(),
})
// .describe("A thinking event that captures the assistant's intent or planning")

// Model response schema

export const ModelResponse = z.object({
	long_description_of_strategy: z.string(),
	events: z.array(z.union([IThinkEvent, ICreateEvent, IMoveEvent, ILabelEvent, IDeleteEvent])),
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
