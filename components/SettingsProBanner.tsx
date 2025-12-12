import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSubscription } from '../lib/revenuecat'
import { Colors, Spacing, BorderRadius, Typography } from '../styles/theme'

export function SettingsProBanner() {
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
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Ionicons name="diamond" size={20} color={Colors.white} style={styles.icon} />
            <Text style={styles.title}>Unlock GoldList Premium</Text>
          </View>
          <Text style={styles.subtitle}>Unlimited words & Smart Review</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Upgrade Now</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} style={styles.arrowIcon} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.titleMedium,
    color: Colors.white,
    fontWeight: '800',
    fontSize: 17,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.white,
    opacity: 0.9,
    fontSize: 14,
  },
  buttonContainer: {
    marginLeft: Spacing.md,
  },
  button: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.goldDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    ...Typography.buttonMedium,
    color: Colors.primary,
    fontSize: 13,
    marginRight: Spacing.xs,
  },
  arrowIcon: {
    marginLeft: 2,
  },
})