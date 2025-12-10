import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from './supabase'
import { addDays, useCurrentTime, daysBetween } from './time-provider'
import { scheduleNextReviewNotification } from './notifications'

// Types based on our database schema
export interface Profile {
  id: string
  subscription_status: string
  has_ever_subscribed: boolean
  target_lang: string
  daily_word_goal: number
  current_streak: number
  last_activity_date: string | null
  created_at: string
}

export interface Notebook {
  id: string
  user_id: string
  name: string
  words_per_page_limit: number
  is_active: boolean
  created_at: string
  target_language: string
  language_level: string
}

export interface Page {
  id: string
  notebook_id: string
  page_number: number
  target_date: string
  title: string | null
  created_at: string
}

export interface Word {
  id: string
  page_id: string
  term: string
  definition: string
  type: string | null
  example_sentence: string | null
  example_translation: string | null
  next_review_date: string | null
  stage: 'bronze' | 'silver' | 'gold'
  round: number
  status: 'waiting' | 'ready' | 'learned' | 'leech'
  created_at: string
}

// Profile hooks
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data as Profile
    },
  })
}

// Notebook hooks
export function useNotebooks() {
  return useQuery({
    queryKey: ['notebooks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Notebook[]
    },
  })
}

export function useNotebook(notebookId: string) {
  return useQuery({
    queryKey: ['notebook', notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', notebookId)
        .single()

      if (error) throw error
      return data as Notebook
    },
  })
}

// Pages hooks
export function usePages(notebookId: string) {
  return useQuery({
    queryKey: ['pages', notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('page_number', { ascending: true })

      if (error) throw error
      return data as Page[]
    },
  })
}

// Optimized hook for just checking page existence (90% less data transfer)
export function usePageNumbers(notebookId: string) {
  return useQuery({
    queryKey: ['pageNumbers', notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('page_number')
        .eq('notebook_id', notebookId)

      if (error) throw error
      return (data as { page_number: number }[]).map(p => p.page_number)
    },
  })
}

// Get page title/context for a specific page
export function usePageTitle(notebookId: string, pageNumber: number) {
  return useQuery({
    queryKey: ['pageTitle', notebookId, pageNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('title')
        .eq('notebook_id', notebookId)
        .eq('page_number', pageNumber)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data?.title || null
    },
  })
}

// Update page title/context
export function useUpdatePageTitle() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ notebookId, pageNumber, title }: { notebookId: string, pageNumber: number, title: string }) => {
      // First, check if page exists
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('notebook_id', notebookId)
        .eq('page_number', pageNumber)
        .single()

      if (existingPage) {
        // Update existing page
        const { error } = await supabase
          .from('pages')
          .update({ title })
          .eq('notebook_id', notebookId)
          .eq('page_number', pageNumber)

        if (error) throw error
      } else {
        // Create new page
        const { error } = await supabase
          .from('pages')
          .insert({
            notebook_id: notebookId,
            page_number: pageNumber,
            target_date: addDays(new Date(), pageNumber * 14).toISOString().split('T')[0],
            title
          })

        if (error) throw error
      }
    },
    onSuccess: (_, { notebookId, pageNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['pageTitle', notebookId, pageNumber] })
      queryClient.invalidateQueries({ queryKey: ['pageNumbers', notebookId] })
    },
  })
}

// Words hooks
export function useWords(pageId: string) {
  return useQuery({
    queryKey: ['words', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Word[]
    },
  })
}

// Helper function to get language level descriptions
export function getLanguageLevelDescription(level: string): string {
  const descriptions: { [key: string]: string } = {
    'A1': 'Beginner',
    'A2': 'Elementary', 
    'B1': 'Intermediate',
    'B2': 'Upper Intermediate',
    'C1': 'Advanced',
    'C2': 'Proficient'
  };
  return descriptions[level] || 'Elementary';
}

// Mutations for creating data
export function useCreateNotebook() {
  const queryClient = useQueryClient()
  const { currentTime } = useCurrentTime()

  return useMutation({
    mutationFn: async (notebook: { 
      name: string; 
      words_per_page_limit?: number;
      target_language?: string;
      language_level?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          user_id: user.id,
          name: notebook.name,
          words_per_page_limit: notebook.words_per_page_limit || 20,
          target_language: notebook.target_language || 'English',
          language_level: notebook.language_level || 'A2',
          is_active: true,
          created_at: currentTime.toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data as Notebook
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    },
  })
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('notebooks')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Notebook
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] })
      queryClient.invalidateQueries({ queryKey: ['notebook', data.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    },
  })
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    },
  })
}

