# `dsh-knowledge-qa-bundle`

固定 NOVA 知识问答产品的单一 DSH Profile Bundle。包根导出 Host 侧 `qaWorkspace` 服务，`./tool-policy` 导出 Agent-scoped 只读工具策略，`./client` 导出固定 Workspace、Preset 和权限表面的 Web Client。安装时不需要额外安装 `dsh-knowledge-qa-tool-policy` 或 `dsh-knowledge-qa-ui`。

Bundle 叠加在原生 `dsh-base` 与 `dsh-web-app` 之后，完成以下配置：

- 从 `DSH_QA_WORKSPACE` 注册唯一 `NOVA知识库` Workspace。
- 把文件系统后端、只读沙箱和唯一 `read-only` 权限预设对齐到该目录。
- 从包内 `presets/` 注册只读 `system` Preset 根，默认选择 `nova-qa`。
- 恢复原生读取/搜索能力，但由 Agent Preset 的 `dsh-knowledge-qa-bundle/tool-policy` 子入口限制模型工具和资料根。
- 禁用原生 Workspace、Preset、权限切换表面和 Web deliverables 插件。
- 通过包自身的 `dsh.client` 声明加载固定 QA UI，无需另一个 Loader 包名。

正式安装：

```bash
dsh plugin --profile web add https://github.com/whyself/dsh-knowledge-qa-plugin/releases/download/v0.1.1/dsh-knowledge-qa-bundle-0.1.1.tgz
```

启动前必须设置资料根：

```bash
export DSH_QA_WORKSPACE=/srv/nova/knowledge
dsh --profile web --port 3081
```

工具路径只由 Preset 明确配置：

```yaml
- id: qa-tool-policy
  name: dsh-knowledge-qa-bundle/tool-policy
  config:
    root: !!js process.env.DSH_QA_WORKSPACE
```

Workspace 根不会自动成为工具根，也不会覆盖 Preset。包内 `knowledge-qa` 是通用示例；发布产品固定使用 `nova-qa`。
