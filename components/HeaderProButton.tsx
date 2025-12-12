import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSubscription } from '../lib/revenuecat'
import { Colors, Spacing, BorderRadius, Typography } from '../styles/theme'

export function HeaderProButton() {
  const { isProUser } = useSubscription()
  const router = useRouter()

  // Don't show anything for Pro users
  if (isProUser) {
    return null
  }

  const handlePress = () => {
    router.push('/paywall')
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons name="diamond" size={16} color={Colors.white} style={styles.icon} />
      <Text style={styles.text}>PRO</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.large,
    marginRight: Spacing.sm,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginRight: 2,
    color: Colors.white,
  },
  text: {
    ...Typography.captionBold,
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})