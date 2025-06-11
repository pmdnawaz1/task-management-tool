import { createClient } from '@supabase/supabase-js'
import { env } from '~/env'

const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL

export const supabase = createClient(supabaseUrl, supabaseKey)

// Admin client for server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
