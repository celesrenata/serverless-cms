import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force resolution of shared markdown deps from this project's node_modules
    dedupe: [
      'unified',
      'remark-parse',
      'remark-gfm',
      'remark-math',
      'remark-rehype',
      'rehype-katex',
      'rehype-prism-plus',
      'rehype-sanitize',
      'rehype-stringify',
      'hast-util-to-string',
      'hast-util-is-element',
      'hast-util-sanitize',
      'unist-util-visit',
      'mdast-util-find-and-replace',
      'mdast-util-to-string',
    ],
  },
  build: {
    outDir: 'dist',
  },
});
