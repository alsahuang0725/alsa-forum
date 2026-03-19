import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    // Return all users sorted by score
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('score', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data })
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabase
    .from('users')
    .upsert({
      user_id: body.user_id,
      name: body.name,
      role: body.role || '',
      avatar_class: body.avatar_class || 'generic',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data }, { status: 201 })
}
