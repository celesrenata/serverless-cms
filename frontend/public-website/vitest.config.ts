import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'unified': path.resolve(__dirname, './node_modules/unified'),
      'remark-parse': path.resolve(__dirname, './node_modules/remark-parse'),
      'remark-gfm': path.resolve(__dirname, './node_modules/remark-gfm'),
      'remark-math': path.resolve(__dirname, './node_modules/remark-math'),
      'remark-rehype': path.resolve(__dirname, './node_modules/remark-rehype'),
      'rehype-katex': path.resolve(__dirname, './node_modules/rehype-katex'),
      'rehype-prism-plus': path.resolve(__dirname, './node_modules/rehype-prism-plus'),
      'rehype-sanitize': path.resolve(__dirname, './node_modules/rehype-sanitize'),
      'rehype-stringify': path.resolve(__dirname, './node_modules/rehype-stringify'),
      'hast-util-sanitize': path.resolve(__dirname, './node_modules/hast-util-sanitize'),
      'hast-util-to-string': path.resolve(__dirname, './node_modules/hast-util-to-string'),
      'hast-util-is-element': path.resolve(__dirname, './node_modules/hast-util-is-element'),
      'mdast-util-find-and-replace': path.resolve(__dirname, './node_modules/mdast-util-find-and-replace'),
      'mdast-util-to-string': path.resolve(__dirname, './node_modules/mdast-util-to-string'),
      'unist-util-visit': path.resolve(__dirname, './node_modules/unist-util-visit'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
