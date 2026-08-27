import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: [
      'silly-groggy-september.ngrok-free.dev',
      '.ngrok-free.dev' // Allows all ngrok domains
    ]
  }
});
