import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('post_id')

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ comments: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      id: body.id,
      post_id: body.post_id,
      author: body.author,
      role: body.role || '',
      avatar_class: body.avatar_class || 'generic',
      text: body.text,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update comments_count on post
  try {
    await supabase.rpc('increment_comments_count', { pid: body.post_id })
  } catch {}

  // Update user score (posts give 10 pts)
  try {
    const authorId = `user-${body.author.toLowerCase()}`
    await supabase.rpc('increment_score', { uid: authorId, delta: 2 })
  } catch {}

  // Update interaction_score via dedicated RPC (comments give +5)
  try {
    const authorId = `user-${body.author.toLowerCase()}`
    await supabase.rpc('add_comment_score', { uid: authorId })
  } catch {}

  return NextResponse.json({ comment: data }, { status: 201 })
}
