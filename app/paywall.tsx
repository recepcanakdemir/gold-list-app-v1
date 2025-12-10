import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'
import { useSubscription, PRODUCT_IDS } from '../lib/revenuecat'
import { Colors, Typography, Effects3D, Spacing, BorderRadius } from '../styles/theme'

type SubscriptionPlan = 'weekly' | 'monthly' | 'yearly'

export default function PaywallScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { purchaseProduct, restorePurchases, totalWordCount, error: subscriptionError } = useSubscription()
  
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('weekly') // Default to weekly

  const isExpoGo = Constants.appOwnership === 'expo'

  useEffect(() => {
    const fetchOfferings = async () => {
      if (isExpoGo) {
        console.log('Using mock offerings in Expo Go')
        setLoading(false)
        return
      }

      try {
        const offerings = await Purchases.getOfferings()
        if (offerings.current) {
          setOfferings(offerings.current)
        }
      } catch (error) {
        console.error('Failed to fetch offerings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOfferings()
  }, [])

  const handleClose = () => {
    router.replace('/(tabs)')
  }

  const handlePurchase = async () => {
    setPurchasing(true)
    try {
      // Get the full package object for production, fallback to ID for Expo Go
      const productInfo = getProductInfo(selectedPlan)
      const packageTopurchase = productInfo || selectedPlan // Pass package object or plan name for Expo Go

      const success = await purchaseProduct(packageTopurchase)
      if (success) {
        Alert.alert(
          'Welcome to Goldlist Pro!',
          'You now have unlimited access. Start learning!',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        )
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    try {
      const success = await restorePurchases()
      if (success) {
        Alert.alert(
          'Purchases Restored!',
          'Your Pro subscription has been restored.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        )
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.')
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.')
    }
  }

  // Mock pricing for Expo Go, dynamic pricing from RevenueCat in production
  const getProductInfo = (plan: SubscriptionPlan) => {
    if (isExpoGo) {
      const mockPricing = {
        weekly: { identifier: PRODUCT_IDS.WEEKLY, priceString: '$1.99' },
        monthly: { identifier: PRODUCT_IDS.MONTHLY, priceString: '$4.99' },
        yearly: { identifier: PRODUCT_IDS.YEARLY, priceString: '$29.99' }
      }
      return { product: mockPricing[plan] }
    }

    const productId = plan === 'weekly' ? PRODUCT_IDS.WEEKLY 
                    : plan === 'monthly' ? PRODUCT_IDS.MONTHLY 
                    : PRODUCT_IDS.YEARLY
    
    return offerings?.availablePackages.find(pkg => pkg.product.identifier === productId)
  }

  const renderPlanOption = (plan: SubscriptionPlan, title: string, subtitle?: string) => {
    const productInfo = getProductInfo(plan)
    const isSelected = selectedPlan === plan
    const price = productInfo?.product.priceString || '---'
    const isBestValue = plan === 'yearly'

    return (
      <Pressable
        key={plan}
        style={[styles.planOption, isSelected && styles.selectedPlan]}
        onPress={() => setSelectedPlan(plan)}
      >
        {isBestValue && (
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>SAVE 60%</Text>
          </View>
        )}
        <View style={styles.planInfo}>
          <Text style={[styles.planTitle, isSelected && styles.selectedPlanTitle]}>{title}</Text>
          {subtitle && (
            <Text style={styles.planSubtitle}>
              {isBestValue ? 'Best value' : subtitle}
            </Text>
          )}
          <Text style={styles.autoRenewText}>Auto renews</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.planPrice, isSelected && styles.selectedPlanPrice]}>{price}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close Button */}
      <Pressable style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={require('../assets/images/goldlist-icon.png')}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <Text style={styles.title}>Unlock Limitless Learning</Text>
        <Text style={styles.subtitle}>
          You've used {totalWordCount}/300 words. Upgrade for unlimited vocabulary building!
        </Text>
      </View>

      {/* Key Benefits */}
      <View style={styles.benefitsSection}>
        <View style={styles.benefit}>
          <View style={styles.benefitIcon}>
            <Ionicons name="infinite" size={16} color={Colors.primary} />
          </View>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>Unlimited Words</Text>
            <Text style={styles.benefitDescription}>Break the 300-word limit</Text>
          </View>
        </View>
        
        <View style={styles.benefit}>
          <View style={styles.benefitIcon}>
            <Ionicons name="bulb" size={16} color={Colors.primary} />
          </View>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>AI Power</Text>
            <Text style={styles.benefitDescription}>Translations & Examples</Text>
          </View>
        </View>
      </View>

      {/* Subscription Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.plansList}>
            {renderPlanOption('weekly', 'Weekly', 'Perfect for trying out')}
            {renderPlanOption('monthly', 'Monthly', 'Great for regular learners')}
            {renderPlanOption('yearly', 'Yearly', 'Best value - Save 60%')}
          </View>
        )}
      </View>

      {/* Purchase Button */}
      <Pressable
        style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
        onPress={handlePurchase}
        disabled={purchasing || loading}
      >
        {purchasing ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.purchaseButtonText}>
            Start Now - {getProductInfo(selectedPlan)?.product.priceString || '---'}
          </Text>
        )}
      </Pressable>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable onPress={handleRestore}>
          <Text style={styles.footerLink}>Restore</Text>
        </Pressable>
        <Text style={styles.footerSeparator}>|</Text>
        <Pressable>
          <Text style={styles.footerLink}>Terms</Text>
        </Pressable>
        <Text style={styles.footerSeparator}>|</Text>
        <Pressable>
          <Text style={styles.footerLink}>Privacy</Text>
        </Pressable>
      </View>

      {subscriptionError && (
        <Text style={styles.errorText}>{subscriptionError}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    zIndex: 1000,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  headerIcon: {
    width: 80,
    height: 80,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsSection: {
    marginBottom: Spacing.md,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    ...Effects3D.card,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  benefitDescription: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  plansSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  loader: {
    paddingVertical: Spacing.xl,
  },
  plansList: {
    gap: Spacing.sm,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  selectedPlan: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  planInfo: {
    flex: 1,
  },
  autoRenewText: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
  },
  priceContainer: {
    position: 'relative',
    alignItems: 'flex-end',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  selectedPlanTitle: {
    color: Colors.primary,
  },
  planSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  selectedPlanPrice: {
    color: Colors.primary,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Effects3D.button,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.sm,
  },
  footerSeparator: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
})