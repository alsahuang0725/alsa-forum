import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/agent-status — 讀取所有 agent 狀態
export async function GET() {
  const { data, error } = await supabase
    .from('agent_status')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 組合成方便閱讀的格式
  const agents: Record<string, unknown> = {}
  for (const row of (data ?? [])) {
    agents[row.agent_id] = { ...row.data, updated_at: row.updated_at }
  }

  return NextResponse.json({
    version: 1,
    updated: new Date().toISOString(),
    agents
  })
}

// POST /api/agent-status — 更新某個 agent 的狀態
// Body: { "agent_id": "elvi", "data": { "status": "online", "task": "...", "result": "", "blockers": [] } }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agent_id, data } = body

  if (!agent_id || !data) {
    return NextResponse.json({ error: 'agent_id and data are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('agent_status')
    .upsert({
      agent_id,
      data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'agent_id'
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, agent_id, data }, { status: 200 })
}
