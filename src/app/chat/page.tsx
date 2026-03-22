'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

const POST_ID = 'chat-alsa-elvi-001'
const FORUM_API = 'https://alsa-forum.vercel.app/api'
const TEAM_STATE_API = `${FORUM_API}/team-state`

interface ChatEntry {
  author: string
  text: string
  timestamp: string
}

interface CommentEntry {
  id: string
  author: string
  text: string
  created_at: string
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
  if (text.startsWith('@Alsa ')) return 'Ryan→Alsa'
  if (text.startsWith('@Elvi ')) return 'Ryan→Elvi'
  return 'Ryan→All'
}

function stripPrefix(text: string) {
  if (!text) return ''
  if (text.startsWith('@Alsa ')) return text.slice(6)
  if (text.startsWith('@Elvi ')) return text.slice(6)
  return text
}

// Matte dark color palette (eye-friendly)
const colors = {
  ryan: { bg: '#1e3a5f', border: '#2d5a8a', text: '#c8deff' },
  alsa: { bg: '#1a3d2e', border: '#2a6048', text: '#a0e8c0' },
  elvi: { bg: '#2d1f4a', border: '#4a2f7a', text: '#d4b8ff' },
  system: { bg: '#1f2937', border: '#374151', text: '#9ca3af' },
}

