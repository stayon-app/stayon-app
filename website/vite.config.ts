import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// StayOn marketing/booking website — runs on :5175 (ops portal owns :5174).
export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
});
