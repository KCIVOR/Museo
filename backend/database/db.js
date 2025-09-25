import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Admin client (service role) for server-side database operations without RLS
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

export default supabase