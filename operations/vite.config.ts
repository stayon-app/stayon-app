import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ops portal dev server on 5174 (Expo app uses 8085; backend uses 4000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, host: true },
});
