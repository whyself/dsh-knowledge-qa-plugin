import { useEffect, useMemo, useRef } from 'react'
import type { SessionId, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { IconAgentPresetOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { QaUiKey } from './locales.ts'

export interface SessionListInjected {
  /** Open one existing root Session in the native runtime. */
  openSession: (sessionId: SessionId) => void
}

export type QaSessionListProps =
  PropsRuntime<'sidebar.workspaces'>
  & PropsLocale<'knowledgeQa.ui'>
  & SessionListInjected
export type FixedWorkspaceLockProps =
  PropsRuntime<'conversation.hero.workspace'>
  & PropsLocale<'knowledgeQa.ui'>
export type StaticReadOnlyProps =
  PropsRuntime<'conversation.input.access-mode'>
  & PropsLocale<'knowledgeQa.ui'>
export type LockedQaModeSelectorProps = PropsLocale<'knowledgeQa.ui'>
export type StaticQaModeLabelProps = PropsLocale<'knowledgeQa.ui'>

/**
 * Project visible root Sessions in most-recent-first order.
 * @param ids - runtime ordering index.
 * @param byId - runtime Session summaries.
 * @param current - currently open Session, retained while blank.
 * @returns visible Session summaries.
 */
export function visibleSessions(
  ids: readonly SessionId[],
  byId: Record<SessionId, SessionSummary>,
  current: SessionId | undefined,
): SessionSummary[] {
  return ids
    .map(id => byId[id])
    .filter((summary): summary is SessionSummary => summary !== undefined
      && summary.origin !== 'subagent'
      && (!summary.blank || summary.id === current))
    .sort((left, right) => right.updatedAt - left.updatedAt)
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4.6 3.2.9-3.2A2.5 2.5 0 0 1 5 12.5v-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function statusLabel(summary: SessionSummary): QaUiKey | undefined {
  if (summary.pendingInteraction !== undefined) return 'status.waiting'
  if (summary.running) return 'status.answering'
  if (summary.completed === true) return 'status.completed'
  return undefined
}

/** Fixed-product Session list occupying the native Workspace slot. */
export function QaSessionList({ wide, expandSidebar, useSessions, openSession, t }: QaSessionListProps) {
  const initializedSidebar = useRef(false)
  useEffect(() => {
    if (initializedSidebar.current) return
    initializedSidebar.current = true
    if (!wide) expandSidebar()
  }, [wide, expandSidebar])

  const snapshot = useSessions(state => state)
  const sessions = useMemo(
    () => visibleSessions(snapshot.ids, snapshot.byId, snapshot.current),
    [snapshot.ids, snapshot.byId, snapshot.current],
  )

  if (!wide) {
    return (
      <button className="dsh-qa-rail" type="button" aria-label={t('sessions.aria')} onClick={expandSidebar}>
        <ChatIcon />
      </button>
    )
  }

  return (
    <section className="dsh-qa-sessions" aria-label={t('sessions.aria')}>
      <h2 className="dsh-qa-heading">{t('sessions.heading')}</h2>
      <div className="dsh-qa-list">
        {sessions.length === 0 && <p className="dsh-qa-empty">{t('sessions.empty')}</p>}
        {sessions.map((summary) => {
          const selected = summary.id === snapshot.current
          const status = statusLabel(summary)
          return (
            <button
              key={summary.id}
              type="button"
              className={`dsh-qa-session${selected ? ' is-selected' : ''}`}
              aria-current={selected ? 'page' : undefined}
              onClick={() => { openSession(summary.id) }}
            >
              <span className="dsh-qa-title">{summary.blank ? t('session.blank') : summary.displayTitle}</span>
              {status !== undefined && (
                <span className={`dsh-qa-status${summary.running ? ' is-running' : ''}`}>
                  <span className="dsh-qa-dot" aria-hidden="true" />
                  <span className="dsh-qa-visually-hidden">{t(status)}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Remove dropdown semantics from the native Workspace chip in this fixed-Workspace product. */
export function FixedWorkspaceLock({ anchorRef, selectedId, useWorkspaces, onClose, t }: FixedWorkspaceLockProps) {
  const title = useWorkspaces(state => state.items.find(item => item.workspaceId === selectedId)?.title
    ?? state.items[0]?.title)
  useEffect(() => {
    const button = anchorRef?.current
    if (button === null || button === undefined || title === undefined) return
    const ariaLabel = button.getAttribute('aria-label')
    const ariaHasPopup = button.getAttribute('aria-haspopup')
    const ariaExpanded = button.getAttribute('aria-expanded')
    const tabIndex = button.getAttribute('tabindex')
    button.dataset.dshQaFixedWorkspace = ''
    button.setAttribute('aria-label', t('workspace.fixedAria', { name: title }))
    button.setAttribute('aria-disabled', 'true')
    button.removeAttribute('aria-haspopup')
    button.removeAttribute('aria-expanded')
    button.setAttribute('tabindex', '-1')
    onClose()
    return () => {
      delete button.dataset.dshQaFixedWorkspace
      button.removeAttribute('aria-disabled')
      if (ariaLabel === null) button.removeAttribute('aria-label')
      else button.setAttribute('aria-label', ariaLabel)
      if (ariaHasPopup === null) button.removeAttribute('aria-haspopup')
      else button.setAttribute('aria-haspopup', ariaHasPopup)
      if (ariaExpanded === null) button.removeAttribute('aria-expanded')
      else button.setAttribute('aria-expanded', ariaExpanded)
      if (tabIndex === null) button.removeAttribute('tabindex')
      else button.setAttribute('tabindex', tabIndex)
    }
  }, [anchorRef, onClose, t, title])
  return null
}

/** Occupied empty seat: the fixed QA product exposes no slash-command launcher. */
export function HiddenCommandLauncher() {
  return null
}

/** Non-interactive echo of the fixed read-only permission policy. */
export function StaticReadOnly({ t }: StaticReadOnlyProps) {
  return (
    <span className="dsh-qa-readonly" aria-label={t('access.readOnlyAria')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1.2 14 3.45v3.3c0 4.45-3.3 6.5-6 7.55-2.7-1.05-6-3.1-6-7.55v-3.3L8 1.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="m5.2 7.65 1.75 1.75 3.85-4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{t('access.readOnly')}</span>
    </span>
  )
}

/** Original-style Agent Preset selector, disabled because this Profile fixes QA mode. */
export function LockedQaModeSelector({ t }: LockedQaModeSelectorProps) {
  return (
    <button
      type="button"
      className="dsh-qa-mode-selector"
      aria-label={t('mode.lockedAria')}
      title={t('mode.lockedTitle')}
      disabled
    >
      <IconAgentPresetOutline16 className="dsh-qa-mode-icon" />
      {t('mode.name')}
    </button>
  )
}

/** Read-only Agent Preset label for an existing Session header. */
export function StaticQaModeLabel({ t }: StaticQaModeLabelProps) {
  return (
    <span className="dsh-qa-mode-label" aria-label={t('mode.currentAria')}>
      <IconAgentPresetOutline16 size={14} className="dsh-qa-mode-icon" />
      {t('mode.name')}
    </span>
  )
}
