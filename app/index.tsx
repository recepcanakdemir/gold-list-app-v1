import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function RootIndex() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/login')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Return empty view while checking auth and redirecting
  return <View style={{ flex: 1 }} />
}