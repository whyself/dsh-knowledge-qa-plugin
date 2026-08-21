# NOVA Knowledge QA for DeepSeek Harness

[![Release](https://img.shields.io/github/v/release/whyself/dsh-knowledge-qa-plugin)](https://github.com/whyself/dsh-knowledge-qa-plugin/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DSH Plugin](https://img.shields.io/badge/DSH-plugin-5b5bd6.svg)](https://github.com/topics/dsh-plugin)

面向 NOVA 资料库的独立 [DeepSeek Harness](https://github.com/deepseek-harness/deepseek-harness) Profile Bundle。它不修改 DSH 源码，安装后把原生 Web 固定为一个资料目录、一个 `nova-qa` Preset 和只读权限，同时保留原生 Session、对话历史、模型选择和 Web RPC。

本仓库以 `dsh-plugin` Topic 标记为 DeepSeek Harness 插件。

## 功能

- 唯一 Workspace 显示为 `NOVA知识库`，启动时由 `DSH_QA_WORKSPACE` 指定资料目录。
- 默认且锁定 `nova-qa`；通用 `knowledge-qa` 仍随包提供，便于二次开发。
- 新 Session 默认使用 `deepseek-official / deepseek-v4-flash-vision-exp`，可接收文本与图片；已有 Session 保留日志中的模型，直到客户端显式切换。
- 模型只获得 `glob`、`grep`、`read`，三个工具的根目录只由 Preset 的 `qa-tool-policy.config.root` 决定。
- 权限表只有 `read-only`，Workspace、Preset 和权限选择入口均被移除。
- 删除只适用于文件产出的 Web deliverables 提示词和展示。
- Preset 位于发布包内部并注册为 `system` 根，不复制到 `$DSH_HOME/.agent-presets`。
- 发布物是一个约 13 KB 的 `.tgz`，不包含 `node_modules`、源码、测试或 Source Map。

## 要求

- Node.js `^22.19` 或 `>=24`
- pnpm 11
- `@deepseek-ai/dsh` `>=0.1.1-rc.1 <0.2.0`；发布验收使用 `0.1.1-rc.1`
- 一个可读的 NOVA 资料目录

## 安装

先安装 DSH：

```bash
pnpm add --global @deepseek-ai/dsh@0.1.1-rc.1
```

再把已发布的单包 Bundle 加入 `web` Profile：

```bash
dsh plugin --profile web add https://github.com/whyself/dsh-knowledge-qa-plugin/releases/download/v0.2.0/dsh-knowledge-qa-bundle-0.2.0.tgz
```

Bundle 自身已经固定 NOVA 默认值，不需要把仓库里的 Preset 或 Profile 文件复制到服务器。

### 启动

Linux：

```bash
export DSH_HOME=/srv/nova/dsh-home
export DSH_QA_WORKSPACE=/srv/nova/knowledge
dsh --profile web --port 3081
```

PowerShell：

```powershell
$env:DSH_HOME = 'D:\Services\nova\dsh-home'
$env:DSH_QA_WORKSPACE = 'D:\Projects\nova-cac\nova-knowledge-pack'
dsh --profile web --port 3081
```

默认地址是 `http://127.0.0.1:3081/`。模型凭据通过 DSH 原生设置或服务器的 `$DSH_HOME` 凭据层配置，不要写入本仓库、Preset 或启动脚本。

## 包结构

```text
dsh-knowledge-qa-plugin/
├─ packages/
│  ├─ bundle/       发布包、Workspace 服务、Cordis Patch 与 Preset
│  ├─ tool-policy/  私有构建源码，产出 Bundle 的 ./tool-policy 子入口
│  └─ ui/           私有构建源码，产出 Bundle 的 ./client Web 入口
├─ presets/         与包内 Preset 保持一致的可读示例
├─ profiles/        开发期 Profile 覆盖示例
├─ scripts/         组装与干净发布验收
└─ docs/            设计与实施记录
```

运行时只安装 `dsh-knowledge-qa-bundle`。工具策略通过 `dsh-knowledge-qa-bundle/tool-policy` 加载，Web Client 通过同包的 `./client` 导出发现；`tool-policy` 和 `ui` 不是需要单独发布或安装的 npm 包。

## 配置归属

| 配置 | 唯一来源 |
| --- | --- |
| 资料 Workspace 路径 | `DSH_QA_WORKSPACE`，由 Bundle 的 `qa-workspace` 行读取 |
| `glob` / `grep` / `read` 根目录 | 每个 Preset 的 `qa-tool-policy.config.root` |
| 默认模式 | Bundle 的 `qa-agent-presets.config.default: nova-qa` |
| 新 Session 默认模型 | Bundle 的 `agent-default-model`: `deepseek-official / deepseek-v4-flash-vision-exp` |
| 权限 | Bundle 的单一 `read-only` 表 |
| Session、消息与回答 | DSH 原生 Web RPC 和 Session 存储 |

Workspace 不会推导或改写工具根。模型选择属于 DSH Session 状态，不属于 Agent Preset；Bundle 只提供新 Session 的默认值。通过 API 创建 Session 时，请求也不应接受 Workspace、Preset、权限或工具路径覆盖。

## 开发与发布验收

开发 checkout 使用本机 DSH 源码提供类型依赖，但发布验收不会使用它：

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm release:verify
```

`release:verify` 会重新构建并打包，在临时目录从 npm 安装 `@deepseek-ai/dsh@0.1.1-rc.1`，通过真实 `dsh plugin` 安装 tarball，启动独立 Web 服务，再调用 `workspace.list`、`agentPreset.list`、`session.create` 和 `session.history`。成功后发布物位于 `.release/`。

本地联调仍可使用路径安装：

```bash
dsh plugin --profile web add ./packages/bundle
```

## 安全

DSH 原生 `/api` 还包含 Settings、Credentials 和 Workspace 等管理接口，不应直接暴露到公网。本机客户端应让 DSH 只监听 `127.0.0.1`；跨主机调用应在前面增加只开放聊天方法的受鉴权适配层。

## License

[MIT](LICENSE)
