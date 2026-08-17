import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const dshRoot = fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url))
const dshTsconfig = resolve(dshRoot, 'tsconfig.base.json')

export default defineConfig({
  plugins: [tsconfigPaths({ projects: [dshTsconfig] })],
  resolve: {
    alias: {
      '@deepseek-ai/cordis': resolve(dshRoot, 'vendor/cordis/src/index.ts'),
      '@deepseek-ai/dsh-agent': resolve(dshRoot, 'packages/core/agent/src/index.ts'),
      '@deepseek-ai/dsh-fs-local': resolve(dshRoot, 'packages/fs/fs-local/src/index.ts'),
      '@deepseek-ai/dsh-llm': resolve(dshRoot, 'packages/llm/llm/src/index.ts'),
      '@deepseek-ai/dsh-scope': resolve(dshRoot, 'packages/core/scope/src/index.ts'),
      '@deepseek-ai/dsh-session': resolve(dshRoot, 'packages/core/session/src/index.ts'),
      '@deepseek-ai/dsh-system-prompt': resolve(dshRoot, 'packages/core/system-prompt/src/index.ts'),
      '@deepseek-ai/dsh-tools': resolve(dshRoot, 'packages/core/tools/src/index.ts'),
    },
  },
  test: { environment: 'node' },
})
