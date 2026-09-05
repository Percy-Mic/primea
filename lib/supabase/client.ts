import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = 'https://znxaurlyjgyklqtjjivu.supabase.co'
  const supabaseAnonKey = 'sb_publishable_tSdZdaLzS5BbaIrcB6jiEA_DCQS-X7n'

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}