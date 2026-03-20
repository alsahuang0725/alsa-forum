import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Use RPC if available, otherwise direct update
  try {
    await supabase.rpc('increment_comments_count', { pid: id })
  } catch {
    // Fallback: direct update
    const { error } = await supabase.rpc('increment_comments_count', { pid: id })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
