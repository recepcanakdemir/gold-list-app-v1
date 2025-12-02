import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { PersistProvider } from '../lib/query-client'
import { TimeProvider } from '../lib/time-provider'
import { supabase } from '../lib/supabase'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      // Redirect to tabs if authenticated and in auth group
      router.replace('/(tabs)')
    }
  }, [session, segments, isLoading, router])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <PersistProvider>
      <TimeProvider>
        <AuthGuard>
          <Stack 
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right', // iOS style sliding
              animationDuration: 200, // Slightly faster feels snappier
              gestureEnabled: true, // Critical: Allow swipe-back gesture
              gestureDirection: 'horizontal',
            }}
          >
            <Stack.Screen 
              name="(tabs)" 
              options={{ animation: 'fade' }} 
            />
            <Stack.Screen 
              name="notebook/[id]" 
              options={({ route }: any) => ({
                animation: 'slide_from_right', 
                gestureEnabled: true,
                title: route.params?.notebookName || 'Notebook'
              })} 
            />
            <Stack.Screen 
              name="(auth)/login" 
              options={{ 
                animation: 'fade', 
                gestureEnabled: false 
              }} 
            />
          </Stack>
        </AuthGuard>
      </TimeProvider>
    </PersistProvider>
  )
}