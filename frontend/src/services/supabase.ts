import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://sigfhadnudkminxlkvhh.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Checks if current window location has recovery tokens or parameters
 */
export function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  const search = window.location.search
  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    hash.includes('access_token=') && hash.includes('recovery') ||
    search.includes('code=')
  )
}

/**
 * Extracts recovery access token from the URL hash if present
 */
export function getRecoveryTokenFromUrl(): { access_token: string | null; refresh_token: string | null } {
  if (typeof window === 'undefined') return { access_token: null, refresh_token: null }
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  }
}
