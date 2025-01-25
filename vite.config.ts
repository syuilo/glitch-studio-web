import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as Path from 'node:path';
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), glsl()],
  resolve: {
    alias: {
      '@': Path.resolve('src'),
    },
  },
})
