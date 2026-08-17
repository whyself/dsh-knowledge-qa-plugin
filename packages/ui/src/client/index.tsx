import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import {
  FixedWorkspaceLock, HiddenCommandLauncher, LockedQaModeSelector, QaSessionList,
  StaticQaModeLabel, StaticReadOnly,
  type SessionListInjected,
} from './components.tsx'
import { en, zh } from './locales.ts'

export const inject = ['slots', 'sessions', 'locale']

const STYLE_ID = 'dsh-knowledge-qa-ui'
const LOCALE_NS = 'knowledgeQa.ui'
const STYLE = `
.dsh-qa-sessions{display:flex;min-height:0;height:100%;flex-direction:column;padding:12px 8px 8px;color:var(--dsw-alias-label-primary)}
.dsh-qa-heading{display:flex;height:36px;align-items:center;margin:2px 0 4px;padding-left:4px;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:14px;font-weight:400;line-height:20px}
.dsh-qa-list{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.dsh-qa-session{position:relative;display:flex;width:100%;min-height:44px;align-items:center;border:0;border-radius:8px;padding:8px 32px 8px 10px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.dsh-qa-session:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-qa-session:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dsh-qa-session.is-selected{background:var(--dsw-alias-interactive-bg-active)}
.dsh-qa-title{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:14px;line-height:20px}
.dsh-qa-status{position:absolute;right:12px;display:flex;align-items:center}
.dsh-qa-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary)}
.dsh-qa-status.is-running .dsh-qa-dot{background:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.dsh-qa-empty{margin:20px 10px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.dsh-qa-rail{display:flex;width:44px;height:44px;margin:8px auto;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-qa-rail:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
[data-dsh-qa-fixed-workspace]{cursor:default;pointer-events:none}
[data-dsh-qa-fixed-workspace] svg:last-of-type{display:none}
.dsh-qa-readonly{display:inline-flex;min-height:32px;align-items:center;gap:6px;padding:0 8px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:20px;white-space:nowrap;user-select:none}
.dsh-qa-readonly svg{flex:0 0 auto;color:var(--dsw-alias-label-secondary)}
.dsh-qa-mode-selector{display:inline-flex;max-width:min(100%,240px);min-height:28px;align-items:center;gap:4px;overflow:hidden;border:0;border-radius:16px;padding:0 8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;text-overflow:ellipsis;cursor:default;opacity:1}
.dsh-qa-mode-selector:disabled{color:var(--dsw-alias-label-primary);opacity:1}
.dsh-qa-mode-icon{flex:none;color:var(--dsw-alias-label-primary)}
.dsh-qa-mode-label{display:inline-flex;min-height:24px;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;user-select:none}
.dsh-qa-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (prefers-reduced-motion:no-preference){.dsh-qa-session,.dsh-qa-rail{transition:background-color 160ms ease,color 160ms ease}}
`

/** Register the fixed QA surface and its locale dictionary. */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(LOCALE_NS, { zh, en }),
    'qa-ui: dictionaries',
  )
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = STYLE_ID
    style.textContent = STYLE
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'qa-ui: styles')

  const injected = (): SessionListInjected => ({
    openSession: (sessionId: SessionId) => { ctx.sessions.open(sessionId) },
  })

  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register(
    { name: 'sidebar.workspaces', locale: LOCALE_NS, inject: injected },
    QaSessionList,
  ))
  ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register(
    { name: 'conversation.hero.workspace', locale: LOCALE_NS },
    FixedWorkspaceLock,
  ))
  ctx.slots.inject('conversation.input.command-launcher', () => ctx.slots.register(
    { name: 'conversation.input.command-launcher', priority: -100 },
    HiddenCommandLauncher,
  ))
  ctx.slots.inject('conversation.input.access-mode', () => ctx.slots.register(
    { name: 'conversation.input.access-mode', priority: -100, locale: LOCALE_NS },
    StaticReadOnly,
  ))
  ctx.slots.inject('conversation.hero.agentPreset', () => ctx.slots.register(
    { name: 'conversation.hero.agentPreset', locale: LOCALE_NS },
    LockedQaModeSelector,
  ))
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    { name: 'conversation.session.header.actions', id: 'qa-mode', order: -10, locale: LOCALE_NS },
    StaticQaModeLabel,
  ))
}