export function useCreatePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (page: { 
      notebook_id: string
      page_number: number
      target_date: string
      title?: string 
    }) => {
      const { data, error } = await supabase
        .from('pages')
        .insert(page)
        .select()
        .single()

      if (error) throw error
      return data as Page
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages', data.notebook_id] })
    },
  })
}

export function useCreateWord() {
  const queryClient = useQueryClient()
  const { currentTime } = useCurrentTime() // Add TimeProvider support

  return useMutation({
    mutationFn: async (word: {
      page_id: string
      term: string
      definition: string
      type?: string
      example_sentence?: string
      example_translation?: string
      next_review_date?: string
    }) => {
      // Check word limit for free users
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Get current word count for user
      const { data: wordCountData, error: countError } = await supabase
        .from('words')
        .select(`
          id,
          pages!inner(
            notebook_id,
            notebooks!inner(
              user_id
            )
          )
        `)
        .eq('pages.notebooks.user_id', user.id)

      if (countError) throw countError
      
      const currentWordCount = wordCountData?.length || 0
      
      // Check subscription status from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      
      const isProUser = profile.subscription_status === 'pro'
      
      // Enforce 300-word limit for free users
      if (!isProUser && currentWordCount >= 300) {
        throw new Error('WORD_LIMIT_REACHED')
      }
      const { data, error } = await supabase
        .from('words')
        .insert({
          ...word,
          created_at: currentTime.toISOString(), // Use simulated developer time
          stage: 'bronze',
          round: 1,
          status: 'waiting',
        })
        .select()
        .single()

      if (error) throw error
      return data as Word
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['words', data.page_id] })
      queryClient.invalidateQueries({ queryKey: ['pageNumbers'] })
      queryClient.invalidateQueries({ queryKey: ['activityLog'] }) // Refresh activity heatmap
      queryClient.invalidateQueries({ queryKey: ['profile'] }) // Refresh streak counter
      
      // Get notebook_id to invalidate notebook stats
      const { data: pageData } = await supabase
        .from('pages')
        .select('notebook_id')
        .eq('id', data.page_id)
        .single()
      
      if (pageData) {
        queryClient.invalidateQueries({ queryKey: ['notebookStats', pageData.notebook_id] })
        queryClient.invalidateQueries({ queryKey: ['notebookStageStats', pageData.notebook_id] })
      }

      // Schedule next review notification
      scheduleNextReviewNotification().catch(err => 
        console.warn('Failed to schedule notification after word creation:', err)
      )
    },
  })
}

