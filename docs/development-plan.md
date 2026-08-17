# 知识问答插件开发计划

## 第一阶段：工具策略与 Preset

- 复用原生 `glob`、`grep`、`read` 执行器。
- QA Scope 只显示这三个工具。
- 搜索工具不能更换根目录。
- `read` 只能读取 Preset 配置根目录内的规范路径。
- QA Persona 要求 glob → grep → read 后基于证据回答。

## 第二阶段：QA Bundle

- 从 `DSH_QA_WORKSPACE` 读取并验证固定资料根。
- 配置文件系统默认根和只读策略。
- 设置默认 `knowledge-qa` Preset并隐藏浏览器模式选择。
- 启用原生文件工具，由 Preset Scope 最终只暴露 glob/grep/read。

## 第三阶段：QA UI

- 保留原生 Sidebar、Conversation、Composer 和 Settings。
- 只替换 `sidebar.workspaces` 与 `conversation.hero.workspace`。
- 左侧显示固定 Workspace 下的扁平 Session 列表。
- 隐藏 Workspace 管理与 Preset 选择。
- Composer 显示静态 `Read Only`，固定 QA 模式，不提供命令入口。

## 第四阶段：AstrBot API

- 提供带认证的单端点 HTTP 问答接口。
- 将 AstrBot 会话标识稳定映射到 DSH Session。
- 同一会话串行提交消息并返回最终文本。
