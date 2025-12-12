import { useState, useEffect } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, TouchableWithoutFeedback, KeyboardAvoidingView, Keyboard, Image, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
// Global supabase yerine kendi özel instance'ımızı oluşturacağız
// import { supabase } from '../../lib/supabase' 
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../styles/theme'

// --- ÖNEMLİ: BURAYI KENDİ PROJE BİLGİLERİNLE DOLDUR ---
// (Bu bilgiler lib/supabase.ts dosyasında vardır, oradan kopyala)
const SUPABASE_URL = 'https://frpsqimbseadyxkghnpj.supabase.co'; // Senin URL'in
const SUPABASE_ANON_KEY = 'sb_publishable_sFzWk4yjC2awi_x3ejgXdw_kQv_CxAz'; // Senin Anon Key'in


// Özel Supabase İstemcisi
const supabaseReset = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default function ResetPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams();
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [isSessionValid, setIsSessionValid] = useState(false)

  useEffect(() => {
    // Auth durumunu dinle
    const { data: { subscription } } = supabaseReset.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || session) {
            console.log(`[RESET] Auth event detected: ${event}`);
            setIsSessionValid(true);
            setLoading(false);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (params && (params.code || params.access_token)) {
        processParams();
    }
  }, [params]);

  const processParams = async () => {
    if (isSessionValid) return;

    try {
      console.log('[RESET] Processing Params...');
      
      if (params.code) {
        const code = Array.isArray(params.code) ? params.code[0] : params.code;
        // Özel istemci ile kodu değiştir
        await supabaseReset.auth.exchangeCodeForSession(code);
      }
      else if (params.access_token && params.refresh_token) {
         const access_token = params.access_token as string;
         const refresh_token = params.refresh_token as string;
         await supabaseReset.auth.setSession({ access_token, refresh_token });
      }
    } catch (error) {
      console.error('[RESET] Param processing error:', error);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setUpdateLoading(true);
    console.log('[RESET] Starting password update...');

    try {
      // 1. Önce oturumu tazele (Garanti olsun)
      const { data: { session }, error: refreshError } = await supabaseReset.auth.getSession();
      
      if (!session) {
        throw new Error("Session lost. Please try clicking the link again.");
      }

      console.log('[RESET] Session found, updating user...');

      // 2. Güncelleme isteğini gönder
      const { data, error } = await supabaseReset.auth.updateUser({ 
        password: newPassword 
      });
      
      console.log('[RESET] Update response:', { success: !error, error }); 

      if (error) throw error;

      Alert.alert(
        'Success', 
        'Your password has been updated!', 
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }]
      );

    } catch (error: any) {
      console.error('[RESET] Update failed:', error);
      Alert.alert('Error', error.message || 'Failed to update password.');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 20, color: Colors.textMuted }}>Verifying session...</Text>
      </View>
    );
  }

  if (!isSessionValid) {
    return (
      <View style={styles.container}>
        <Image source={require('../../assets/images/goldlist-icon.png')} style={styles.appIcon} resizeMode="contain" />
        <Text style={styles.title}>Link Expired</Text>
        <Text style={styles.subtitle}>Unable to verify session. Please try requesting a new link.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>
          <TextInput style={styles.input} placeholder="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={updateLoading}>
            <Text style={styles.buttonText}>{updateLoading ? 'Updating...' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { ...CommonStyles.page, backgroundColor: Colors.white, padding: Spacing.xl, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 60, left: Spacing.lg, padding: Spacing.sm, zIndex: 1 },
  appIcon: { width: 100, height: 100, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { ...Typography.headerLarge, fontSize: 32, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { ...Typography.titleLarge, textAlign: 'center', marginBottom: 40, color: Colors.textMuted },
  input: { ...Effects3D.input, borderRadius: BorderRadius.medium, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, marginBottom: Spacing.lg, fontSize: 16 },
  button: { ...ButtonStyles.primaryLarge, marginBottom: Spacing.lg },
  buttonText: { ...Typography.buttonLarge, color: Colors.white },
});