import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // DO NOT clear the dist directory so we preserve the content script build
    minify: 'esbuild',
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      external: [], // Explicitly disable externalization to force full dependency inlining
      output: {
        format: 'iife',
        entryFileNames: 'background/background.js',
        name: 'PrivacyShieldBackground',
        extend: true,
        inlineDynamicImports: true, // Force all dependencies inside a single script file
        manualChunks: undefined, // Disable manual chunk splitting
        preserveModules: false, // Prevent rollup from retaining module structures
      }
    }
  }
});
