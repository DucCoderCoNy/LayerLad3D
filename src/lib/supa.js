import { createClient } from '@supabase/supabase-js'
const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supa = URL && KEY ? createClient(URL, KEY) : null
/** Bật bằng VITE_RELATIONAL=true SAU KHI đã chạy supabase/migrations 001 + 002. Tắt = web chạy bằng bảng `records` như cũ. */
export const REL = !!supa && import.meta.env.VITE_RELATIONAL === 'true'
