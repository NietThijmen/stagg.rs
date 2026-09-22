import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3000,
  },
  ssr: {
    external: ['@staggers/db', '@prisma/client', '.prisma/client'],
  },
  build: {
    rollupOptions: {
      external: ['@staggers/db', '@prisma/client'],
    },
  },
});
