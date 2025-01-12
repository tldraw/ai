import { TLAiChange } from '../../../shared/types'
import { TldrawAiTransform } from '../../ai/TldrawAiTransform'

export class ShapeDescriptions extends TldrawAiTransform {
	transformChange = (change: TLAiChange) => {
		switch (change.type) {
			case 'createShape':
			case 'updateShape': {
				const { shape, description } = change

				if (description) {
					shape.meta = {
						...shape.meta,
						description,
					}
				}
				return {
					...change,
					shape,
				}
			}
			default: {
				return change
			}
		}
	}
}
