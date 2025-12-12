import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Modal,
  Linking 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/database-hooks';
import { useCurrentTime } from '../../lib/time-provider';
import { queryClient } from '../../lib/query-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../styles/theme';
import { Header } from '../../components/Header';
import { SettingsProBanner } from '../../components/SettingsProBanner';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, showChevron = true }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color="#FFA500" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color="#999" />
      )}
    </TouchableOpacity>
  );
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const [showDevMenu, setShowDevMenu] = useState(false);
  const { data: profile } = useProfile();
  const { currentTime, addDay, resetToNow, isSimulated, simulatedDays } = useCurrentTime();
  
  const handleDevSignOut = async () => {
    try {
      setShowDevMenu(false);
      // Critical: Clear query cache to prevent data leakage between sessions
      queryClient.clear();
      await AsyncStorage.clear();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            // Critical: Clear query cache to prevent data leakage between sessions
            queryClient.clear();
            await supabase.auth.signOut();
          }
        }
      ]
    );
  };


  const handleAbout = () => {
    Alert.alert(
      'Goldlist App',
      'Version 1.0.0\n\nA vocabulary learning app based on the Goldlist Method.\n\nBuilt with React Native and Supabase.',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = async () => {
    try {
      const email = 'landmarkaiguide@gmail.com';
      const subject = 'Gold List App Support Request';
      const body = 'Hello,\n\nI need help with the Gold List app.\n\nPlease describe your issue:\n\n';
      
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email Support',
          `Please contact us at: ${email}\n\nOr copy this email address to your preferred email app.`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Email Support', 
        'Please contact us at: landmarkaiguide@gmail.com'
      );
    }
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notification settings coming soon!');
  };

  const handleLanguage = () => {
    Alert.alert('Language', 'Language selection coming soon!');
  };

  const handlePrivacy = async () => {
    try {
      const url = 'https://diligent-chatter-bcf.notion.site/Gold-List-Privacy-Policy-2c5e917df771804193d8df89bb6b9843?pvs=73';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open Privacy Policy link');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open Privacy Policy');
    }
  };

  const handleTerms = async () => {
    try {
      const url = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open Terms of Service link');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open Terms of Service');
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <Header 
        title="Settings"
      />

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pro Banner */}
        <SettingsProBanner />

        {/* Account Section */}
        <SettingSection title="Account">
          <SettingItem
            icon="notifications"
            title="Notifications"
            subtitle="Daily reminders and achievements"
            onPress={handleNotifications}
          />
        </SettingSection>


        {/* Support Section */}
        <SettingSection title="Support">
          <SettingItem
            icon="help-circle"
            title="Help & Support"
            onPress={handleHelp}
          />
          <SettingItem
            icon="information-circle"
            title="About"
            onPress={handleAbout}
          />
          <SettingItem
            icon="shield-checkmark"
            title="Privacy Policy"
            onPress={handlePrivacy}
          />
          <SettingItem
            icon="document-text"
            title="Terms of Service"
            onPress={handleTerms}
          />
        </SettingSection>

        {/* Account Actions */}
        <SettingSection title="Account Actions">
          <SettingItem
            icon="log-out"
            title="Sign Out"
            onPress={handleSignOut}
            showChevron={false}
          />
        </SettingSection>

        {/* Developer Section - Only in DEV mode */}
        {__DEV__ && (
          <SettingSection title="Developer">
            <SettingItem
              icon="code-slash"
              title="Developer Tools"
              subtitle={isSimulated ? `Simulated: ${currentTime.toLocaleDateString()}` : 'Time simulation'}
              onPress={() => setShowDevMenu(true)}
            />
          </SettingSection>
        )}
      </ScrollView>


      {/* Developer Menu Modal */}
      {__DEV__ && (
        <Modal
          visible={showDevMenu}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDevMenu(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Developer Tools</Text>

              {isSimulated && (
                <>
                  <Text style={styles.simulatedTime}>
                    Date: {currentTime.toLocaleDateString()}
                  </Text>
                  <Text style={styles.simulatedTime}>
                    Days Simulated: {simulatedDays + 1}
                  </Text>
                </>
              )}

              <TouchableOpacity style={styles.modalButton} onPress={addDay}>
                <Text style={styles.modalButtonText}>Skip Day (+24h)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButton} onPress={resetToNow}>
                <Text style={styles.modalButtonText}>Reset Date</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalButton, styles.dangerButton]} onPress={handleDevSignOut}>
                <Text style={styles.modalButtonText}>Sign Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowDevMenu(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.page,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for tab bar and dev button
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#FFA500',
  },
  dangerButton: {
    backgroundColor: '#FF4444',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  simulatedTime: {
    fontSize: 14,
    color: '#FFA500',
    marginBottom: 10,
    fontWeight: '600',
  },
  devButton: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: 20,
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  devButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});