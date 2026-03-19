// Supabase client — server-side only
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabase
}

// Alias for convenience
export const supabase = typeof window === 'undefined' ? getSupabase() : null as unknown as SupabaseClient

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Post {
  id: string
  title: string
  body: string
  author: string
  role: string
  avatar_class: string
  category: string
  tags: string[]
  likes_count: number
  comments_count: number
  is_for_ryan: boolean
  attachments: string[]
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  author: string
  role: string
  avatar_class: string
  text: string
  created_at: string
}

export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Bookmark {
  user_id: string
  post_id: string
  created_at: string
}

export interface User {
  user_id: string
  name: string
  role: string
  avatar_class: string
  score: number
  updated_at: string
}
