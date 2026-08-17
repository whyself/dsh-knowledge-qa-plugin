/**
 * Agent-scoped QA view over the shipped DSH filesystem tools.
 * @module dsh-knowledge-qa-tool-policy
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-system-prompt'

export const name = 'qa-tool-policy'
export const inject = ['tools', 'systemPrompt', 'fs']

export interface Config {
  /** Fixed document root used by every wrapped search and read call. */
  root: string
}

export const Config: z<Config> = z.object({
  root: z.string().required(),
})

const ALLOWED_TOOLS = ['glob', 'grep', 'read'] as const

function requiredTool(ctx: Context, toolName: typeof ALLOWED_TOOLS[number]): ToolDefinition {
  const definition = ctx.tools.get(toolName)
  if (definition === undefined) {
    throw new Error(`qa-tool-policy: required global tool ${JSON.stringify(toolName)} is unavailable; load the shipped tool-fs and tool-fs-search rows in the host composition`)
  }
  return definition
}

function withoutParameter(parameters: Record<string, unknown>, key: string): Record<string, unknown> {
  const cloned = structuredClone(parameters)
  const properties = cloned.properties
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    throw new Error(`qa-tool-policy: cannot constrain schema without object properties (${key})`)
  }
  delete (properties as Record<string, unknown>)[key]
  if (Array.isArray(cloned.required)) cloned.required = cloned.required.filter(value => value !== key)
  cloned.additionalProperties = false
  return cloned
}

function assertNoPath(args: unknown): void {
  if (typeof args === 'object' && args !== null && Object.hasOwn(args, 'path')) {
    throw new Error('QA search is confined to the configured document root; path cannot be supplied')
  }
}

async function confinedReadArgs(ctx: Context, rootPath: string, args: unknown, exec: ToolRunContext): Promise<unknown> {
  if (typeof args !== 'object' || args === null || typeof (args as { file_path?: unknown }).file_path !== 'string') return args
  const root = await ctx.fs.resolve(rootPath, { signal: exec.signal })
  const target = await ctx.fs.resolve((args as { file_path: string }).file_path, { cwd: rootPath, signal: exec.signal })
  if (!ctx.fs.contains(root, target)) throw new Error('QA read is confined to the configured document root')
  return { ...args as Record<string, unknown>, file_path: ctx.fs.processPath(target) }
}

function shadow(
  ctx: Context,
  original: ToolDefinition,
  description: string,
  parameters: Record<string, unknown>,
  transform: (args: unknown, exec: ToolRunContext) => unknown | Promise<unknown>,
): void {
  ctx.tools.register({
    ...original,
    description,
    parameters,
    async execute(args, exec) {
      return await original.execute(await transform(args, exec), exec)
    },
  })
}

export function apply(ctx: Context, config: Config): void {
  if (config.root.trim() === '') throw new Error('qa-tool-policy: root must be a non-empty path')
  const glob = requiredTool(ctx, 'glob')
  const grep = requiredTool(ctx, 'grep')
  const read = requiredTool(ctx, 'read')

  ctx.tools.restrict({ allow: [...ALLOWED_TOOLS] })

  shadow(
    ctx,
    glob,
    'Find files by glob pattern inside the configured QA document root. The search root cannot be changed.',
    withoutParameter(glob.parameters, 'path'),
    (args) => {
      assertNoPath(args)
      return { ...args as Record<string, unknown>, path: config.root }
    },
  )
  shadow(
    ctx,
    grep,
    'Search document contents inside the configured QA document root. Returns matching lines with file paths and line numbers; use read for surrounding context. The search root cannot be changed.',
    withoutParameter(grep.parameters, 'path'),
    (args) => {
      assertNoPath(args)
      return { ...args as Record<string, unknown>, path: config.root }
    },
  )
  shadow(
    ctx,
    read,
    'Read a UTF-8 text document inside the configured QA document root and return line-numbered content. Use paths returned by glob or grep.',
    structuredClone(read.parameters),
    async (args, exec) => await confinedReadArgs(ctx, config.root, args, exec),
  )

  ctx.systemPrompt.section({ name: 'tool:read', order: 100, text: '' })
  ctx.systemPrompt.section({ name: 'tool:write', order: 101, text: '' })
  ctx.systemPrompt.section({ name: 'tool:edit', order: 102, text: '' })
  ctx.systemPrompt.section({ name: 'tool:glob', order: 103, text: '' })
  ctx.systemPrompt.section({ name: 'tool:grep', order: 104, text: '' })
}
