'use client'
import { useEffect, useRef, useState } from 'react'

const POST_ID = 'chat-alsa-elvi-001'
const API_BASE = 'https://alsa-forum.vercel.app/api'

function fmtTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtHHMMSS() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function escapeHtml(text: string) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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

interface Comment {
  id: string; post_id: string; author: string; role: string
  avatar_class: string; text: string; created_at: string
}

export default function ChatPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [status, setStatus] = useState<'loading'|'online'|'offline'>('loading')
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = async () => {
    try {
      const r = await fetch(`${API_BASE}/comments?post_id=${POST_ID}`)
      const d = await r.json()
      if (d.comments) {
        setComments(d.comments)
        setLastUpdated(fmtHHMMSS())
        setStatus('online')
      }
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => { fetchComments() }, [])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const t = setInterval(fetchComments, 2 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Scroll to bottom when comments change
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [comments])

  const sendMsg = async () => {
    const text = inputRef.current?.value.trim()
    if (!text || sending) return
    if (inputRef.current) inputRef.current.value = ''

    setSending(true)
    try {
      const id = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
      await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, post_id: POST_ID, author: 'Ryan', role: '👤', avatar_class: 'ryan', text })
      })
      await fetchComments()
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

  // Group consecutive messages
  const rows: Array<{ c: Comment; isHead: boolean; isTail: boolean }> = []
  comments.forEach((c, i) => {
    const prev = comments[i - 1]
    const next = comments[i + 1]
    rows.push({ c, isHead: !prev || prev.author !== c.author, isTail: !next || next.author !== c.author })
  })

  const bg = '#0b0f1a'
  const surface = '#111827'
  const surface2 = '#1f2937'
  const border = '#374151'
  const ryan = '#3b82f6'
  const alsa = '#22c55e'
  const elvi = '#a855f7'

  return (
    <div style={{ minHeight: '100dvh', background: bg, color: '#e5e7eb', fontFamily: "'Segoe UI',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span style={{ fontSize: '16px', fontWeight: 700 }}>🦞 Alsa × Elvi × Ryan 專屬聊天室</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: status === 'online' ? '#10b981' : status === 'offline' ? '#ef4444' : '#6b7280', color: '#fff', fontWeight: 600 }}>
          {status === 'online' ? '🟢 在線' : status === 'offline' ? '🔴 離線' : '🔄 連線中'}
        </span>
        <button onClick={fetchComments} style={{ background: surface2, border: `1px solid ${border}`, color: '#e5e7eb', fontSize: '12px', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          🔄 強制刷新
        </button>
      </header>

      {/* Chat messages */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'radial-gradient(ellipse at 50% 0%, #1a2235 0%, #0b0f1a 70%)' }}>
        {rows.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '80px', fontSize: '14px' }}>
            尚無訊息。開始對話吧！
          </div>
        )}
        {rows.map(({ c, isHead, isTail }) => {
          if (c.author === '__TEAM_STATE__') {
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '10px', opacity: 0.75 }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>📋</div>
                <div style={{ maxWidth: '72%' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#9ca3af' }}>Compaction</span>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{fmtTime(c.created_at)}</span>
                  </div>
                  <div style={{ background: surface2, color: '#9ca3af', fontStyle: 'italic', borderRadius: '12px', border: '1px dashed #4b5563', padding: '8px 14px', fontSize: '12px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {c.text}
                  </div>
                </div>
              </div>
            )
          }

          const isRyan = c.author === 'Ryan'
          const isAlsa = c.author === 'Alsa'
          const isElvi = c.author === 'Elvi'
          const routeLabel = isRyan ? getRouteLabel(c.text) : ''
          const displayText = isRyan ? stripPrefix(c.text) : c.text

          const avatarBg = isRyan ? ryan : isAlsa ? '#15803d' : isElvi ? '#7e22ce' : '#4b5563'
          const avatarEmoji = isRyan ? '👤' : isAlsa ? '🦞' : isElvi ? '🐞' : '👤'
          const bubbleBg = isRyan ? (isHead && isTail ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : ryan)
            : isAlsa ? (isHead && isTail ? 'linear-gradient(135deg,#166534,#15803d)' : alsa)
            : isElvi ? (isHead && isTail ? 'linear-gradient(135deg,#6b21a8,#7e22ce)' : elvi)
            : surface2

          let bubbleRadius = '16px'
          if (isRyan) {
            if (isHead && isTail) bubbleRadius = '16px'
            else if (isHead) bubbleRadius = '16px 16px 4px 16px'
            else bubbleRadius = '4px 16px 16px 16px'
          } else {
            if (isHead && isTail) bubbleRadius = '16px'
            else if (isHead) bubbleRadius = '16px 16px 16px 4px'
            else bubbleRadius = '16px 4px 16px 16px'
          }

          const bubbleColor = '#fff'
          const avatarBorder = isRyan ? '#60a5fa' : isAlsa ? '#4ade80' : isElvi ? '#c084fc' : 'transparent'

          return (
            <div key={c.id} style={{ display: 'flex', flexDirection: isRyan ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px', marginTop: isHead ? '12px' : '2px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarBg, border: `2px solid ${avatarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
                {avatarEmoji}
              </div>
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isRyan ? 'flex-end' : 'flex-start', gap: '2px' }}>
                {isHead && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexDirection: isRyan ? 'row-reverse' : 'row', padding: '0 4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px' }}>{c.author}</span>
                    {routeLabel && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: 600 }}>{routeLabel}</span>}
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{fmtTime(c.created_at)}</span>
                  </div>
                )}
                <div style={{ background: bubbleBg, color: bubbleColor, borderRadius: bubbleRadius, padding: '8px 14px', fontSize: '14px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {displayText}
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
            style={{ background: ryan, color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 22px', fontSize: '14px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit', transition: 'opacity 0.15s, transform 0.1s' }}
          >
            {sending ? '傳送中...' : '傳送'}
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '6px', maxWidth: '800px', margin: '6px auto 0' }}>
          每 2 分鐘自動刷新 · <span id="lastUpdated">最後更新: {lastUpdated}</span>
        </div>
      </div>
    </div>
  )
}