export default function ChatPage() {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([])
  const [comments, setComments] = useState<CommentEntry[]>([])
  const [status, setStatus] = useState<'loading'|'online'|'offline'>('loading')
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchRef = useRef<number>(0)

  const fetchAll = useCallback(async () => {
    try {
      // Fetch both sources in parallel
      const [teamRes, commentsRes] = await Promise.all([
        fetch(TEAM_STATE_API),
        fetch(`${FORUM_API}/comments?post_id=${POST_ID}`)
      ])

      const teamData = await teamRes.json()
      const commentsData = await commentsRes.json()

      // Build chat entries from team-state (authoritative source)
      const teamEntries: ChatEntry[] = []
      if (teamData.state?.chat_history) {
        for (const entry of teamData.state.chat_history) {
          teamEntries.push({
            author: entry.author,
            text: entry.text,
            timestamp: entry.timestamp,
          })
        }
      }

      // Also add comments from Forum that are from Ryan/Alsa/Elvi (real-time messages)
      const forumEntries: ChatEntry[] = []
      const knownAuthors = ['Ryan', 'Alsa', 'Elvi']
      const seen = new Set<string>()
      for (const c of (commentsData.comments || [])) {
        if (knownAuthors.includes(c.author)) {
          // Deduplicate by text+author+time
          const key = `${c.author}:${c.text}:${c.created_at}`
          if (!seen.has(key)) {
            seen.add(key)
            forumEntries.push({
              author: c.author,
              text: c.text,
              timestamp: fmtTime(c.created_at),
            })
          }
        }
      }

      // Merge: team-state entries first (authoritative), then forum-only entries
      // Deduplicate by author+text
      const allEntries: ChatEntry[] = [...teamEntries]
      for (const fe of forumEntries) {
        const key = `${fe.author}:${fe.text}`
        if (!teamEntries.some(e => `${e.author}:${e.text}` === key)) {
          allEntries.push(fe)
        }
      }

      // Sort by timestamp
      allEntries.sort((a, b) => {
        try { return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() } catch { return 0 }
      })

      setChatHistory(allEntries)
      setComments(commentsData.comments || [])
      setLastUpdated(fmtHHMMSS())
      setStatus('online')
      lastFetchRef.current = Date.now()
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

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatHistory])

  const sendMsg = async () => {
    const text = inputRef.current?.value.trim()
    if (!text || sending) return
    if (inputRef.current) inputRef.current.value = ''

    setSending(true)
    try {
      const id = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)

      // 1. Post to Forum Comments
      await fetch(`${FORUM_API}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          post_id: POST_ID,
          author: 'Ryan',
          role: '👤',
          avatar_class: 'ryan',
          text,
        }),
      })

      // 2. Update team-state with new chat entry
      const newEntry: ChatEntry = {
        author: 'Ryan',
        text,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' GMT+8',
      }

      const currentEntries = [...chatHistory]
      // Don't duplicate if already in history
      const key = `Ryan:${text}`
      if (!currentEntries.some(e => `${e.author}:${e.text}` === key)) {
        currentEntries.push(newEntry)
      }

      const statePayload = {
        chat_history: currentEntries,
        updated_at: new Date().toISOString(),
      }

      await fetch(TEAM_STATE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: statePayload, updated_by: 'Ryan' }),
      })

      await fetchAll()
    } catch {
      setStatus('offline')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMsg()
    }
  }

  const handleInput = () => {
    const el = inputRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }

  const bg = '#0b0f1a'
  const surface = '#111827'
  const border = '#374151'

  // Render all entries
  const entries = chatHistory

  return (
    <div style={{ minHeight: '100dvh', background: bg, color: '#e5e7eb', fontFamily: "'Segoe UI',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span style={{ fontSize: '16px', fontWeight: 700 }}>🦞 Alsa × Elvi × Ryan 專屬聊天室</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: status === 'online' ? '#10b981' : status === 'offline' ? '#ef4444' : '#6b7280', color: '#fff', fontWeight: 600 }}>
          {status === 'online' ? '🟢 在線' : status === 'offline' ? '🔴 離線' : '🔄 連線中'}
        </span>
        <button onClick={fetchAll} style={{ background: '#1f2937', border: `1px solid ${border}`, color: '#e5e7eb', fontSize: '12px', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          🔄 強制刷新
        </button>
      </header>

      {/* Chat messages */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'radial-gradient(ellipse at 50% 0%, #1a2235 0%, #0b0f1a 70%)' }}>
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '80px', fontSize: '14px' }}>
            尚無訊息。開始對話吧！
          </div>
        )}
        {entries.map((entry, i) => {
          const isRyan = entry.author === 'Ryan'
          const isAlsa = entry.author === 'Alsa'
          const isElvi = entry.author === 'Elvi'
          const c = isRyan ? colors.ryan : isAlsa ? colors.alsa : isElvi ? colors.elvi : colors.system
          const routeLabel = isRyan ? getRouteLabel(entry.text) : ''
          const displayText = isRyan ? stripPrefix(entry.text) : entry.text

          return (
            <div key={i} style={{ display: 'flex', flexDirection: isRyan ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', marginTop: i === 0 || entries[i-1]?.author !== entry.author ? '10px' : '2px' }}>
              {/* Avatar */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: c.bg, border: `2px solid ${c.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', flexShrink: 0,
              }}>
                {isRyan ? '👤' : isAlsa ? '🦞' : isElvi ? '🐞' : '📋'}
              </div>

              {/* Content */}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isRyan ? 'flex-end' : 'flex-start', gap: '2px' }}>
                {/* Meta row */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexDirection: isRyan ? 'row-reverse' : 'row', padding: '0 4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', color: c.text }}>{entry.author}</span>
                  {routeLabel && (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 600 }}>{routeLabel}</span>
                  )}
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>{entry.timestamp}</span>
                </div>
                {/* Bubble */}
                <div style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: c.text,
                  maxWidth: '100%',
                }}>
                  {escapeHtml(displayText)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '800px', margin: '0 auto' }}>
          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="說什麼... (@Alsa / @Elvi / 無人稱 = 兩者都說)"
            rows={1}
            style={{ flex: 1, background: bg, color: '#e5e7eb', border: `1px solid ${border}`, borderRadius: '12px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', resize: 'none', maxHeight: '120px', overflowY: 'auto', outline: 'none', transition: 'border-color 0.15s', lineHeight: 1.5 }}
          />
          <button
            onClick={sendMsg}
            disabled={sending}
            style={{ background: '#1e3a5f', color: '#c8deff', border: '1px solid #2d5a8a', borderRadius: '12px', padding: '10px 22px', fontSize: '14px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {sending ? '傳送中...' : '傳送'}
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '6px', maxWidth: '800px', margin: '6px auto 0' }}>
          每 2 分鐘自動刷新 · <span>最後更新: {lastUpdated}</span>
        </div>
      </div>
    </div>
  )
}
