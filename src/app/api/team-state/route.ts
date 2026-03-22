import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Fixed post ID for team shared state
export const TEAM_STATE_POST_ID = 'team-session-state-001'

// GET /api/team-state
export async function GET() {
  const { data: post } = await supabase
    .from('posts')
    .select('body, created_at')
    .eq('id', TEAM_STATE_POST_ID)
    .single()

  if (!post) {
    return NextResponse.json({ state: {}, updated_by: null, updated_at: null })
  }

  let parsed = { state: {}, updated_by: null }
  try {
    parsed = JSON.parse(post.body)
  } catch {}

  return NextResponse.json({
    state: parsed.state || {},
    updated_by: parsed.updated_by || null,
    updated_at: post.created_at,
  })
}

// POST /api/team-state
// Body: { state: {...}, updated_by: "Alsa" }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { state, updated_by } = body

  if (!state || !updated_by) {
    return NextResponse.json({ error: 'state and updated_by required' }, { status: 400 })
  }

  const payload = JSON.stringify({ state, updated_by, updated_at: new Date().toISOString() })
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('id', TEAM_STATE_POST_ID)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('posts')
      .update({ body: payload })
      .eq('id', TEAM_STATE_POST_ID)
      .select('created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated_at: data.created_at })
  } else {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        id: TEAM_STATE_POST_ID,
        title: '🤖 Team Session State — Alsa × Elvi',
        body: payload,
        author: 'System',
        role: '🤖 系統',
        avatar_class: 'generic',
        category: '協作',
        tags: ['team-state', 'Alsa', 'Elvi'],
      })
      .select('created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated_at: data.created_at })
  }
}
