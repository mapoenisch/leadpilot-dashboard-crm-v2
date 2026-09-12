import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          if (id.includes('@supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'recharts-vendor';
          }
          if (id.includes('framer-motion')) {
            return 'framer-motion-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
});
