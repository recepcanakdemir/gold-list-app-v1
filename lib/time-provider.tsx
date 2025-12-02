import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface TimeContextValue {
  currentTime: Date
  addDay: () => void
  resetToNow: () => void
  isSimulated: boolean
}

const TimeContext = createContext<TimeContextValue | undefined>(undefined)

const TIME_OFFSET_KEY = 'goldlist_time_offset'

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [timeOffset, setTimeOffset] = useState(0) // milliseconds to add to current time
  const [currentTime, setCurrentTime] = useState(() => new Date(Date.now())) // Reactive current time

  useEffect(() => {
    // Load saved time offset from AsyncStorage
    const loadTimeOffset = async () => {
      try {
        const savedOffset = await AsyncStorage.getItem(TIME_OFFSET_KEY)
        if (savedOffset) {
          const offset = parseInt(savedOffset, 10)
          setTimeOffset(offset)
          setCurrentTime(new Date(Date.now() + offset))
        }
      } catch (error) {
        console.error('Failed to load time offset:', error)
      }
    }
    loadTimeOffset()
  }, [])

  // Update currentTime whenever timeOffset changes (REACTIVITY FIX)
  useEffect(() => {
    setCurrentTime(new Date(Date.now() + timeOffset))
  }, [timeOffset])

  const saveTimeOffset = async (offset: number) => {
    try {
      await AsyncStorage.setItem(TIME_OFFSET_KEY, offset.toString())
      setTimeOffset(offset)
      // currentTime will be updated by the useEffect above
    } catch (error) {
      console.error('Failed to save time offset:', error)
    }
  }

  const addDay = () => {
    const newOffset = timeOffset + (24 * 60 * 60 * 1000) // Add 24 hours in milliseconds
    saveTimeOffset(newOffset)
  }

  const resetToNow = () => {
    saveTimeOffset(0)
  }

  const value: TimeContextValue = {
    currentTime, // Now reactive!
    addDay,
    resetToNow,
    isSimulated: timeOffset !== 0,
  }

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
}

export function useCurrentTime() {
  const context = useContext(TimeContext)
  if (context === undefined) {
    throw new Error('useCurrentTime must be used within a TimeProvider')
  }
  return context
}

// Helper functions for date operations
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000 // hours*minutes*seconds*milliseconds
  const firstDate = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const secondDate = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  
  return Math.round((secondDate.getTime() - firstDate.getTime()) / oneDay)
}