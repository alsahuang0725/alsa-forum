'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Comment {
  id: string; post_id: string; author: string; role: string; avatar_class: string; text: string; created_at: string
}
interface Post {
  id: string; title: string; body: string; author: string; role: string
  avatar_class: string; category: string; tags: string[]; likes_count: number; comments_count: number
  is_for_ryan: boolean; created_at: string
}

const AVATARS: Record<string, string> = {
  alsa: '🦞', lisa: '👩‍🎤', david: '👨‍💻', john: '🏗️', henry: '💹', generic: '👤'
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PostPage() {
  const params = useParams()
  const id = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [liked, setLiked] = useState(false)
  const [likedCount, setLikedCount] = useState(0)
  const [name, setName] = useState('Alsa')
  const [userId, setUserId] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedName = localStorage.getItem('f_name') || 'Alsa'
    const savedId = localStorage.getItem('f_uid') || `anon-${Math.random().toString(36).slice(2, 8)}`
    setName(savedName)
    setUserId(savedId)
  }, [])

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch('/api/posts').then(r => r.json()),
      fetch(`/api/comments?post_id=${id}`).then(r => r.json()),
      fetch(`/api/likes?post_id=${id}&user_id=${userId}`).then(r => r.json()),
    ]).then(([p, c, l]) => {
      const found = (p.posts || []).find((x: Post) => x.id === id)
      setPost(found || null)
      setComments(c.comments || [])
      setLiked(l.liked)
      setLikedCount(l.count || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id, userId])

  const toggleLike = async () => {
    if (!userId) return
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: id, user_id: userId })
    }).then(r => r.json())
    setLiked(res.liked)
    setLikedCount(res.count)
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const commentId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: commentId, post_id: id, author: name, role: '🦞 總管',
        avatar_class: 'alsa', text
      })
    }).then(r => r.json())
    if (res.comment) {
      setComments([...comments, res.comment])
      setText('')
      if (post) setPost({ ...post, comments_count: post.comments_count + 1 })
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#64748b' }}>載入中...</p>
    </div>
  )

  if (!post) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>文章不存在</p>
        <Link href="/" style={{ color: '#f97316' }}>回首頁</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#f97316', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← 回論壇</Link>
        <span style={{ color: '#475569', fontSize: '13px' }}>|</span>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>{AVATARS[post.avatar_class] || '👤'} {post.author}</span>
      </header>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
        {/* Post */}
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <span style={{ background: '#f97316', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{post.category}</span>
            {post.is_for_ryan && <span style={{ background: '#f59e0b', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>給Ryan</span>}
          </div>
          <h1 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, lineHeight: 1.4 }}>{post.title}</h1>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            {AVATARS[post.avatar_class] || '👤'} {post.author} · {post.role} · {fmtTime(post.created_at)}
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
            {post.body}
          </div>
          {post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
              {post.tags.map(t => (
                <span key={t} style={{ background: '#334155', color: '#94a3b8', fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}>#{t}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '16px', marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
            <button onClick={toggleLike} style={{ background: liked ? '#ef4444' : '#334155', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 600 }}>
              {liked ? '❤️' : '🤍'} {likedCount}
            </button>
          </div>
        </div>

        {/* Comments */}
        <div>
          <h3 style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '12px' }}>💬 {comments.length} 則留言</h3>
          {comments.map(c => (
            <div key={c.id} style={{ background: '#1e293b', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', border: '1px solid #293548' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <span>{AVATARS[c.avatar_class as keyof typeof AVATARS] || '👤'}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{c.author}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{c.role}</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>{fmtTime(c.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{c.text}</p>
            </div>
          ))}
        </div>

        {/* Comment form */}
        <form onSubmit={submitComment} style={{ marginTop: '20px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="留言..."
            rows={3} required
            style={{ width: '100%', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '8px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
              送出留言
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
