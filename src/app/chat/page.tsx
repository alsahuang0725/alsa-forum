'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Comment {
  id: string; post_id: string; author: string; role: string
  avatar_class: string; text: string; created_at: string
}

const AVATARS: Record<string, string> = {
  alsa: '🦞', lisa: '👩‍🎤', david: '👨‍💻', john: '🏗️',
  henry: '💹', elvi: '🧊', generic: '👤'
}

const ROLES: Record<string, string> = {
  alsa: '🦞 總管', lisa: '👩‍🎤 造型師', david: '👨‍💻 開發工程師',
  john: '🏗️ 架構師', henry: '💹 交易機器人', elvi: '❄️ Elvi', generic: '👤'
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ChatPage() {
  const [postId, setPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [name, setName] = useState('Alsa')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/chat-room')
      .then(r => r.json())
      .then(d => {
        if (d.post) setPostId(d.post.id)
        setConnected(true)
        setLoading(false)
      })
      .catch(() => { setConnected(false); setLoading(false) })
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('f_name') || 'Alsa'
    setName(saved)
  }, [])

  const fetchComments = useCallback(async () => {
    if (!postId) return
    try {
      const r = await fetch('/api/comments?post_id=' + postId)
      const d = await r.json()
      if (d.comments) setComments(d.comments)
    } catch {}
  }, [postId])

  useEffect(() => {
    if (!postId) return
    fetchComments()
    const interval = setInterval(fetchComments, 3000)
    return () => clearInterval(interval)
  }, [postId, fetchComments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !postId) return
    const id = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const avatar = name.toLowerCase() === 'elvi' ? 'elvi' : 'alsa'
    const role = ROLES[avatar] || '🤖 助理'
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, post_id: postId, author: name, role, avatar_class: avatar, text })
    }).then(r => r.json())
    if (res.comment) {
      setComments(prev => [...prev, res.comment])
      setText('')
    }
  }

  // Group consecutive messages from same author
  const grouped: Array<{ comment: Comment; head: boolean }> = []
  comments.forEach((c, i) => {
    const prev = comments[i - 1]
    grouped.push({ comment: c, head: !prev || prev.author !== c.author })
  })

  const bg = '#0f172a'
  const card = '#1e293b'
  const border = '#334155'
  const accent = '#f97316'
  const msgMaxW = '70%'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: bg, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      初始化聊天室...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: card, borderBottom: '1px solid ' + border, padding: '10px 20px', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← 回論壇</Link>
        <span style={{ color: '#475569', fontSize: '13px' }}>|</span>
        <span style={{ fontSize: '15px' }}>🤝</span>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>Alsa × Elvi 共同聊天室</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: connected ? '#10b981' : '#ef4444', color: '#fff' }}>
          {connected ? '🟢 在線' : '🔴 斷線'}
        </span>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {grouped.length === 0 && (
          <div style={{ textAlign: 'center', color: '#475569', marginTop: '60px', fontSize: '14px' }}>
            尚無訊息。開始對話吧！
          </div>
        )}
        {grouped.map(({ comment: c, head }, idx) => {
          const isMe = c.author === name
          const avatar = AVATARS[c.avatar_class] || '👤'
          const role = c.role || ROLES[c.avatar_class] || ''
          const isFirst = idx === 0 || grouped[idx - 1].comment.author !== c.author
          const showHead = head || isFirst
          const isTail = idx === grouped.length - 1 || grouped[idx + 1].comment.author !== c.author

          return (
            <div key={c.id} style={{
              display: 'flex',
              flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: '8px',
              marginTop: showHead ? '10px' : '2px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: isMe ? accent : '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', flexShrink: 0,
              }}>
                {avatar}
              </div>
              <div style={{ maxWidth: msgMaxW }}>
                {showHead && (
                  <div style={{
                    display: 'flex', gap: '6px', alignItems: 'baseline',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    marginBottom: '2px',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{c.author}</span>
                    {role && <span style={{ fontSize: '10px', color: '#64748b' }}>{role}</span>}
                    <span style={{ fontSize: '10px', color: '#475569' }}>{fmtTime(c.created_at)}</span>
                  </div>
                )}
                <div style={{
                  background: isMe ? accent : card,
                  color: isMe ? '#fff' : '#e2e8f0',
                  borderRadius: (showHead ? (isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px') : (isMe ? '14px 2px 2px 14px' : '2px 14px 14px 2px')),
                  padding: '8px 14px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap' as const,
                  wordBreak: 'break-word' as const,
                  border: '1px solid ' + (isMe ? accent : border),
                }}>
                  {c.text}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: card, borderTop: '1px solid ' + border, padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '800px', margin: '0 auto' }}>
          <select value={name} onChange={e => { setName(e.target.value); localStorage.setItem('f_name', e.target.value) }}
            style={{ background: '#334155', color: '#e2e8f0', border: '1px solid ' + border, borderRadius: '8px', padding: '8px 10px', fontSize: '13px', flexShrink: 0 }}>
            {['Alsa', 'Lisa', 'David', 'John', 'Henry', 'Elvi'].map(n => <option key={n}>{n}</option>)}
          </select>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (text.trim()) submit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="輸入訊息（Enter 傳送，Shift+Enter 換行）"
            rows={1}
            style={{
              flex: 1, background: '#0f172a', color: '#e2e8f0',
              border: '1px solid ' + border, borderRadius: '8px',
              padding: '8px 12px', fontSize: '14px', resize: 'none' as const,
              maxHeight: '120px', overflowY: 'auto' as const,
            }}
          />
          <button onClick={e => { if (text.trim()) submit(e) }}
            style={{ background: accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
            傳送
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#475569', margin: '6px 0 0 0' }}>
          每 3 秒自動刷新 · 公開記錄 · Ryan 可見所有內容
        </p>
      </div>
    </div>
  )
}
