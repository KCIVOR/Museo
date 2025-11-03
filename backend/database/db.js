import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// SINGLETON: Admin client (service role) for server-side database operations without RLS
// This should be the ONLY instance used across all controllers!
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export function createAuthClient(initialAccessToken) {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: initialAccessToken
        ? { headers: { Authorization: `Bearer ${initialAccessToken}` } }
        : undefined,
    }
  )
  return client
}

// Export as both default and named for compatibility
export default supabase
export { supabase }