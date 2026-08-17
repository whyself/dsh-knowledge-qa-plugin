import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(repoRoot, 'packages', 'bundle', 'dist')

mkdirSync(outputDir, { recursive: true })
copyFileSync(
  join(repoRoot, 'packages', 'tool-policy', 'dist', 'index.js'),
  join(outputDir, 'tool-policy.js'),
)
copyFileSync(
  join(repoRoot, 'packages', 'tool-policy', 'dist', 'index.d.ts'),
  join(outputDir, 'tool-policy.d.ts'),
)
copyFileSync(
  join(repoRoot, 'packages', 'ui', 'dist', 'client.js'),
  join(outputDir, 'client.js'),
)
