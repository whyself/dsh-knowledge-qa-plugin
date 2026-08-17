# Fixed QA Web Client source

`dsh-knowledge-qa-bundle` 的私有 Web Client 构建源码，不是独立发布包。

它替换原生 Workspace 与 Agent Preset 切换表面，显示扁平 Session 列表、固定 `NOVA知识库`、静态 `Read Only` 和锁定的 NOVA 问答模式。Bundle 构建把浏览器产物组装为 `dist/client.js`，并通过 Bundle 根包的 `dsh.client` 清单加载。
