'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

const POST_ID = 'chat-alsa-elvi-001'
const FORUM_API = 'https://alsa-forum.vercel.app/api'
const TEAM_STATE_API = `${FORUM_API}/team-state`
const PAGE_SIZE = 50
const MAX_TOTAL = 500

interface ChatEntry {
  author: string
  text: string
  timestamp: string
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

// Get current time in GMT+8 (Taipei timezone)
function nowGMT8() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  // UTC time + 8 hours
  const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return `${utc8.getUTCFullYear()}-${pad(utc8.getUTCMonth()+1)}-${pad(utc8.getUTCDate())} ${pad(utc8.getUTCHours())}:${pad(utc8.getUTCMinutes())} GMT+8`
}

function fmtHHMMSS() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getRouteLabel(text: string) {
  if (!text) return 'Ryan→All'
  const t = text.toLowerCase()
  if (t.startsWith('@alsa ') || t.startsWith('@alvi ')) return 'Ryan→Alsa'
  if (t.startsWith('@elvi ')) return 'Ryan→Elvi'
  return 'Ryan→All'
}

function stripPrefix(text: string) {
  if (!text) return ''
  const t = text.toLowerCase()
  if (t.startsWith('@alsa ') || t.startsWith('@alvi ')) return text.slice(text.indexOf(' ') + 1)
  if (t.startsWith('@elvi ')) return text.slice(text.indexOf(' ') + 1)
  return text
}

function matchesSearch(entry: ChatEntry, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  // Date search: match YYYY-MM-DD
  if (query.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return entry.timestamp.startsWith(query)
  }
  // Keyword search
  return (
    entry.author.toLowerCase().includes(q) ||
    entry.text.toLowerCase().includes(q) ||
    entry.timestamp.toLowerCase().includes(q)
  )
}

const colors = {
  ryan:   { bg: '#1e3a5f', border: '#2d5a8a', text: '#c8deff' },
  alsa:   { bg: '#1a3d2e', border: '#2a6048', text: '#a0e8c0' },
  elvi:   { bg: '#2d1f4a', border: '#4a2f7a', text: '#d4b8ff' },
  system: { bg: '#1f2937', border: '#374151', text: '#9ca3af' },
}

