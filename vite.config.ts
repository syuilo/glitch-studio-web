import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as Path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/glitch-studio-web/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': Path.resolve('src'),
    },
  },
})
