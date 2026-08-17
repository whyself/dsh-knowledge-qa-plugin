# QA tool policy source

`dsh-knowledge-qa-bundle/tool-policy` 的私有构建源码，不是独立发布包。

它在 Agent Preset Scope 中取得 Host 已注册的 `glob`、`grep` 和 `read`，限制工具表只保留这三项，删除搜索工具的 `path` 参数，并把所有操作限制在 Preset 的 `config.root`。Bundle 构建时把产物组装为 `dist/tool-policy.js`。

Preset 用法：

```yaml
- id: qa-tool-policy
  name: dsh-knowledge-qa-bundle/tool-policy
  config:
    root: !!js process.env.DSH_QA_WORKSPACE
```
