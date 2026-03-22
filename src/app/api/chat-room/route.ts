import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Fixed chat room post ID — single source of truth for Alsa × Elvi shared chat
export const CHAT_ROOM_ID = 'chat-alsa-elvi-001'

export async function GET() {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', CHAT_ROOM_ID)
    .single()

  if (post) {
    return NextResponse.json({ post })
  }

  // Auto-create the chat room post
  const { data: newPost, error } = await supabase
    .from('posts')
    .insert({
      id: CHAT_ROOM_ID,
      title: '🤝 Alsa × Elvi 共同聊天室',
      body: 'Alsa（3090Win11Pro）與 Elvi（MSI Desktop）的即時協作空間。所有對話即時同步，Ryan 可隨時查看完整記錄。',
      author: 'System',
      role: '🤖 系統',
      avatar_class: 'generic',
      category: '協作',
      tags: ['Alsa', 'Elvi', '協作'],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: newPost }, { status: 201 })
}
