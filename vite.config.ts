import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure process.env is available for the GenAI SDK if it relies on it
    'process.env': process.env
  }
});