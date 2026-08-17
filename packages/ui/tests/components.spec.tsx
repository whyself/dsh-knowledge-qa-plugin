import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import {
  LockedQaModeSelector, QaSessionList, StaticQaModeLabel, StaticReadOnly, visibleSessions,
} from '../src/client/components.tsx'
import { en, zh } from '../src/client/locales.ts'

const first = 'session-first' as SessionId
const second = 'session-second' as SessionId

const state: SessionListState = {
  ids: [first, second],
  byId: {
    [first]: { id: first, displayTitle: '第一条对话', running: false, blank: false, updatedAt: 10 },
    [second]: { id: second, displayTitle: '第二条对话', running: true, blank: false, updatedAt: 20 },
  },
  current: second,
  phase: 'ready',
  subagentsByParent: {},
  jobsBySession: {},
  currentAddress: undefined,
}

describe('QA Session list', () => {
  it('orders visible root Sessions by recent activity', () => {
    expect(visibleSessions(state.ids, state.byId, state.current).map(item => item.id)).toEqual([second, first])
  })

  it('uses native Sidebar props and marks the current running Session', () => {
    const html = renderToStaticMarkup(<QaSessionList
      wide
      expandSidebar={() => {}}
      useSessions={selector => selector(state)}
      useWorkspaces={selector => selector({ phase: 'ready', items: [], archivedSessionIds: [] })}
      openSession={() => {}}
      t={(key: keyof typeof zh) => zh[key]}
    />)
    expect(html).toContain('第二条对话')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('回答中')
  })

  it('follows the active locale for QA-owned Sidebar copy', () => {
    const html = renderToStaticMarkup(<QaSessionList
      wide
      expandSidebar={() => {}}
      useSessions={selector => selector(state)}
      useWorkspaces={selector => selector({ phase: 'ready', items: [], archivedSessionIds: [] })}
      openSession={() => {}}
      t={(key: keyof typeof en) => en[key]}
    />)
    expect(html).toContain('Chats')
    expect(html).toContain('Answering')
  })

  it('renders the fixed access policy as text instead of a button', () => {
    const html = renderToStaticMarkup(<StaticReadOnly
      locked={false}
      sessionId={second}
      useSession={selector => selector(undefined as never)}
      useProjection={() => undefined}
      useSessions={selector => selector(state)}
      useWorkspaces={selector => selector({ phase: 'ready', items: [], archivedSessionIds: [] })}
      t={(key: keyof typeof zh) => zh[key]}
    />)
    expect(html).toContain('固定访问模式：只读')
    expect(html).toContain('只读')
    expect(html).not.toContain('<button')
  })

  it('preserves the Agent mode selector shape but locks it to QA', () => {
    const html = renderToStaticMarkup(<LockedQaModeSelector t={(key: keyof typeof zh) => zh[key]} />)
    expect(html).toContain('当前模式：知识问答，已锁定')
    expect(html).toContain('知识问答')
    expect(html).toContain('<button')
    expect(html).toContain('disabled=""')
  })

  it('renders an existing Session mode as a read-only header label', () => {
    const html = renderToStaticMarkup(<StaticQaModeLabel t={(key: keyof typeof zh) => zh[key]} />)
    expect(html).toContain('当前模式：知识问答')
    expect(html).not.toContain('<button')
  })

  it('translates the fixed access and Agent mode surfaces to English', () => {
    const t = (key: keyof typeof en) => en[key]
    const access = renderToStaticMarkup(<StaticReadOnly
      locked={false}
      sessionId={second}
      useSession={selector => selector(undefined as never)}
      useProjection={() => undefined}
      useSessions={selector => selector(state)}
      useWorkspaces={selector => selector({ phase: 'ready', items: [], archivedSessionIds: [] })}
      t={t}
    />)
    const selector = renderToStaticMarkup(<LockedQaModeSelector t={t} />)
    const header = renderToStaticMarkup(<StaticQaModeLabel t={t} />)
    expect(access).toContain('Fixed access mode: Read Only')
    expect(selector).toContain('Current mode: Knowledge QA, locked')
    expect(selector).toContain('Knowledge QA')
    expect(header).toContain('Current mode: Knowledge QA')
    expect(`${access}${selector}${header}`).not.toContain('知识问答')
  })
})
