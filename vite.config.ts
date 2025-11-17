import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using process.cwd() with explicit cast to avoid type errors when @types/node is missing
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Ensure the API key is properly stringified for replacement in client code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (process as any).env?.API_KEY || '')
    }
  };
});