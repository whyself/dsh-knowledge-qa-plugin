import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import { CallId } from '@deepseek-ai/dsh-llm'
import { createScope, scopeOf, type Scope } from '@deepseek-ai/dsh-scope'
import type { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { type ToolDefinition } from '@deepseek-ai/dsh-tools'
import * as QaToolPolicy from '../src/index.ts'

const signal = new AbortController().signal

function tool(name: string, properties: Record<string, unknown>): ToolDefinition {
  return {
    name,
    description: `global ${name}`,
    parameters: { type: 'object', properties, additionalProperties: true },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => args,
  }
}

interface Harness {
  ctx: Context
  scope: Scope
  agent: Agent
  outside: string
}

async function harness(): Promise<Harness> {
  const base = await mkdtemp(join(tmpdir(), 'dsh-qa-tool-policy-'))
  const root = join(base, 'documents')
  const outside = join(base, 'outside.txt')
  await mkdir(root)
  await writeFile(join(root, 'inside.txt'), 'inside')
  await writeFile(outside, 'outside')

  const ctx = new Context()
  await ctx.plugin(SystemPrompt, {})
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: root })
  ctx.tools.register(tool('glob', { pattern: { type: 'string' }, path: { type: 'string' } }))
  ctx.tools.register(tool('grep', { pattern: { type: 'string' }, path: { type: 'string' }, include: { type: 'string' } }))
  ctx.tools.register(tool('read', { file_path: { type: 'string' }, offset: { type: 'integer' }, limit: { type: 'integer' } }))
  for (const name of ['read_image', 'write', 'edit']) ctx.tools.register(tool(name, {}))
  for (const [name, order] of [['read', 100], ['write', 101], ['edit', 102], ['glob', 103], ['grep', 104]] as const) {
    ctx.systemPrompt.section({ name: `tool:${name}`, order, text: `global guidance ${name}` })
  }

  const agent = { id: 'qa-agent' as SessionId, session: { header: { cwd: root } } } as Agent
  let scope!: Scope
  await ctx.plugin(Object.assign((inner: Context) => { scope = createScope(inner, agent) }, {
    inject: ['tools', 'systemPrompt', 'fs'],
  }))
  await scope.ctx.plugin(QaToolPolicy, { root })
  return { ctx, scope, agent, outside }
}

async function execute(h: Harness, name: string, args: Record<string, unknown>) {
  return await h.ctx.tools.execute({ signal, callId: CallId(`call-${name}`), name, arguments: args, agent: h.agent })
}

describe('qa-tool-policy', () => {
  it('exposes only scoped glob, grep, and read wrappers with QA schemas', async () => {
    const h = await harness()
    const schemas = h.ctx.tools.schemas(h.agent)
    expect(schemas.map(schema => schema.name).sort()).toEqual(['glob', 'grep', 'read'])
    expect(schemas.find(schema => schema.name === 'glob')?.parameters.properties).not.toHaveProperty('path')
    expect(schemas.find(schema => schema.name === 'grep')?.parameters.properties).not.toHaveProperty('path')
    expect(schemas.find(schema => schema.name === 'read')?.description).toContain('configured QA document root')
  })

  it('keeps shipped executors, blocks removed tools, and confines read', async () => {
    const h = await harness()
    const glob = await execute(h, 'glob', { pattern: '*.txt' })
    expect(glob.isError).toBe(false)
    expect(glob.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('"path"') })
    const grep = await execute(h, 'grep', { pattern: 'inside' })
    expect(grep.isError).toBe(false)
    expect(grep.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('"path"') })
    expect((await execute(h, 'write', {})).isError).toBe(true)
    expect((await execute(h, 'read', { file_path: 'inside.txt' })).isError).toBe(false)
    const outside = await execute(h, 'read', { file_path: h.outside })
    expect(outside.isError).toBe(true)
    expect(outside.content[0]).toMatchObject({ type: 'text', text: 'Error: QA read is confined to the configured document root' })
  })

  it('suppresses inherited filesystem tool guidance', async () => {
    const h = await harness()
    const assembly = await h.ctx.systemPrompt.assemble({ scope: scopeOf(h.scope.ctx)! })
    const toolSections = assembly.sections.filter(section => section.name.startsWith('tool:'))
    expect(toolSections).toEqual([
      { name: 'tool:read', text: '' },
      { name: 'tool:write', text: '' },
      { name: 'tool:edit', text: '' },
      { name: 'tool:glob', text: '' },
      { name: 'tool:grep', text: '' },
    ])
  })

  it('unwinds every shadow and restriction with the preset scope', async () => {
    const h = await harness()
    await h.scope.dispose()
    expect(h.ctx.tools.schemas().map(schema => schema.name).sort())
      .toEqual(['edit', 'glob', 'grep', 'read', 'read_image', 'write'])
  })
})
