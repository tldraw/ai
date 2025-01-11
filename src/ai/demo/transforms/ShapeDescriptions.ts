import { TLAiChange, TLAiTransform } from '../../shared/ai-shared'

export class ShapeDescriptions extends TLAiTransform {
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
