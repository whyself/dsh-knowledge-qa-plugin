/**
 * Host-side Workspace service for the fixed knowledge-QA product.
 * @module dsh-knowledge-qa-bundle
 */

import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Workspace, WorkspaceId } from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-workspace'
import z from '@deepseek-ai/schemastery'

declare module '@deepseek-ai/cordis' {
  interface Context {
    qaWorkspace: QaWorkspace
  }
}

export interface Config {
  /** Absolute or process-relative directory containing the QA documents. */
  root: string
  /** Display title of the one durable Workspace registered for the QA UI. */
  title?: string
}

/** Absolute Agent Preset directory shipped beside this package's source or build output. */
export const PACKAGED_PRESET_ROOT = fileURLToPath(new URL('../presets/', import.meta.url))

export class QaWorkspace extends Service {
  static inject = ['workspaceRegistry']
  static Config: z<Config> = z.object({
    root: z.string().required(),
    title: z.string().default('知识库'),
  })

  /** Canonical process-absolute document Workspace. */
  readonly root: string
  /** Package-owned Agent Preset root exposed to injected Loader config. */
  readonly presetRoot = PACKAGED_PRESET_ROOT
  private readonly title: string
  private registered?: Workspace

  constructor(ctx: Context, config: Config) {
    super(ctx, 'qaWorkspace')
    if (config.root.trim() === '') throw new Error('qa-workspace: root must be a non-empty directory path')
    this.root = resolve(config.root)
    this.title = config.title ?? '知识库'
    let info
    try {
      info = statSync(this.root)
    } catch (error: unknown) {
      throw new Error(`qa-workspace: document root is unavailable: ${this.root}`, { cause: error })
    }
    if (!info.isDirectory()) throw new Error(`qa-workspace: document root is not a directory: ${this.root}`)
  }

  /** Stable id of the durable Workspace after service initialization. */
  get workspaceId(): WorkspaceId {
    if (this.registered === undefined) throw new Error('qa-workspace: Workspace is not initialized')
    return this.registered.id
  }

  /** Register or reuse the one Workspace before this service becomes injectable. */
  protected async [Service.init](): Promise<void> {
    this.registered = await this.ctx.workspaceRegistry.create(this.root, this.title)
  }
}

export default QaWorkspace
