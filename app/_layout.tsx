import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { PersistProvider } from '../lib/query-client'
import { TimeProvider } from '../lib/time-provider'
import { SubscriptionProvider, useSubscription } from '../lib/revenuecat'
import { OnboardingProvider, useOnboarding } from '../lib/onboarding-context'
import { supabase } from '../lib/supabase'
import { initializeNotifications } from '../lib/notifications'

function InitializationGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const { hasSeenOnboarding, isLoading: onboardingLoading } = useOnboarding()
  const { isProUser, subscriptionStatus } = useSubscription()
  const router = useRouter()
  const segments = useSegments()
  
  // Overall loading state - wait for both session and onboarding to load
  const isLoading = sessionLoading || onboardingLoading

  // Remove onboarding AsyncStorage logic - now handled by OnboardingContext

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      
      // Initialize notifications when user signs in
      if (session) {
        initializeNotifications().catch(err => 
          console.warn('Failed to initialize notifications:', err)
        )
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Remove old loading logic - now handled by combined loading state

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'
    const inPaywall = segments[0] === 'paywall'

    // Priority 1: If user hasn't seen onboarding, show onboarding
    if (hasSeenOnboarding === false && !inOnboarding) {
      router.replace('/onboarding')
      return
    }

    // Priority 2: If onboarding completed, handle auth flow
    if (hasSeenOnboarding === true) {
      if (!session && !inAuthGroup) {
        // Redirect to login if not authenticated and not already in auth group
        router.replace('/(auth)/login')
      } else if (session) {
        // 1. RESCUE PRO USERS: If user is on Paywall AND is Pro, redirect to Home immediately
        if (inPaywall && subscriptionStatus !== 'loading' && isProUser) {
          router.replace('/(tabs)')
          return
        }

        // 2. PREVENT FIGHTING (For Free Users): If user is Free and already on Paywall, leave them alone
        if (inPaywall) return
        
        // 3. Handle Auth/Onboarding redirections (Keep existing logic)
        if (inAuthGroup || inOnboarding) {
          // Wait for RevenueCat to load subscription status
          if (subscriptionStatus === 'loading') return
          
          // Smart routing based on subscription
          if (isProUser) {
            router.replace('/(tabs)') // Pro users → Home
          } else {
            router.replace('/paywall') // Free users → Paywall
          }
        }
      }
    }
  }, [session, segments, isLoading, hasSeenOnboarding, isProUser, subscriptionStatus, router])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <PersistProvider>
        <TimeProvider>
          <SubscriptionProvider>
            <InitializationGuard>
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
              name="onboarding" 
              options={{ 
                animation: 'fade', 
                gestureEnabled: false,
                presentation: 'fullScreenModal'
              }} 
            />
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
              name="paywall" 
              options={{ 
                animation: 'slide_from_bottom',
                gestureEnabled: false,
                presentation: 'modal'
              }} 
            />
            <Stack.Screen 
              name="(auth)/login" 
              options={{ 
                animation: 'fade', 
                gestureEnabled: false 
              }} 
            />
          </Stack>
        </InitializationGuard>
      </SubscriptionProvider>
    </TimeProvider>
  </PersistProvider>
  </OnboardingProvider>
  )
}