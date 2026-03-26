import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE');
  const apiUrl: string = env.VITE_API_URL || 'http://localhost:8000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/generate': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/ask': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/summarize': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/health': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});