// Optimistic word creation with lazy page creation (strict lazy architecture)
export function useCreateWordOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      notebook_id: string
      page_number: number
      target_date: string
      currentTime: Date
      word: {
        term: string
        definition: string
        type?: string
        example_sentence?: string
        example_translation?: string
      }
    }) => {
      // Check word limit for free users
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Get current word count for user
      const { data: wordCountData, error: countError } = await supabase
        .from('words')
        .select(`
          id,
          pages!inner(
            notebook_id,
            notebooks!inner(
              user_id
            )
          )
        `)
        .eq('pages.notebooks.user_id', user.id)

      if (countError) throw countError
      
      const currentWordCount = wordCountData?.length || 0
      
      // Check subscription status from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      
      const isProUser = profile.subscription_status === 'pro'
      
      // Enforce 300-word limit for free users
      if (!isProUser && currentWordCount >= 300) {
        throw new Error('WORD_LIMIT_REACHED')
      }

      // Calculate 14-day review date using developer time system
      const reviewDate = addDays(params.currentTime, 14)
      
      // Step 1: Check if page exists (handles unique constraint properly)
      const { data: existingPage, error: checkError } = await supabase
        .from('pages')
        .select('id')
        .eq('notebook_id', params.notebook_id)
        .eq('page_number', params.page_number)
        .maybeSingle()

      if (checkError) throw checkError

      // Step 2: Create page only if it doesn't exist (lazy creation)
      let pageId: string
      if (!existingPage) {
        const { data: newPage, error: createError } = await supabase
          .from('pages')
          .insert({
            notebook_id: params.notebook_id,
            page_number: params.page_number,
            target_date: params.target_date,
            title: `Lesson ${params.page_number}`,
          })
          .select('id')
          .single()

        if (createError) throw createError
        pageId = newPage.id
      } else {
        pageId = existingPage.id
      }

      const { data: wordData, error: wordError } = await supabase
        .from('words')
        .insert({
          page_id: pageId,
          term: params.word.term,
          definition: params.word.definition,
          type: params.word.type,
          example_sentence: params.word.example_sentence,
          example_translation: params.word.example_translation,
          next_review_date: reviewDate.toISOString().split('T')[0], // YYYY-MM-DD format
          created_at: params.currentTime.toISOString(), // Use simulated developer time
          stage: 'bronze',
          round: 1,
          status: 'waiting',
        })
        .select()
        .single()

      if (wordError) throw wordError
      return { page: { id: pageId, notebook_id: params.notebook_id }, word: wordData as Word }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['words', data.page.id] })
      queryClient.invalidateQueries({ queryKey: ['pageNumbers', data.page.notebook_id] })
      queryClient.invalidateQueries({ queryKey: ['wordsCount', data.page.notebook_id] })
      queryClient.invalidateQueries({ queryKey: ['notebookStats', data.page.notebook_id] })
      queryClient.invalidateQueries({ queryKey: ['notebookStageStats', data.page.notebook_id] })
      queryClient.invalidateQueries({ queryKey: ['activityLog'] }) // Refresh activity heatmap
      queryClient.invalidateQueries({ queryKey: ['profile'] }) // Refresh streak counter

      // Schedule next review notification
      scheduleNextReviewNotification().catch(err => 
        console.warn('Failed to schedule notification after optimistic word creation:', err)
      )
    },
    onError: (error) => {
      console.error('Failed to save word:', error)
      // Note: Toast notification will be handled in the UI component
    },
  })
}

// Word count tracking for roadmap coloring
export function useWordsCountByPage(notebookId: string) {
  return useQuery({
    queryKey: ['wordsCount', notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('words')
        .select(`
          id,
          pages!inner(
            page_number,
            notebook_id
          )
        `)
        .eq('pages.notebook_id', notebookId)

      if (error) throw error

      // Return { pageNumber: count } object
      const wordCounts: { [key: number]: number } = {}
      data?.forEach((word: any) => {
        const pageNumber = word.pages.page_number
        wordCounts[pageNumber] = (wordCounts[pageNumber] || 0) + 1
      })

      return wordCounts
    },
  })
}

// Notebook statistics for homepage cards
export function useNotebookStats(notebookId: string) {
  return useQuery({
    queryKey: ['notebookStats', notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('words')
        .select(`
          id,
          status,
          pages!inner(
            notebook_id
          )
        `)
        .eq('pages.notebook_id', notebookId)

      if (error) throw error

      const total = data?.length || 0
      const mastered = data?.filter(word => word.status === 'learned').length || 0

      return { total, mastered }
    },
  })
}

// Notebook button state for homepage cards
export function useNotebookButtonState(notebook: Notebook, currentTime: Date) {
  const { data: reviewWords } = useReviewWords(notebook.id, currentTime);
  const { data: wordsCount } = useWordsCountByPage(notebook.id);
  
  return useMemo(() => {
    // Calculate today's active page
    const notebookCreatedDate = new Date(notebook.created_at);
    const daysSinceCreation = daysBetween(notebookCreatedDate, currentTime);
    const activePageNumber = daysSinceCreation + 1;
    
    // Get today's word count and limit
    const todayWordCount = wordsCount?.[activePageNumber] || 0;
    const wordLimit = notebook.words_per_page_limit || 20;
    
    // Priority logic: Review > Add > Done
    if (reviewWords && reviewWords.length > 0) {
      return {
        state: 'review' as const,
        text: 'Review Today\'s Words',
        count: reviewWords.length,
        activePageNumber
      };
    } else if (todayWordCount < wordLimit) {
      return {
        state: 'add' as const,
        text: 'Add Today\'s Words',
        count: wordLimit - todayWordCount,
        activePageNumber
      };
    } else {
      return {
        state: 'done' as const,
        text: 'You are all done today',
        count: 0,
        activePageNumber
      };
    }
  }, [notebook, currentTime, reviewWords, wordsCount]);
}

