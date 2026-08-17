# NOVA Web Profile

该 Profile 组合原生 `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app` 与 `dsh-knowledge-qa-bundle`，形成一个固定的 NOVA 问答产品。Bundle 注册唯一 Workspace 并替换可切换的 Workspace/Preset 表面，Profile 把通用默认模式覆盖为 `nova-qa`，同时把 Workspace 显示名配置为“NOVA知识库”。

Profile 使用 DSH 既有的 Cordis Patch 固定 Agent Preset：

```yaml
- id: qa-agent-presets
  config:
    default: nova-qa
    roots:
      - path: !!js ctx.qaWorkspace.presetRoot
        trust: system
    includeUserRoot: false

- id: qa-workspace
  config:
    root: !!js process.env.DSH_QA_WORKSPACE
    title: NOVA知识库
```

原生 Agent Preset 选择器在此 Profile 中禁用，用户不能切换到 Coding Preset。原生 Workspace 浏览器也禁用，用户不能添加或选择其他目录。Composer 不显示命令入口，权限位置只显示静态 `Read Only`；Bundle 的 `permission` 配置也只保留 `read-only`，因此命令或 API 调用没有更宽的权限目标。这些限制属于 Profile/Bundle 组合；没有加载该 Bundle 的原版 Web 不受影响。

Bundle 已通过 `qaWorkspace` 服务、Loader 注入和 `!!js` 配置注册包内的 `nova-qa`。启动前只需设置它读取的资料目录：

```powershell
$env:DSH_QA_WORKSPACE = 'D:\Projects\nova-cac\nova-knowledge-pack'
dsh --profile nova-web
```

启动时，Bundle 通过 `workspaceRegistry.create()` 注册或复用 `DSH_QA_WORKSPACE` 对应的唯一 Workspace；原生“新会话”自动使用它。`nova-qa` 的 `qa-tool-policy.root` 仍在 Preset YAML 中独立配置，模型只能看到该 Preset 注册的 `glob`、`grep` 和 `read`。这三个工具的目录完全由 Preset 决定，不从 Profile、Host 或 Session Workspace 推导。

## API 接入

云端 API 使用稳定 `sessionId` 路由会话，并以同一个固定 Profile 启动。创建新 Agent 时，服务端把 `nova-qa` 写入 Session header 并在未发布的 Agent Scope 中挂载：

```ts
const presetId = 'nova-qa'
const handle = await ctx.agents.create({
  sessionId,
  meta: { agentPreset: presetId },
  setup: async agentCtx => {
    void await ctx.agentPresets.mount(agentCtx, presetId)
  },
})
```

后续请求按同一 `sessionId` 调用 `agent.followup()`。API 可以转发 `session/event` 和 `agent/status` 作为流式响应，并在 Agent 下一次进入 `idle` 时汇总这段活动区间的最后一条 Assistant 消息。请求协议不接受 Workspace、Preset、权限或工具路径覆盖；这些值都来自服务端 Profile、Bundle 和 Preset。并发消息进入同一 Agent Inbox；API 客户端应按 `sessionId` 建立 FIFO 和消息去重。
