import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Same-origin API, mirroring the production Vercel -> Render rewrite from
    // docs/google-login-plan.md: browsers talk to /api on the web origin.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
