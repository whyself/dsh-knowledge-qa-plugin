/** Simplified Chinese copy for the QA-owned sidebar surface. */
export const zh = {
  'sessions.heading': '对话',
  'sessions.aria': '对话列表',
  'sessions.empty': '暂无对话，点击上方“新会话”开始。',
  'session.blank': '新对话',
  'status.waiting': '等待操作',
  'status.answering': '回答中',
  'status.completed': '已完成',
  'workspace.fixedAria': '固定工作区：{name}',
  'access.readOnly': '只读',
  'access.readOnlyAria': '固定访问模式：只读',
  'mode.name': '知识问答',
  'mode.lockedAria': '当前模式：知识问答，已锁定',
  'mode.lockedTitle': '当前部署固定使用知识问答模式',
  'mode.currentAria': '当前模式：知识问答',
} satisfies Record<string, string>

/** QA UI dictionary key union. */
export type QaUiKey = keyof typeof zh

/** English copy, checked against the Chinese source key set. */
export const en = {
  'sessions.heading': 'Chats',
  'sessions.aria': 'Chat list',
  'sessions.empty': 'No chats yet. Select “New Session” above to begin.',
  'session.blank': 'New chat',
  'status.waiting': 'Waiting for input',
  'status.answering': 'Answering',
  'status.completed': 'Completed',
  'workspace.fixedAria': 'Fixed workspace: {name}',
  'access.readOnly': 'Read Only',
  'access.readOnlyAria': 'Fixed access mode: Read Only',
  'mode.name': 'Knowledge QA',
  'mode.lockedAria': 'Current mode: Knowledge QA, locked',
  'mode.lockedTitle': 'This deployment is fixed to Knowledge QA mode',
  'mode.currentAria': 'Current mode: Knowledge QA',
} satisfies Record<QaUiKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy owned by the external knowledge-QA UI plugin. */
    'knowledgeQa.ui': QaUiKey
  }
}
