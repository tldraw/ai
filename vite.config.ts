import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	if (mode === 'production' && !process.env.VITE_AI_SERVER_URL) {
		throw new Error('TLDRAW_WORKER_URL must be set in production')
	}

	return {
		plugins: [react()],
		define: {
			'process.env.VITE_AI_SERVER_URL':
				process.env.VITE_AI_SERVER_URL ?? '`http://${location.hostname}:5172`',
		},
	}
})
