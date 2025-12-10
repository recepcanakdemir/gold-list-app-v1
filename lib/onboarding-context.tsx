import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface OnboardingContextType {
  hasSeenOnboarding: boolean | null
  completeOnboarding: () => Promise<void>
  isLoading: boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

interface OnboardingProviderProps {
  children: ReactNode
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load onboarding status from AsyncStorage on mount
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('hasSeenOnboarding')
        setHasSeenOnboarding(status === 'true')
      } catch (error) {
        console.error('Failed to load onboarding status:', error)
        setHasSeenOnboarding(false) // Default to showing onboarding on error
      } finally {
        setIsLoading(false)
      }
    }

    loadOnboardingStatus()
  }, [])

  // Complete onboarding: update state immediately AND persist to storage
  const completeOnboarding = async () => {
    try {
      // Update context state immediately (no race condition!)
      setHasSeenOnboarding(true)
      
      // Persist to AsyncStorage for next app launch
      await AsyncStorage.setItem('hasSeenOnboarding', 'true')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      // If storage fails, still keep the in-memory state updated
      // This ensures the current session continues working
    }
  }

  const value: OnboardingContextType = {
    hasSeenOnboarding,
    completeOnboarding,
    isLoading,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

// Custom hook to use the onboarding context
export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}