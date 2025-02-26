import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'happy-dom',
		include: ['**/*.test.ts', '**/*.test.tsx'],
		globals: true,
	},
})
