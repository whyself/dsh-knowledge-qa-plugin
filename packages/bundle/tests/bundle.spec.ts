import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import QaWorkspace from '../src/index.ts'

describe('qa workspace bundle service', () => {
  it('registers one absolute existing document Workspace', async () => {
    const base = await mkdtemp(join(tmpdir(), 'dsh-qa-bundle-'))
    const root = join(base, 'documents')
    await mkdir(root)
    const ctx = new Context()
    const create = vi.fn().mockResolvedValue({ id: 'qa-workspace-id' })
    ctx.provide('workspaceRegistry', { create } as never)
    await ctx.plugin(QaWorkspace, { root, title: '知识库' })
    expect(ctx.qaWorkspace.root).toBe(root)
    expect(ctx.qaWorkspace.presetRoot).toBe(fileURLToPath(new URL('../presets/', import.meta.url)))
    expect(ctx.qaWorkspace.workspaceId).toBe('qa-workspace-id')
    expect(create).toHaveBeenCalledWith(root, '知识库')
  })

  it('fails fast for a missing root or a regular file', async () => {
    const base = await mkdtemp(join(tmpdir(), 'dsh-qa-bundle-'))
    const file = join(base, 'file.txt')
    await writeFile(file, 'not a directory')
    const missing = new Context()
    missing.provide('workspaceRegistry', { create: vi.fn() } as never)
    await expect(missing.plugin(QaWorkspace, { root: join(base, 'missing') })).rejects.toThrow(/document root is unavailable/)
    const regular = new Context()
    regular.provide('workspaceRegistry', { create: vi.fn() } as never)
    await expect(regular.plugin(QaWorkspace, { root: file })).rejects.toThrow(/not a directory/)
  })
})
