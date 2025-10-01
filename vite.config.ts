import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    fs: {
      // Allow serving files from node_modules for PDF.js worker
      allow: ['..'],
    },
    // Configure headers for worker support
    headers: {
      // Remove COEP/COOP headers that can interfere with worker loading in Electron
      'Cache-Control': 'no-cache',
    },
  },
  build: {
    outDir: 'dist',
  },
});
