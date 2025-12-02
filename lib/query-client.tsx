import React from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'

// MMKV yerine AsyncStorage kullanıyoruz (Expo Go uyumluluğu için)
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 dakika boyunca veri taze kalsın (sunucuya gitme)
      staleTime: 1000 * 60 * 5,
      // 24 saat boyunca çöp temizleme yapma
      gcTime: 1000 * 60 * 60 * 24,
      // Hata alırsan (offline) tekrar deneme, eldekini göster
      retry: false,
    },
  },
})

export const PersistProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}