export default function ChatPage() {
  const [allEntries, setAllEntries] = useState<ChatEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ChatEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultCount, setSearchResultCount] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalLoaded, setTotalLoaded] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<'loading'|'online'|'offline'>('loading')
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [sending, setSending] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Paginated view of current filtered set
  const pageCount = Math.ceil(filteredEntries.length / PAGE_SIZE)
  const pagedEntries = filteredEntries.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  )

  const fetchAll = useCallback(async () => {
    try {
      const [teamRes, commentsRes] = await Promise.all([
        fetch(TEAM_STATE_API),
        fetch(`${FORUM_API}/comments?post_id=${POST_ID}`)
      ])

      const teamData = await teamRes.json()
      const commentsData = await commentsRes.json()

      const entries: ChatEntry[] = []

      // From team-state (authoritative)
      if (teamData.state?.chat_history) {
        for (const e of teamData.state.chat_history) {
          entries.push({ author: e.author, text: e.text, timestamp: e.timestamp })
        }
      }

      // From Forum comments (Ryan/Alsa/Elvi messages not yet in team-state)
      const knownAuthors = ['Ryan', 'Alsa', 'Elvi']
      const seenKeys = new Set<string>()
      for (const e of entries) seenKeys.add(`${e.author}:${e.text}`)

      for (const c of (commentsData.comments || [])) {
        if (knownAuthors.includes(c.author)) {
          const key = `${c.author}:${c.text}`
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            entries.push({
              author: c.author,
              text: c.text,
              timestamp: fmtTime(c.created_at),
            })
          }
        }
      }

      // Sort by timestamp ascending
      entries.sort((a, b) => {
        try { return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() }
        catch { return 0 }
      })

      // Limit to MAX_TOTAL most recent
      const limited = entries.slice(-MAX_TOTAL)

      setAllEntries(limited)
      setTotalLoaded(entries.length)
      setHasMore(entries.length > MAX_TOTAL)
      setStatus('online')
      setLastUpdated(fmtHHMMSS())
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const t = setInterval(fetchAll, 2 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchAll])

  // Apply search filter
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setFilteredEntries(allEntries)
      setSearchMode(false)
      setSearchResultCount(null)
      setCurrentPage(0)
    } else {
      const results = allEntries.filter(e => matchesSearch(e, q))
      setFilteredEntries(results)
      setSearchMode(true)
      setSearchResultCount(results.length)
      setCurrentPage(0)
    }
  }, [searchQuery, allEntries])

  // Scroll to bottom when page changes
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [currentPage])

  const handleSearch = () => {
    const q = searchQuery.trim()
    if (!q) {
      setFilteredEntries(allEntries)
      setSearchMode(false)
      setSearchResultCount(null)
    }
  }

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  const loadMore = () => {
    // For future: load older entries from team-state
    // For now, just load next page of current filtered set
    if (currentPage < pageCount - 1) {
      setCurrentPage(p => p + 1)
    }
  }

  const loadOlder = () => {
    // Move to previous page (older messages = lower in list, so previous page)
    if (currentPage > 0) {
      setCurrentPage(p => p - 1)
      const el = chatRef.current
      if (el) el.scrollTop = 0
    }
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    const el = chatRef.current
    if (el) el.scrollTop = page === 0 ? el.scrollHeight : 0
  }

  const sendMsg = async () => {
    const text = inputRef.current?.value.trim()
    if (!text || sending) return
    if (inputRef.current) inputRef.current.value = ''

    setSending(true)
    try {
      const id = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
      const timestamp = nowGMT8()

      // 1. 即時寫入 team-state（第一優先）
      const newEntry: ChatEntry = { author: 'Ryan', text, timestamp }
      const updated = [...allEntries]
      const key = `Ryan:${text}`
      const exists = updated.some(e => `${e.author}:${e.text}` === key)
      if (!exists) updated.push(newEntry)

      const teamPayload = {
        state: { chat_history: updated.slice(-MAX_TOTAL), updated_at: new Date().toISOString() },
        updated_by: 'Ryan',
      }
      const teamRes = await fetch(TEAM_STATE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamPayload),
      })
      const teamData = await teamRes.json()

      // 2. 同時發 Forum Comments（非同步，不阻礙更新）
      fetch(`${FORUM_API}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, post_id: POST_ID, author: 'Ryan', role: '👤', avatar_class: 'ryan', text }),
      }).catch(() => {}) // non-blocking

      // 3. 樂觀更新 UI（立即顯示）
      if (!exists) {
        setAllEntries(prev => [...prev, newEntry])
      }
      setCurrentPage(999) // jump to last page to show new message

      // 4. 滾動到底
      setTimeout(() => {
        const el = chatRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)

      setSearchQuery('')
    } catch {
      setStatus('offline')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
  }

  const handleInput = () => {
    const el = inputRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
  }

  const bg = '#0b0f1a'
  const surface = '#111827'
  const surface2 = '#1f2937'
  const border = '#374151'

  return (
    <div style={{ minHeight: '100dvh', background: bg, color: '#e5e7eb', fontFamily: "'Segoe UI',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '18px' }}>💬</span>
        <span style={{ fontSize: '15px', fontWeight: 700 }}>🦞 Alsa × Elvi × Ryan</span>
        <span style={{ marginLeft: '4px', fontSize: '11px', color: '#9ca3af' }}>
          {searchMode ? `🔍 ${searchResultCount} 結果` : `${allEntries.length} / ${MAX_TOTAL} 筆`}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: status === 'online' ? '#10b981' : status === 'offline' ? '#ef4444' : '#6b7280', color: '#fff', fontWeight: 600 }}>
          {status === 'online' ? '🟢' : status === 'offline' ? '🔴' : '🔄'}
        </span>
        <button onClick={fetchAll} style={{ background: surface2, border: `1px solid ${border}`, color: '#e5e7eb', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>🔄</button>
      </header>

      {/* Search bar */}
      <div style={{ background: surface2, borderBottom: `1px solid ${border}`, padding: '8px 12px', display: 'flex', gap: '6px', flexShrink: 0 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKey}
          placeholder="搜尋關鍵字或日期（如 2026-03-23）"
          style={{ flex: 1, background: bg, color: '#e5e7eb', border: `1px solid ${border}`, borderRadius: '8px', padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
        />
        <button onClick={handleSearch} style={{ background: '#1e3a5f', color: '#c8deff', border: `1px solid #2d5a8a`, borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔍</button>
        {searchMode && (
          <button onClick={() => { setSearchQuery(''); setSearchMode(false); setSearchResultCount(null); setCurrentPage(0) }}
            style={{ background: '#374151', color: '#e5e7eb', border: `1px solid ${border}`, borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
            ✕ 清除
          </button>
        )}
      </div>

      {/* Pagination bar */}
      {!searchMode && allEntries.length > PAGE_SIZE && (
        <div style={{ background: surface2, borderBottom: `1px solid ${border}`, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, overflowX: 'auto', flexWrap: 'nowrap' }}>
          <button onClick={loadOlder} disabled={currentPage === 0}
            style={{ background: surface, border: `1px solid ${border}`, color: currentPage === 0 ? '#4b5563' : '#e5e7eb', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            ◀ 上一頁
          </button>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => {
              const start = Math.max(0, currentPage - 4)
              const page = start + i
              if (page >= pageCount) return null
              return (
                <button key={page} onClick={() => goToPage(page)}
                  style={{ background: page === currentPage ? '#1e3a5f' : surface, color: page === currentPage ? '#c8deff' : '#9ca3af', border: `1px solid ${page === currentPage ? '#2d5a8a' : border}`, borderRadius: '6px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer', minWidth: '32px' }}>
                  {page + 1}
                </button>
              )
            })}
            {pageCount > 10 && currentPage < pageCount - 5 && (
              <span style={{ color: '#6b7280', fontSize: '12px', padding: '0 4px' }}>...</span>
            )}
          </div>

          <button onClick={loadMore} disabled={currentPage >= pageCount - 1}
            style={{ background: surface, border: `1px solid ${border}`, color: currentPage >= pageCount - 1 ? '#4b5563' : '#e5e7eb', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: currentPage >= pageCount - 1 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            下一頁 ▶
          </button>

          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
            第 {currentPage + 1} / {pageCount} 頁 · {allEntries.length} 則
          </span>
        </div>
      )}

      {/* Chat messages */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'radial-gradient(ellipse at 50% 0%, #1a2235 0%, #0b0f1a 70%)' }}>
        {pagedEntries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '80px', fontSize: '14px' }}>
            {searchMode ? '找不到符合的對話' : '尚無訊息。開始對話吧！'}
          </div>
        )}
        {pagedEntries.map((entry, i) => {
          const globalIdx = currentPage * PAGE_SIZE + i
          const isRyan = entry.author === 'Ryan'
          const isAlsa = entry.author === 'Alsa'
          const isElvi = entry.author === 'Elvi'
          const c = isRyan ? colors.ryan : isAlsa ? colors.alsa : isElvi ? colors.elvi : colors.system
          const routeLabel = isRyan ? getRouteLabel(entry.text) : ''
          const displayText = isRyan ? stripPrefix(entry.text) : entry.text
          const isFirst = globalIdx === 0 || pagedEntries[globalIdx - 1]?.author !== entry.author

          return (
            <div key={globalIdx} style={{ display: 'flex', flexDirection: isRyan ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', marginTop: isFirst ? '10px' : '2px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                {isRyan ? '👤' : isAlsa ? '🦞' : isElvi ? '🐞' : '📋'}
              </div>
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isRyan ? 'flex-end' : 'flex-start', gap: '2px' }}>
                {isFirst && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexDirection: isRyan ? 'row-reverse' : 'row', padding: '0 4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '11px', color: c.text }}>{entry.author}</span>
                    {routeLabel && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 600 }}>{routeLabel}</span>}
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{entry.timestamp}</span>
                  </div>
                )}
                <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '7px 12px', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: c.text }}>
                  {escapeHtml(displayText)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '10px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '800px', margin: '0 auto' }}>
          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="說什麼... (@Alsa / @Elvi / 無人稱 = 兩者都說)"
            rows={1}
            style={{ flex: 1, background: bg, color: '#e5e7eb', border: `1px solid ${border}`, borderRadius: '10px', padding: '8px 12px', fontSize: '13px', fontFamily: 'inherit', resize: 'none', maxHeight: '120px', overflowY: 'auto', outline: 'none', lineHeight: 1.5 }}
          />
          <button onClick={sendMsg} disabled={sending}
            style={{ background: '#1e3a5f', color: '#c8deff', border: '1px solid #2d5a8a', borderRadius: '10px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit' }}>
            {sending ? '傳送中...' : '傳送'}
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '5px' }}>
          每 2 分鐘自動刷新 · 最後更新: {lastUpdated}
        </div>
      </div>
    </div>
  )
}
