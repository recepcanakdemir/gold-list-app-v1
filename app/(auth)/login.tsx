import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard, Image } from 'react-native'
import { useRouter } from 'expo-router'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '../../lib/supabase'
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../styles/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const validateInput = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      Alert.alert('Error', 'Please enter your email address')
      return false
    }
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return false
    }

    // Password validation
    if (!password) {
      Alert.alert('Error', 'Please enter your password')
      return false
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
    if (!passwordRegex.test(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters and include both letters and numbers.')
      return false
    }

    return true
  }

  const handleAuth = async () => {
    if (!validateInput()) {
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) {
          Alert.alert('Sign Up Error', error.message)
        } else if (data.session) {
          // Auto sign-in successful (email confirmation disabled)
          console.log('Sign up successful with immediate session - InitializationGuard will handle routing')
        } else {
          // Fallback case (shouldn't happen with email confirmation disabled)
          Alert.alert('Success', 'Account created successfully!')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          Alert.alert('Sign In Error', error.message)
        } else {
          // Successful sign in - let InitializationGuard handle routing
          console.log('Sign in successful - InitializationGuard will handle routing')
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign-In is only available on iOS')
      return
    }

    try {
      setLoading(true)
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        })

        if (error) {
          Alert.alert('Sign In Error', error.message)
        } else {
          // Successful sign in - let InitializationGuard handle routing
          console.log('Apple sign in successful - InitializationGuard will handle routing')
        }
      } else {
        Alert.alert('Error', 'Failed to get Apple identity token')
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        return
      }
      Alert.alert('Apple Sign-In Error', 'Failed to sign in with Apple. Please try again.')
      console.error('Apple Sign-In error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Image 
            source={require('../../assets/images/goldlist-icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>Goldlist App</Text>
          <Text style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Text>
          </TouchableOpacity>

          {/* Apple Sign-In Button - iOS only */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                isSignUp 
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={[styles.appleButton, loading && styles.buttonDisabled]}
              onPress={loading ? () => {} : handleAppleLogin}
            />
          )}

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.linkText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
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
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: Spacing.lg,
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