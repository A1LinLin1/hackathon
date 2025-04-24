// vite.config.ts（项目根目录）
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@mysten\/sui$/, replacement: '@mysten/sui/client' }
    ]
  },
  optimizeDeps: {
    exclude: ['@mysten/sui'],
    include: [
      'bech32',
      '@mysten/sui/client',
      '@mysten/sui/transactions',
      '@mysten/wallet-adapter-react',
      '@mysten/wallet-adapter-sui-wallet',
      '@suiet/wallet-kit',
      'tweetnacl'
    ]
  },
  server: {
    proxy: {
      // 所有 /api 前缀的请求都转发到后端
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: false
  }
});

