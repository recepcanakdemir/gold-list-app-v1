import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://frpsqimbseadyxkghnpj.supabase.co'
const supabaseAnonKey = 'sb_publishable_sFzWk4yjC2awi_x3ejgXdw_kQv_CxAz'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})