// Activity log hooks
export function useActivityLog(daysBack: number = 365) {
  const { currentTime } = useCurrentTime()
  
  return useQuery({
    queryKey: ['activityLog', daysBack, currentTime.toDateString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase.rpc('get_user_activity_log', {
        user_uuid: user.id,
        days_back: daysBack
      })

      if (error) throw error
      
      // Convert date strings to Date objects with robust validation
      const validActivityDates = (data as { activity_date: string }[])
        .filter(row => {
          // Filter out null/undefined/empty activity dates
          if (!row?.activity_date || typeof row.activity_date !== 'string') {
            console.warn('Invalid activity_date found:', row);
            return false;
          }
          return true;
        })
        .map(row => {
          // Create Date object and validate it
          const dateStr = row.activity_date.trim();
          const date = new Date(dateStr + 'T00:00:00');
          
          // Check if Date object is valid
          if (isNaN(date.getTime())) {
            console.warn('Invalid date created from:', dateStr);
            return null;
          }
          
          return { date };
        })
        .filter(item => item !== null) as { date: Date }[]; // Filter out invalid dates
      
      return validActivityDates;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  })
}

// Legacy daily activity log (keeping for backwards compatibility)
export function useLogDailyActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (date: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('daily_activity_log')
        .upsert({
          user_id: user.id,
          date,
        })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['activityLog'] })
    },
  })
}

// Dashboard statistics hook
export interface DashboardStats {
  total_words: number
  words_added_period: number
  words_should_add: number
  words_added_percentage: number
  words_reviewed_period: number
  words_remembered_period: number
  mastery_rate_percentage: number
}

export interface DailyWordCount {
  date: Date
  count: number
}

export function useDashboardStats(period: 'Week' | 'Month') {
  const { currentTime } = useCurrentTime() // Use TimeProvider instead of new Date()
  
  return useQuery({
    queryKey: ['dashboardStats', period, currentTime.toDateString()], // Add currentTime to key
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Calculate start date based on period using TimeProvider time
      const startDate = period === 'Week' 
        ? new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(currentTime.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Format as local YYYY-MM-DD (not UTC)
      const localStartDate = startDate.getFullYear() + '-' + 
        String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(startDate.getDate()).padStart(2, '0')

      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        user_uuid: user.id,
        start_date: localStartDate,
        period_type: period.toLowerCase()
      })

      if (error) throw error
      return data[0] as DashboardStats
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  })
}

// Review system hooks
export function useReviewWords(notebookId: string, currentTime: Date) {
  return useQuery({
    queryKey: ['reviewWords', notebookId, currentTime.toDateString()],
    queryFn: async () => {
      const todayDate = currentTime.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('words')
        .select(`
          *,
          pages!inner(
            notebook_id,
            page_number
          )
        `)
        .eq('pages.notebook_id', notebookId)
        .not('status', 'in', '("learned","leech")')
        .lte('next_review_date', todayDate)
        .order('next_review_date', { ascending: true })

      if (error) throw error
      return data as (Word & { pages: { notebook_id: string; page_number: number } })[]
    },
  })
}

export function useUpdateWordReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      wordId: string
      remembered: boolean
      currentTime: Date
    }) => {
      const { wordId, remembered, currentTime } = params
      
      // First, get current word state
      const { data: currentWord, error: fetchError } = await supabase
        .from('words')
        .select('*')
        .eq('id', wordId)
        .single()

      if (fetchError) throw fetchError

      let updateData: any

      if (remembered) {
        // Scenario A: Remembered - Mark as learned
        updateData = {
          status: 'learned',
          next_review_date: null,
          updated_at: currentTime.toISOString(), // Use simulated time for time travel support
        }
      } else {
        // Scenario B: Forgotten - Distillation logic
        const nextReviewDate = addDays(currentTime, 14).toISOString().split('T')[0]
        
        if (currentWord.round < 4) {
          // Increment round, keep same stage
          updateData = {
            round: currentWord.round + 1,
            next_review_date: nextReviewDate,
            updated_at: currentTime.toISOString(), // Use simulated time for time travel support
          }
        } else {
          // Round 4 graduation - upgrade stage or mark as leech
          let newStage = currentWord.stage
          let newStatus = currentWord.status

          if (currentWord.stage === 'bronze') {
            newStage = 'silver'
          } else if (currentWord.stage === 'silver') {
            newStage = 'gold'
          } else if (currentWord.stage === 'gold') {
            // Failed gold stage 4 times - mark as leech
            newStatus = 'leech'
          }

          updateData = {
            round: 1,
            stage: newStage,
            status: newStatus,
            next_review_date: newStatus === 'leech' ? null : nextReviewDate,
            updated_at: currentTime.toISOString(), // Use simulated time for time travel support
          }
        }
      }

      const { data, error } = await supabase
        .from('words')
        .update(updateData)
        .eq('id', wordId)
        .select()
        .single()

      if (error) throw error
      return data as Word
    },
    onSuccess: async (data) => {
      // Invalidate review words queries
      queryClient.invalidateQueries({ queryKey: ['reviewWords'] })
      queryClient.invalidateQueries({ queryKey: ['words', data.page_id] })
      queryClient.invalidateQueries({ queryKey: ['profile'] }) // Refresh streak counter
      
      // Get notebook_id to invalidate notebook stats (for mastered count updates)
      const { data: pageData } = await supabase
        .from('pages')
        .select('notebook_id')
        .eq('id', data.page_id)
        .single()
      
      if (pageData) {
        queryClient.invalidateQueries({ queryKey: ['notebookStats', pageData.notebook_id] })
        queryClient.invalidateQueries({ queryKey: ['notebookStageStats', pageData.notebook_id] })
      }

      // Schedule next review notification
      scheduleNextReviewNotification().catch(err => 
        console.warn('Failed to schedule notification after word review:', err)
      )
    },
  })
}

