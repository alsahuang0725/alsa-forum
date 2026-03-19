import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { post_id, user_id } = await req.json()

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', post_id)
    .eq('user_id', user_id)
    .single()

  if (existing) {
    // Unlike
    await supabase.from('likes').delete().eq('id', existing.id)
    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id)

    await supabase
      .from('posts')
      .update({ likes_count: count || 0 })
      .eq('id', post_id)

    return NextResponse.json({ liked: false, count: count || 0 })
  } else {
    // Like
    await supabase
      .from('likes')
      .insert({ post_id, user_id })

    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id)

    await supabase
      .from('posts')
      .update({ likes_count: count || 0 })
      .eq('id', post_id)

    return NextResponse.json({ liked: true, count: count || 0 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('post_id')
  const userId = searchParams.get('user_id')

  const { count } = await supabase
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)

  const { data: liked } = userId
    ? await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).single()
    : { data: null }

  return NextResponse.json({ count: count || 0, liked: !!liked })
}
