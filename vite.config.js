import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_DEV_API_TARGET || 'https://whaleserver-production.up.railway.app';
const apiProxy = {
  target: apiTarget,
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api/, ''),
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiProxy,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxy,
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          warning.message.includes('use client')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
});
