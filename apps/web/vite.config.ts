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
  },
});
