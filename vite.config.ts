import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  test: {
    globals: true,
    setupFiles: './setupTests.ts',
    environment: 'jsdom',
    css: false,
    reporters: ['default', 'junit'],
    outputFile: './test-results.xml',
    coverage: {
      provider: 'v8', // istanbul or 'v8'
      reporter: ['cobertura'],
      include: ['src/**/*'],
      exclude: ['**/*.stories.tsx', '**/*.d.ts']
    }
  },
  plugins: [tsconfigPaths(), react(), svgr()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    outDir: './build'
  }
});
