import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../styles/theme'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      Alert.alert('Error', 'Please enter your email address')
      return false
    }
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return false
    }
    return true
  }

  const handleResetPassword = async () => {
    if (!validateEmail()) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'goldlist://reset-password',
      })

      if (error) {
        Alert.alert('Error', error.message)
      } else {
        Alert.alert(
          'Check Your Email',
          'We\'ve sent you a password reset link. Please check your email and tap the link to reset your password.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back()
            }
          ]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Image 
            source={require('../../assets/images/goldlist-icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleBackToLogin}
          >
            <Text style={styles.linkText}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.page,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    padding: Spacing.sm,
    zIndex: 1,
  },
  appIcon: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headerLarge,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.titleLarge,
    textAlign: 'center',
    marginBottom: 40,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  input: {
    ...Effects3D.input,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
    fontSize: 16,
  },
  button: {
    ...ButtonStyles.primaryLarge,
    marginBottom: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.buttonLarge,
    color: Colors.white,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  linkText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
})