import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');

  const apiUrl = env.VITE_API_URL;

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