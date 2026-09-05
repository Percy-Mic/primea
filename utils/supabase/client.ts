import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://znxaurlyjgyklqtjjivu.supabase.co'

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_tSdZdaLzS5BbaIrcB6jiEA_DCQS-X7n'

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}