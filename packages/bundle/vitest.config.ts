import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const dshRoot = fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths({ projects: [resolve(dshRoot, 'tsconfig.base.json')] })],
  resolve: {
    alias: {
      '@deepseek-ai/cordis': resolve(dshRoot, 'vendor/cordis/src/index.ts'),
    },
  },
  test: { environment: 'node' },
})
