import {
	Box,
	Editor,
	FileHelpers,
	getSvgAsImage,
	TLBinding,
	TLContent,
	TLShape,
} from 'tldraw'
import { exhaustiveSwitchError, mapObjectMapValues } from '../shared/utils'
import {
	TLAiChange,
	TLAiGenerateOptions,
	TLAiPrompt,
	TLAiTransform,
} from '../shared/ai-shared'

/** @internal */
export interface TldrawAiManagerOptions {
	transform?: TLAiTransform
}

/** @internal */
export class TldrawAiManager {
	// A mapping of shape type to shape props
	shapes: Record<TLShape['type'], TLShape['props']>

	// A mapping of binding type to binding props
	bindings: Record<TLBinding['type'], TLBinding['props']>

	constructor(
		public readonly editor: Editor,
		public readonly options?: TldrawAiManagerOptions
	) {
		// These won't change, so let's define them here and store them
		this.shapes = mapObjectMapValues(
			this.editor.shapeUtils,
			(_, util) => util?.getDefaultProps()
			// (_, util) => (util!.constructor as TLAnyShapeUtilConstructor).props
		) as Record<TLShape['type'], TLShape['props']>

		this.bindings = mapObjectMapValues(
			this.editor.bindingUtils,
			(_, util) => util?.getDefaultProps()
			// (_, util) => (util!.constructor as TLAnyBindingUtilConstructor).props
		) as Record<TLBinding['type'], TLBinding['props']>
	}

	dispose() {}

	applyChange(change: TLAiChange) {
		const { editor } = this

		if (editor.isDisposed) return

		try {
			switch (change.type) {
				case 'createShape':
					editor.createShape(change.shape)
					break
				case 'updateShape':
					editor.updateShape(change.shape)
					break
				case 'deleteShape': {
					editor.deleteShape(change.shapeId)
					break
				}
				default:
					exhaustiveSwitchError(change)
			}
		} catch (e) {
			console.error('Error handling change:', e)
		}
	}

	/**
	 * Turn the user's prompt into an input to be sent to the server / LLMs
	 *
	 * @param prompt The user's prompt
	 * @param options Options to generate the input
	 */
	async makeInput(
		prompt: TLAiPrompt['prompt'],
		options = {} as TLAiGenerateOptions
	): Promise<TLAiPrompt> {
		const { editor, shapes, bindings } = this
		const {
			contextBounds = editor.getViewportPageBounds(),
			promptBounds = editor.getViewportPageBounds(),
		} = options

		const content = options.content ?? this.makeContent(promptBounds)

		// Get image from the content
		const image = await this.makeImage(content)

		return {
			prompt,
			content,
			contextBounds,
			promptBounds,
			image,
			shapes,
			bindings,
		}
	}

	/**
	 * Get the content from the current page.
	 *
	 * @param bounds The bounds to get the content for
	 */
	private makeContent(bounds: Box): TLContent {
		const { editor } = this

		// Get the page content (same as what we put on the clipboard when a user copies) for the shapes
		// that are included (contained or colliding with) the provided bounds

		let content = editor.getContentFromCurrentPage(
			editor
				.getCurrentPageShapesSorted()
				.filter((s) => bounds.includes(editor.getShapeMaskedPageBounds(s)!))
		)

		// If we don't have content, it's either an empty page or an empty section of the page.
		// This is an acceptable case; but let's send along an empty content instead of undefined.
		if (!content) {
			content = {
				shapes: [],
				bindings: [],
				rootShapeIds: [],
				assets: [],
				schema: editor.store.schema.serialize(),
			}
		}

		return content
	}

	/**
	 * Get a screenshot (data URL) of the prompt's content
	 *
	 * @param content The content to get the image from
	 */
	private async makeImage(content: TLContent) {
		// Get image from the content
		let image: string | undefined = undefined

		const svgResult = await this.editor.getSvgString(content.shapes, {
			background: false,
			darkMode: false,
			padding: 0, // will the context bounds take into account the padding?
		})

		if (svgResult) {
			const blob = await getSvgAsImage(this.editor, svgResult.svg, {
				type: 'jpeg',
				height: svgResult.height,
				width: svgResult.width,
			})
			if (blob) {
				image = await FileHelpers.blobToDataUrl(blob)
			}
		}

		return image
	}
}