// Weekly word counts for progress strip
export function useWeeklyWordCounts() {
  const { currentTime } = useCurrentTime()
  
  return useQuery({
    queryKey: ['weeklyWordCounts', currentTime.toDateString()],
    queryFn: async (): Promise<DailyWordCount[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Calculate the last 7 days ending with today (currentTime)
      const endDate = new Date(currentTime)
      const startDate = new Date(currentTime)
      startDate.setDate(startDate.getDate() - 6) // 6 days back + today = 7 days total

      // Format dates as YYYY-MM-DD for PostgreSQL
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase.rpc('get_daily_word_counts', {
        user_uuid: user.id,
        start_date: startDateStr,
        end_date: endDateStr
      })

      if (error) throw error

      // Fill gaps for missing days (days with 0 words)
      const result: DailyWordCount[] = []
      const dbData = data as { date: string; count: number }[]

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startDate.getTime()) // Use getTime() for reliable Date creation
        currentDay.setDate(startDate.getDate() + i)
        
        const dateStr = currentDay.toISOString().split('T')[0]
        const foundData = dbData.find(row => row.date === dateStr)
        
        // Validate the Date object before adding to result
        const resultDate = new Date(currentDay.getTime())
        if (isNaN(resultDate.getTime())) {
          console.warn('Invalid date created for weekly progress:', currentDay)
          continue; // Skip invalid dates
        }
        
        result.push({
          date: resultDate,
          count: foundData ? foundData.count : 0
        })
      }

      return result
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  })
}

// Total word count hook for subscription limits
export function useTotalWordCount() {
  return useQuery({
    queryKey: ['totalWordCount'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      const { data, error } = await supabase
        .from('words')
        .select(`
          id,
          pages!inner(
            notebook_id,
            notebooks!inner(
              user_id
            )
          )
        `)
        .eq('pages.notebooks.user_id', user.id)

      if (error) {
        console.error('Failed to fetch total word count:', error)
        return 0
      }
      
      return data?.length || 0
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: false,
  })
}

// Notebook stage statistics hook
export interface NotebookStageStats {
  bronze: number;
  silver: number;
  gold: number;
}

export function useNotebookStageStats(notebookId: string) {
  return useQuery({
    queryKey: ['notebookStageStats', notebookId],
    queryFn: async (): Promise<NotebookStageStats> => {
      // First get all page IDs for this notebook
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('id')
        .eq('notebook_id', notebookId);

      if (pagesError) throw pagesError;
      if (!pages || pages.length === 0) {
        return { bronze: 0, silver: 0, gold: 0 };
      }

      // Get all words for these pages, excluding mastered words
      const pageIds = pages.map(page => page.id);
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select('stage')
        .in('page_id', pageIds)
        .neq('status', 'learned'); // Exclude mastered words

      if (wordsError) throw wordsError;

      // Count words by stage
      const counts = { bronze: 0, silver: 0, gold: 0 };
      words?.forEach(word => {
        const stage = (word.stage as keyof typeof counts) || 'bronze';
        if (stage in counts) {
          counts[stage]++;
        }
      });

      return counts;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}