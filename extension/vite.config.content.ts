import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Clear the dist directory before the content script build
    minify: 'esbuild',
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content-main.ts'),
      },
      external: [], // Explicitly disable externalization to force full dependency inlining
      output: {
        format: 'iife',
        entryFileNames: 'content/content.js',
        name: 'PrivacyShieldContent',
        extend: true,
        inlineDynamicImports: true, // Force all dynamically imported assets into one standalone file
        manualChunks: undefined, // Disable manual chunk splitting
        preserveModules: false, // Prevent rollup from retaining module file structures
      }
    }
  }
});
