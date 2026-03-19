import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/votes?post_id=xxx&week_start=2026-03-16&user_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('post_id')
  const weekStart = searchParams.get('week_start')
  const userId = searchParams.get('user_id')

  if (!postId || !weekStart) {
    return NextResponse.json({ error: 'post_id and week_start required' }, { status: 400 })
  }

  // Get total votes for this post this week
  const { count } = await supabase
    .from('weekly_votes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('week_start', weekStart)

  // Check if current user voted
  let userVoted = false
  if (userId) {
    const { data } = await supabase
      .from('weekly_votes')
      .select('id')
      .eq('post_id', postId)
      .eq('week_start', weekStart)
      .eq('user_id', userId)
      .single()
    userVoted = !!data
  }

  return NextResponse.json({ count: count || 0, voted: userVoted })
}

// POST /api/votes { post_id, week_start, user_id }
// Toggle vote — if already voted, remove it
export async function POST(req: NextRequest) {
  const { post_id, week_start, user_id } = await req.json()

  if (!post_id || !week_start || !user_id) {
    return NextResponse.json({ error: 'post_id, week_start, and user_id required' }, { status: 400 })
  }

  // Check if already voted
  const { data: existing } = await supabase
    .from('weekly_votes')
    .select('id')
    .eq('post_id', post_id)
    .eq('week_start', week_start)
    .eq('user_id', user_id)
    .single()

  let voted: boolean

  if (existing) {
    // Remove vote
    await supabase.from('weekly_votes').delete().eq('id', existing.id)
    voted = false
  } else {
    // Add vote
    await supabase.from('weekly_votes').insert({
      post_id,
      week_start,
      user_id,
    })
    voted = true
  }

  // Get updated count
  const { count } = await supabase
    .from('weekly_votes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', post_id)
    .eq('week_start', week_start)

  return NextResponse.json({ voted, count: count || 0 })
}
