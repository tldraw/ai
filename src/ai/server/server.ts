import { TLAiPrompt, TLAiChange } from '../shared/ai-shared'

// The parts of the module that are designed to run on the server. We'll be faking the server here.
export function createTldrawAiGenerator(
	fn: (input: TLAiPrompt) => AsyncGenerator<TLAiChange>
) {
	return fn
}
