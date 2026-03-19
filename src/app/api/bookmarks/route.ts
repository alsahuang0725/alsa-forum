import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookmarks: data || [] })
}

export async function POST(req: NextRequest) {
  const { post_id, user_id } = await req.json()

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('post_id', post_id)
    .eq('user_id', user_id)
    .single()

  if (existing) {
    await supabase
      .from('bookmarks')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', user_id)
    return NextResponse.json({ bookmarked: false })
  } else {
    await supabase
      .from('bookmarks')
      .insert({ post_id, user_id })
    return NextResponse.json({ bookmarked: true })
  }
}
