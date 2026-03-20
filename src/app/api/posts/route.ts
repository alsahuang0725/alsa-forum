import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'latest'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order(sort === 'hot'
      ? 'likes_count'
      : sort === 'comments'
      ? 'comments_count'
      : 'created_at',
      { ascending: false }
    )
    .range(from, to)

  if (category && category !== '全部') {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter by search
  let posts = data || []
  if (search) {
    const q = search.toLowerCase()
    posts = posts.filter(
      p => p.title.toLowerCase().includes(q) ||
           p.body.toLowerCase().includes(q) ||
           p.author.toLowerCase().includes(q)
    )
  }

  return NextResponse.json({
    posts,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    }
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabase
    .from('posts')
    .insert({
      id: body.id,
      title: body.title,
      body: body.body,
      author: body.author,
      role: body.role || '',
      avatar_class: body.avatar_class || 'generic',
      category: body.category || '技術',
      tags: body.tags || [],
      is_for_ryan: body.is_for_ryan || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update user score
  try {
    const authorId = `user-${body.author.toLowerCase()}`
    await supabase.rpc('increment_score', { uid: authorId, delta: 10 })
  } catch {}

  return NextResponse.json({ post: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('post_id')

  if (!postId) {
    return NextResponse.json({ error: 'post_id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
