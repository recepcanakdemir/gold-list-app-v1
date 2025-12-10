import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import Purchases, { CustomerInfo, PurchasesError, PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from './supabase'
import { useTotalWordCount } from './database-hooks'

// RevenueCat configuration - Replace with your actual API keys
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_ZpCFZDvJvzWddZRDFsoCbOaBwJL',
  android: 'goog_your_android_key_here',
}) as string

// Subscription status types
export type SubscriptionStatus = 'free' | 'pro' | 'loading'


// Product identifiers - Updated to match RevenueCat logs
export const PRODUCT_IDS = {
  MONTHLY: 'goldlist_premium_monthly_999',
  YEARLY: 'goldlist_premium_yearly_4999',
  WEEKLY: 'goldlist_premium_weekly_499',
} as const

// Entitlement identifier - must match RevenueCat dashboard configuration
const ENTITLEMENT_ID = 'premium_access'

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_WORDS: 300,
} as const

// Development flags
const IS_EXPO_GO = Constants.appOwnership === 'expo'
const FORCE_PRO_IN_DEV = false // Set to true to test Pro features in development

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus
  isProUser: boolean
  customerInfo: CustomerInfo | null
  totalWordCount: number
  isAtWordLimit: boolean
  canAddWords: boolean
  refreshSubscription: () => Promise<void>
  purchaseProduct: (pkg: PurchasesPackage | string) => Promise<boolean>
  restorePurchases: () => Promise<boolean>
  showPaywall: () => void
  error: string | null
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading')
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Use the database hook for real-time word count
  const { data: totalWordCount = 0 } = useTotalWordCount()

  // Helper function to fetch subscription status from database
  const getDatabaseStatus = async (): Promise<'pro' | 'free'> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 'free'

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Failed to fetch profile for status check:', profileError)
        return 'free'
      }

      return profile.subscription_status === 'pro' ? 'pro' : 'free'
    } catch (error) {
      console.error('Error fetching database status:', error)
      return 'free'
    }
  }

  // Helper function to sync subscription status to database
  const syncSubscriptionToDatabase = async (
    status: 'pro' | 'free', 
    hasEverSubscribed: boolean, 
    planIdentifier?: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('❌ Database sync failed: No authenticated user')
        return
      }

      const updateData = {
        subscription_status: status,
        has_ever_subscribed: hasEverSubscribed,
        current_plan_id: status === 'pro' ? planIdentifier : null // Clear plan ID when downgrading to free
      }

      console.log(`🔄 Syncing to database:`, updateData)

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('❌ Failed to sync subscription to database:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
      } else {
        console.log(`✅ Database synced successfully:`, updateData)
      }
    } catch (error) {
      console.error('❌ Unexpected error syncing subscription to database:', error)
    }
  }

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Skip RevenueCat initialization in Expo Go
      if (IS_EXPO_GO) {
        console.warn('RevenueCat disabled in Expo Go - using fallback subscription state')
        setSubscriptionStatus(FORCE_PRO_IN_DEV ? 'pro' : 'free')
        return
      }

      try {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY })
        
        // Set up user identifier with Supabase user ID
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await Purchases.logIn(user.id)
        }
        
        // Get initial customer info
        await refreshSubscription()
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error)
        setError('Failed to initialize subscription system')
        setSubscriptionStatus('free') // Default to free on error
      }
    }

    initializeRevenueCat()
  }, [])

  // Listen for auth state changes to update user identifier
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip RevenueCat operations in Expo Go
      if (IS_EXPO_GO) {
        if (event === 'SIGNED_OUT') {
          setCustomerInfo(null)
          setSubscriptionStatus('free')
        }
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Immediately set loading state to prevent premature routing decisions
        setSubscriptionStatus('loading')
        
        try {
          await Purchases.logIn(session.user.id)
          await refreshSubscription()
        } catch (error) {
          console.error('Failed to log in to RevenueCat:', error)
          // Fallback to free on error
          setSubscriptionStatus('free')
        }
      } else if (event === 'SIGNED_OUT') {
        try {
          await Purchases.logOut()
          setCustomerInfo(null)
          setSubscriptionStatus('free')
        } catch (error) {
          console.error('Failed to log out of RevenueCat:', error)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])


  const refreshSubscription = async () => {
    try {
      // Always fetch from database first as single source of truth
      const dbStatus = await getDatabaseStatus()
      
      // Skip RevenueCat operations in Expo Go - use database as truth
      if (IS_EXPO_GO) {
        setSubscriptionStatus(dbStatus)
        console.log(`✅ Database status used in Expo Go: ${dbStatus}`)
        return
      }

      // In production, still sync with RevenueCat but database takes precedence
      try {
        const info = await Purchases.getCustomerInfo()
        setCustomerInfo(info)
        
        // Check if user has active RevenueCat subscription
        const isRevenueCatPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined
        
        // If database and RevenueCat disagree, update database to match RevenueCat
        if (dbStatus === 'free' && isRevenueCatPro) {
          // Extract product identifier from active entitlements
          const activePlanId = info.entitlements.active[ENTITLEMENT_ID]?.productIdentifier || null
          await syncSubscriptionToDatabase('pro', true, activePlanId)
          setSubscriptionStatus('pro')
        } else if (dbStatus === 'pro' && !isRevenueCatPro) {
          await syncSubscriptionToDatabase('free', false, null)
          setSubscriptionStatus('free')
        } else {
          // They agree - use database status (no sync needed)
          setSubscriptionStatus(dbStatus)
        }
        
        setError(null)
      } catch (revenueCatError) {
        console.error('RevenueCat error - using database status:', revenueCatError)
        // Fallback to database status if RevenueCat fails
        setSubscriptionStatus(dbStatus)
        setError(null) // Don't show error since we have database fallback
      }
    } catch (error) {
      console.error('Failed to refresh subscription:', error)
      setError('Failed to check subscription status')
      setSubscriptionStatus('free')
    }
  }

  const purchaseProduct = async (pkg: PurchasesPackage | string): Promise<boolean> => {
    // Mock purchase success in Expo Go - upgrade user to Pro and sync to database
    if (IS_EXPO_GO) {
      setError(null)
      // Always set to Pro on purchase and sync to database
      const planId = typeof pkg === 'string' ? pkg : pkg.identifier
      setSubscriptionStatus('pro')
      await syncSubscriptionToDatabase('pro', true, planId)
      console.log('Mock purchase successful in Expo Go:', planId)
      return true
    }

    try {
      setError(null)
      // Ensure we have a PurchasesPackage object for production
      if (typeof pkg === 'string') {
        throw new Error('Production purchases require a PurchasesPackage object, not a string')
      }
      const purchaserInfo = await Purchases.purchasePackage(pkg)
      
      // Check if the purchase was successful
      if (purchaserInfo.customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        setCustomerInfo(purchaserInfo.customerInfo)
        
        // Extract plan ID from the package that was purchased
        const planId = typeof pkg === 'string' ? pkg : pkg.identifier
        
        // Sync successful purchase to database with plan identifier
        await syncSubscriptionToDatabase('pro', true, planId)
        
        setSubscriptionStatus('pro')
        return true
      }
      return false
    } catch (error) {
      const purchaseError = error as PurchasesError
      // Check for user cancellation
      if (purchaseError.message?.includes('cancelled') || purchaseError.message?.includes('cancel')) {
        setError('Purchase was cancelled')
      } else {
        setError('Failed to complete purchase')
        console.error('Purchase error:', purchaseError)
      }
      return false
    }
  }

  const restorePurchases = async (): Promise<boolean> => {
    // In Expo Go, use database status as single source of truth
    if (IS_EXPO_GO) {
      setError(null)
      const dbStatus = await getDatabaseStatus()
      setSubscriptionStatus(dbStatus)
      console.log(`Mock restore in Expo Go - using database status: ${dbStatus}`)
      return dbStatus === 'pro'
    }

    try {
      setError(null)
      const info = await Purchases.restorePurchases()
      setCustomerInfo(info)
      
      const isPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined
      const newStatus = isPro ? 'pro' : 'free'
      
      // Extract product identifier from active entitlements if Pro
      const planId = isPro ? info.entitlements.active[ENTITLEMENT_ID]?.productIdentifier || null : null
      
      // Sync restored subscription to database
      await syncSubscriptionToDatabase(newStatus, isPro, planId)
      
      setSubscriptionStatus(newStatus)
      return isPro
    } catch (error) {
      console.error('Failed to restore purchases:', error)
      setError('Failed to restore purchases')
      return false
    }
  }

  const showPaywall = () => {
    // This will be implemented when we integrate with navigation
    console.log('Showing paywall...')
  }

  // Computed values
  const isProUser = subscriptionStatus === 'pro'
  const isAtWordLimit = !isProUser && totalWordCount >= FREE_TIER_LIMITS.MAX_WORDS
  const canAddWords = isProUser || totalWordCount < FREE_TIER_LIMITS.MAX_WORDS

  const value: SubscriptionContextType = {
    subscriptionStatus,
    isProUser,
    customerInfo,
    totalWordCount,
    isAtWordLimit,
    canAddWords,
    refreshSubscription,
    purchaseProduct,
    restorePurchases,
    showPaywall,
    error,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// Custom hooks
export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

export function usePaywall() {
  const { showPaywall, isProUser, isAtWordLimit } = useSubscription()
  
  return {
    showPaywall,
    shouldShowPaywall: isAtWordLimit,
    isProUser,
  }
}

// Word limit checking hook
export function useWordLimitCheck() {
  const { canAddWords, totalWordCount, isProUser } = useSubscription()
  
  const checkCanAddWord = (): { canAdd: boolean; message?: string } => {
    if (isProUser) {
      return { canAdd: true }
    }
    
    if (totalWordCount >= FREE_TIER_LIMITS.MAX_WORDS) {
      return {
        canAdd: false,
        message: `You've reached the free limit of ${FREE_TIER_LIMITS.MAX_WORDS} words. Upgrade to Pro for unlimited words!`
      }
    }
    
    const remaining = FREE_TIER_LIMITS.MAX_WORDS - totalWordCount
    if (remaining <= 10) {
      return {
        canAdd: true,
        message: `${remaining} words remaining before upgrade needed`
      }
    }
    
    return { canAdd: true }
  }
  
  return {
    canAddWords,
    totalWordCount,
    maxWords: FREE_TIER_LIMITS.MAX_WORDS,
    remainingWords: Math.max(0, FREE_TIER_LIMITS.MAX_WORDS - totalWordCount),
    checkCanAddWord,
  }
}