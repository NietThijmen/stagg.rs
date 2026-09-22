import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load the root .env file into process.env so server-side packages like
	// Prisma can read DATABASE_URL during local development.
	const env = loadEnv(mode, '../..', '');
	for (const [key, value] of Object.entries(env)) {
		process.env[key] ??= value;
	}

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: { port: 3000 },
		ssr: {
			external: ['@staggers/db', '@prisma/client', '.prisma/client'],
		},
		build: {
			rollupOptions: { external: ['@staggers/db', '@prisma/client'] },
		},
	};
});
