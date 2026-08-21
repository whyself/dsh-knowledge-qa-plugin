import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const presetRoot = fileURLToPath(new URL('../presets/nova-qa/', import.meta.url))
const composition = readFileSync(`${presetRoot}/agent.cordis.yml`, 'utf8')
const metadata = readFileSync(`${presetRoot}/preset.yml`, 'utf8')
const genericComposition = readFileSync(
  fileURLToPath(new URL('../presets/knowledge-qa/agent.cordis.yml', import.meta.url)),
  'utf8',
)
const genericMetadata = readFileSync(
  fileURLToPath(new URL('../presets/knowledge-qa/preset.yml', import.meta.url)),
  'utf8',
)
const exampleComposition = readFileSync(
  fileURLToPath(new URL('../../../presets/knowledge-qa/agent.cordis.yml', import.meta.url)),
  'utf8',
)
const exampleMetadata = readFileSync(
  fileURLToPath(new URL('../../../presets/knowledge-qa/preset.yml', import.meta.url)),
  'utf8',
)
const novaExampleComposition = readFileSync(
  fileURLToPath(new URL('../../../presets/nova-qa/agent.cordis.yml', import.meta.url)),
  'utf8',
)
const novaExampleMetadata = readFileSync(
  fileURLToPath(new URL('../../../presets/nova-qa/preset.yml', import.meta.url)),
  'utf8',
)
const bundleManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as {
  version?: string
  bundledDependencies?: string[]
  exports?: Record<string, unknown>
  peerDependencies?: Record<string, string>
  repository?: { url?: string }
  dsh?: {
    bundle?: { agentPresets?: string }
    client?: { platform?: string, inject?: string[] }
  }
}
const toolPolicyManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../tool-policy/package.json', import.meta.url)), 'utf8'),
) as { version?: string, repository?: { url?: string }, peerDependencies?: Record<string, string> }
const uiManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../ui/package.json', import.meta.url)), 'utf8'),
) as { version?: string, repository?: { url?: string }, peerDependencies?: Record<string, string> }
const bundlePatch = readFileSync(fileURLToPath(new URL('../cordis.patch.yml', import.meta.url)), 'utf8')
const novaProfilePatch = readFileSync(
  fileURLToPath(new URL('../../../profiles/nova-web/cordis.patch.yml', import.meta.url)),
  'utf8',
)

function personaText(): string {
  const match = composition.match(/    text: \|-\r?\n([\s\S]*?)\r?\n- id: qa-tool-policy/)
  if (match?.[1] === undefined) throw new Error('nova-qa persona text is missing')
  return match[1]
    .split(/\r?\n/)
    .map(line => line.startsWith('      ') ? line.slice(6) : line)
    .join('\n')
    .trim()
}

