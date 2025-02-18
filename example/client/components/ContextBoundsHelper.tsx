import { useEditor, useValue } from 'tldraw'

export function ContextBoundsHelper() {
	const editor = useEditor()

	const bounds = useValue(
		'bounds',
		() => {
			const vsp = editor.getViewportScreenBounds().clone()
			vsp.height -= 320
			vsp.width -= 80
			vsp.x += 40
			vsp.y += 160
			return vsp
		},
		[editor]
	)

	return (
		<div
			style={{
				position: 'absolute',
				top: bounds.y,
				left: bounds.x,
				width: bounds.width,
				height: bounds.height,
				border: '1px dotted black',
				pointerEvents: 'none',
			}}
		/>
	)
}
