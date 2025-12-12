import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking' // EKLENDİ
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
  
  const isLoading = sessionLoading || onboardingLoading

  // --- YENİ EKLENEN BÖLÜM: GLOBAL DEEP LINK LISTENER ---
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      let url = event.url;
      console.log('🌍 GLOBAL LINK CAUGHT:', url);

      // Sadece reset-password linkleriyle ilgileniyoruz
      if (url && url.includes('reset-password')) {
        // Regex ile code veya token'ı çekip alalım
        const codeMatch = url.match(/[?&]code=([^&#]+)/);
        const accessTokenMatch = url.match(/[#&]access_token=([^&#]+)/);
        const refreshTokenMatch = url.match(/[#&]refresh_token=([^&#]+)/);

        if (codeMatch && codeMatch[1]) {
           const code = decodeURIComponent(codeMatch[1]);
           console.log('✅ Code found globally, routing to reset-password...');
           // Code'u parametre olarak gönderiyoruz
           router.replace(`/(auth)/reset-password?code=${code}`);
        } 
        else if (accessTokenMatch && refreshTokenMatch) {
           const access_token = decodeURIComponent(accessTokenMatch[1]);
           const refresh_token = decodeURIComponent(refreshTokenMatch[1]);
           console.log('✅ Tokens found globally, routing to reset-password...');
           router.replace(`/(auth)/reset-password?access_token=${access_token}&refresh_token=${refresh_token}`);
        }
      }
    };

    // 1. Uygulama kapalıyken açılırsa (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 2. Uygulama arkadayken açılırsa (Warm Start)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);
  // --- BİTİŞ ---

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      
      // BURADAKİ PASSWORD_RECOVERY BLOĞUNU DAHA ÖNCE SİLMİŞTİK, DOĞRU.
      // SAKIN GERİ EKLEME. ARTIK YUKARIDAKİ GLOBAL LISTENER BU İŞİ YAPIYOR.
      
      if (session) {
        initializeNotifications().catch(err => 
          console.warn('Failed to initialize notifications:', err)
        )
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'
    const inPaywall = segments[0] === 'paywall'
    const inResetPassword = segments[1] === 'reset-password'; // Reset sayfasındaysak rahatsız etme

    // Reset password ekranındaysak yönlendirme yapma, bırak işini yapsın
    if (inResetPassword) return;

    if (hasSeenOnboarding === false && !inOnboarding) {
      router.replace('/onboarding')
      return
    }

    if (hasSeenOnboarding === true) {
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login')
      } else if (session) {
        if (inPaywall && subscriptionStatus !== 'loading' && isProUser) {
          router.replace('/(tabs)')
          return
        }
        if (inPaywall) return
        
        if (inAuthGroup || inOnboarding) {
          if (subscriptionStatus === 'loading') return
          
          if (isProUser) {
            router.replace('/(tabs)') 
          } else {
            router.replace('/paywall') 
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
                animation: 'slide_from_right',
                animationDuration: 200,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
              }}
            >
            <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="notebook/[id]" options={({ route }: any) => ({ animation: 'slide_from_right', gestureEnabled: true, title: route.params?.notebookName || 'Notebook' })} />
            <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom', gestureEnabled: false, presentation: 'modal' }} />
            <Stack.Screen name="(auth)/login" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="(auth)/forgot-password" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="(auth)/reset-password" options={{ animation: 'fade', gestureEnabled: false }} />
          </Stack>
        </InitializationGuard>
      </SubscriptionProvider>
    </TimeProvider>
  </PersistProvider>
  </OnboardingProvider>
  )
}