describe('nova-qa preset', () => {
  it('keeps the stable NOVA policy compact and free of concrete schedules', () => {
    const prompt = personaText()
    expect(prompt.length).toBeLessThanOrEqual(2_500)
    expect(prompt).toContain('你是 NovaBot')
    expect(prompt).toContain('不能冒充 CAC')
    expect(prompt).toContain('knowledge/03_规章与活动/')
    expect(prompt).toContain('最新且明确生效的活动方案')
    expect(prompt).not.toMatch(/\b\d{1,2}:\d{2}\b/)
    expect(prompt).not.toMatch(/https?:\/\//)
    expect(prompt).not.toContain('每轮完整读取')
    expect(prompt).toContain('reply_to 是被引用的旧消息，不是当前发送者的新发言')
    expect(prompt).toContain('reply_to.sender_role=assistant 表示该消息是 NovaBot 自己先前的回答')
  })

  it('owns the read/search tools, fixed-root policy, and native compaction services', () => {
    expect(metadata).toContain('name: NOVA 问答模式')
    expect(composition).toContain("name: '@deepseek-ai/dsh-persona'")
    expect(composition).not.toContain("name: '@deepseek-ai/dsh-tool-fs'")
    expect(composition).not.toContain("name: '@deepseek-ai/dsh-tool-fs-search'")
    expect(composition).toContain('name: dsh-knowledge-qa-bundle/tool-policy')
    expect(composition).toContain('root: !!js process.env.DSH_QA_WORKSPACE')
    expect(genericComposition).toContain('root: !!js process.env.DSH_QA_WORKSPACE')
    expect(composition).not.toContain('dsh-agent-access-policy')
    expect(genericComposition).not.toContain('dsh-agent-access-policy')
    expect(composition).toContain("name: '@deepseek-ai/dsh-compaction-basic'")
    expect(composition).toContain("name: '@deepseek-ai/dsh-compaction-tool-result-pruner'")
    expect(composition).not.toContain('runtimeContext')
    expect(composition).not.toContain('dsh-knowledge-context')
    for (const forbidden of ['tool-bash', 'tool-pwsh', 'tool-web', 'tool-subagent', 'tool-workflow', 'tool-str-replace-editor']) {
      expect(composition).not.toContain(`id: ${forbidden}`)
    }
  })

  it('keeps the copyable default example identical to the bundled preset', () => {
    expect(exampleComposition).toBe(genericComposition)
    expect(exampleMetadata).toBe(genericMetadata)
    expect(novaExampleComposition).toBe(composition)
    expect(novaExampleMetadata).toBe(metadata)
    expect(bundleManifest.dsh?.bundle?.agentPresets).toBeUndefined()
  })

  it('ships one tagged release archive with package-owned Host, policy, and Client entries', () => {
    expect(bundleManifest.version).toBe('0.2.0')
    expect(toolPolicyManifest.version).toBe(bundleManifest.version)
    expect(uiManifest.version).toBe(bundleManifest.version)
    expect(bundleManifest.bundledDependencies).toBeUndefined()
    expect(bundleManifest.exports).toHaveProperty('./tool-policy')
    expect(bundleManifest.exports).toHaveProperty('./client')
    expect(bundleManifest.dsh?.client?.platform).toBe('web')
    expect(bundleManifest.dsh?.client?.inject).toContain('@deepseek-ai/dsh-client-runtime')
    for (const manifest of [bundleManifest, toolPolicyManifest, uiManifest]) {
      expect(manifest.repository?.url).toBe('https://github.com/whyself/dsh-knowledge-qa-plugin.git')
      for (const [name, range] of Object.entries(manifest.peerDependencies ?? {})) {
        if (name.startsWith('@deepseek-ai/dsh-')) expect(range).toBe('>=0.1.1-rc.1 <0.2.0')
      }
    }
  })

  it('fixes the product Workspace and mode while the Profile selects NOVA', () => {
    expect(bundlePatch).toContain('id: qa-workspace')
    expect(bundlePatch).toContain('root: !!js process.env.DSH_QA_WORKSPACE')
    expect(bundlePatch).toContain('title: NOVA知识库')
    expect(bundlePatch).toContain('default: nova-qa')
    expect(bundlePatch).toContain(`- id: agent-default-model
  config:
    provider: deepseek-official
    model: deepseek-v4-flash-vision-exp`)
    expect(bundlePatch).toContain(`- id: permission
  config:
    presets:
      read-only:
        sandbox: read-only
        approval: ask
    defaultPreset: read-only`)
    expect(bundlePatch).not.toContain('workspace-write')
    expect(bundlePatch).not.toContain('danger-full-access')
    expect(bundlePatch).toContain('id: ui-workspace')
    expect(bundlePatch).toContain('id: ui-agent-preset')
    expect(bundlePatch).toContain(`- id: ui-deliverables
  disabled: true`)
    expect(bundlePatch).not.toContain('name: dsh-knowledge-qa-ui')
    expect(bundlePatch).toContain(`- id: agent-presets
  disabled: true`)
    expect(bundlePatch).toContain('id: qa-agent-presets')
    expect(bundlePatch).toContain("name: '@deepseek-ai/dsh-agent-presets'")
    expect(bundlePatch).toContain('inject: [qaWorkspace]')
    expect(bundlePatch).toContain('path: !!js ctx.qaWorkspace.presetRoot')
    expect(bundlePatch).toContain('trust: system')
    expect(bundlePatch).toContain('includeUserRoot: false')
    expect(novaProfilePatch).toContain('id: qa-agent-presets')
    expect(novaProfilePatch).toContain('default: nova-qa')
    expect(novaProfilePatch).toContain('path: !!js ctx.qaWorkspace.presetRoot')
    expect(novaProfilePatch).toContain('includeUserRoot: false')
    expect(novaProfilePatch).toContain('root: !!js process.env.DSH_QA_WORKSPACE')
    expect(novaProfilePatch).toContain('title: NOVA知识库')
  })
})
