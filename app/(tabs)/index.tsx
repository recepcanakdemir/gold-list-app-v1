import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Modal, 
  Alert, 
  FlatList,
  Dimensions,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useNotebooks, useProfile, useNotebookStats, useNotebookButtonState, useWeeklyWordCounts } from '../../lib/database-hooks';
import { useCurrentTime } from '../../lib/time-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- HELPER FUNCTIONS ---

// Helper function to validate streak based on last activity
function calculateDisplayStreak(profile: any, currentTime: Date) {
  if (!profile?.last_activity_date) {
    return { streak: profile?.current_streak || 0, status: 'completed' };
  }
  
  // Normalize both dates to UTC midnight timestamps for pure day comparison
  const d1 = new Date(profile.last_activity_date);
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  
  const d2 = new Date(currentTime);
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  
  const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  
  // Three-state streak logic based on calendar days:
  if (diffDays === 0) {
    return { streak: profile.current_streak || 0, status: 'completed' };
  }
  if (diffDays === 1) {
    return { streak: profile.current_streak || 0, status: 'pending' };
  }
  return { streak: 0, status: 'broken' };
}

function getLanguageCountryCode(language: string): string {
  const countryCodeMap: { [key: string]: string } = {
    Spanish: 'ES', French: 'FR', German: 'DE', Italian: 'IT', English: 'GB',
    Portuguese: 'PT', Russian: 'RU', Japanese: 'JP', Chinese: 'CN', Korean: 'KR',
    Arabic: 'SA', Dutch: 'NL', Swedish: 'SE', Norwegian: 'NO', Polish: 'PL',
    Turkish: 'TR', Hindi: 'IN'
  };
  return countryCodeMap[language] || 'US';
}

// --- COMPONENTS ---

function WeeklyProgressStrip() {
  const { currentTime } = useCurrentTime();
  const { data: weeklyData, isLoading } = useWeeklyWordCounts();

  if (isLoading || !weeklyData) {
    return (
      <View style={styles.weeklyProgressContainer}>
        <Text style={styles.weeklyProgressTitle}>This Week</Text>
        <View style={styles.weeklyProgressStrip}>
          {Array.from({ length: 7 }).map((_, index) => (
            <View key={index} style={styles.dayContainer}>
              <View style={[styles.dayCircle, styles.dayCircleLoading]}>
                <Text style={styles.dayCircleTextLoading}>-</Text>
              </View>
              <Text style={styles.dayLabel}>---</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const getDayName = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '---';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const isToday = (date: Date): boolean => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return false;
    const today = new Date(currentTime);
    return date.toDateString() === today.toDateString();
  };

  return (
    <View style={styles.weeklyProgressContainer}>
      <Text style={styles.weeklyProgressTitle}>This Week</Text>
      <View style={styles.weeklyProgressStrip}>
        {weeklyData.map((dayData, index) => {
          const hasWords = dayData.count > 0;
          const isTodayItem = isToday(dayData.date);
          
          if (!dayData.date) return null;
          
          return (
            <View key={index} style={styles.dayContainer}>
              <View style={[
                styles.dayCircle,
                hasWords ? styles.dayCircleActive : styles.dayCircleInactive,
                isTodayItem && styles.dayCircleToday
              ]}>
                <Text style={[
                  styles.dayCircleText,
                  hasWords ? styles.dayCircleTextActive : styles.dayCircleTextInactive
                ]}>
                  {dayData.count}
                </Text>
              </View>
              <Text style={[
                styles.dayLabel,
                isTodayItem && styles.dayLabelToday
              ]}>
                {getDayName(dayData.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface NotebookCardProps {
  notebook: {
    id: string;
    name: string;
    created_at: string;
    user_id: string;
    words_per_page_limit: number;
    is_active: boolean;
    target_language?: string;
  };
  stats?: {
    total: number;
    mastered: number;
  };
  buttonState?: {
    state: 'review' | 'add' | 'done';
    text: string;
    count: number;
    activePageNumber: number;
  };
  onPress: () => void;
  onButtonPress: () => void;
}

// --- DESIGN UPDATE: GAMIFIED CARD ---
function NotebookCard({ notebook, stats, buttonState, onPress, onButtonPress }: NotebookCardProps) {
  const totalWords = stats?.total || 0;
  const masteredWords = stats?.mastered || 0;

  // Button Colors based on state
  const getButtonStyles = () => {
    switch(buttonState?.state) {
      case 'review': return { bg: '#FF4444', border: '#CC0000' }; // Red
      case 'done': return { bg: '#4CAF50', border: '#388E3C' };   // Green
      default: return { bg: '#FFA500', border: '#D97706' };       // Orange (Add)
    }
  };

  const btnStyle = getButtonStyles();

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity 
        style={styles.mainNotebookCard} 
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Top Row: Badges & Flag */}
        <View style={styles.topRow}>
          <View style={styles.badgeRowLeft}>
            {/* Bronze Badge - Total Words */}
            <View style={styles.badgeCircle}>
              <View style={[styles.badgeInner, styles.bronzeBadge]}>
                <Text style={styles.badgeNumber}>{totalWords}</Text>
              </View>
            </View>
            
            {/* Silver Badge - Locked */}
            <View style={styles.badgeCircle}>
              <View style={[styles.badgeInner, styles.silverBadgeLocked]}>
                <MaterialIcons name="lock" size={16} color="#FFF" />
              </View>
            </View>
            
            {/* Gold Badge - Locked */}
            <View style={styles.badgeCircle}>
              <View style={[styles.badgeInner, styles.goldBadgeLocked]}>
                <MaterialIcons name="lock" size={16} color="#FFF" />
              </View>
            </View>
          </View>

          {/* Country Flag */}
          <Image 
            source={{ uri: `https://flagcdn.com/w160/${getLanguageCountryCode(notebook.target_language || 'Spanish').toLowerCase()}.png` }}
            style={[styles.flagIcon3D, { width: 72, height: 48, borderRadius: 8 }]}
            resizeMode="cover"
            defaultSource={{ uri: 'https://flagcdn.com/w160/us.png' }}
            onError={() => console.log('Flag failed to load for:', notebook.target_language)}
          />
        </View>

        {/* Notebook Title */}
        <Text style={styles.notebookTitle} numberOfLines={1}>{notebook.name}</Text>

        {/* Stats Text */}
        <Text style={styles.notebookStats}>
          {stats ? `${totalWords} total • ${masteredWords} mastered` : "Loading..."}
        </Text>

        {/* 3D Action Button */}
        <TouchableOpacity 
          style={[
            styles.actionButton3D, 
            { backgroundColor: btnStyle.bg, borderBottomColor: btnStyle.border }
          ]} 
          onPress={onButtonPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText3D}>
            {buttonState?.text || "LOADING..."}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

function NotebookCardWithStatsAndAction({ 
  notebook, 
  onPress, 
  onButtonPress 
}: { 
  notebook: any; 
  onPress: () => void; 
  onButtonPress: (buttonState: any) => void; 
}) {
  const { currentTime } = useCurrentTime();
  const { data: stats } = useNotebookStats(notebook.id);
  const buttonState = useNotebookButtonState(notebook, currentTime);
  
  return (
    <NotebookCard
      notebook={notebook}
      stats={stats}
      buttonState={buttonState}
      onPress={onPress}
      onButtonPress={() => onButtonPress(buttonState)}
    />
  );
}

function EmptyNotebooks({ onCreateNotebook }: { onCreateNotebook: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Create your first notebook</Text>
      <Text style={styles.emptySubtitle}>Start your vocabulary learning journey</Text>
      <TouchableOpacity style={styles.createFirstButton} onPress={onCreateNotebook}>
        <Text style={styles.createFirstButtonText}>Create Notebook</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const { width: screenWidth } = Dimensions.get('window');
  
  const router = useRouter();
  const { currentTime, addDay, resetToNow, isSimulated } = useCurrentTime();
  const { data: notebooks, isLoading } = useNotebooks();
  const { data: profile } = useProfile();
  
  // Calculate display streak
  const streakInfo = calculateDisplayStreak(profile, currentTime);
  const displayStreak = streakInfo.streak;
  const streakStatus = streakInfo.status;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleClearStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'Storage cleared. Please restart the app.');
    } catch (e) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };


  const handleNotebookPress = (notebook: any) => {
    router.push({
      pathname: `/notebook/${notebook.id}`,
      params: { notebookName: notebook.name }
    });
  };

  const handleButtonPress = (notebook: any, buttonState: any) => {
    switch (buttonState.state) {
      case 'review':
        router.push(`/notebook/${notebook.id}/review`);
        break;
      case 'add':
        router.push(`/notebook/${notebook.id}/add?page=${buttonState.activePageNumber}`);
        break;
      case 'done':
        router.push(`/notebook/${notebook.id}`);
        break;
    }
  };

  const renderNotebook = ({ item }: { item: any }) => (
    <View style={{ width: screenWidth, paddingHorizontal: 20 }}>
      <NotebookCardWithStatsAndAction 
        notebook={item} 
        onPress={() => handleNotebookPress(item)}
        onButtonPress={(buttonState) => handleButtonPress(item, buttonState)}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gold List</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gold List</Text>
        <View style={styles.streakContainer}>
          <Text style={[
            styles.streakText, 
            streakStatus === 'pending' && styles.pendingStreakText,
            streakStatus === 'broken' && styles.brokenStreakText
          ]}>
            {streakStatus === 'broken' ? '💔' : '🔥'} {displayStreak}
          </Text>
        </View>
      </View>

      {/* Weekly Progress Strip */}
      <WeeklyProgressStrip />

      {/* Notebooks List */}
      {notebooks && notebooks.length > 0 ? (
        <>
          <View style={styles.notebooksContainer}>
            <FlatList
              data={notebooks}
              renderItem={renderNotebook}
              keyExtractor={(item) => item.id}
              horizontal={true}
              pagingEnabled={true}
              showsHorizontalScrollIndicator={false}
              snapToInterval={screenWidth}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={styles.notebooksList}
              scrollEventThrottle={16}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setCurrentSlideIndex(index);
              }}
            />
          </View>
          {/* Pagination Dots */}
          {notebooks.length > 1 && (
            <View style={styles.paginationContainer}>
              {notebooks.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentSlideIndex && styles.paginationDotActive
                  ]}
                />
              ))}
            </View>
          )}
          <View style={styles.spacer} />
        </>
      ) : (
        <EmptyNotebooks onCreateNotebook={() => router.push('/create-notebook')} />
      )}

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/create-notebook')}
      >
        <Ionicons name="add" size={36} color="white" style={{ fontWeight: 'bold' }} />
        <View style={styles.fabShadow} />
      </TouchableOpacity>


      {/* Developer Menu */}
      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => setShowDevMenu(true)}
          >
            <Text style={styles.devButtonText}>🔧</Text>
          </TouchableOpacity>

          <Modal
            visible={showDevMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDevMenu(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Developer Tools</Text>
                {isSimulated && (
                  <Text style={styles.simulatedTime}>
                    Date: {currentTime.toLocaleDateString()}
                  </Text>
                )}
                <TouchableOpacity style={styles.modalButton} onPress={addDay}>
                  <Text style={styles.modalButtonText}>Skip Day (+24h)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={resetToNow}>
                  <Text style={styles.modalButtonText}>Reset Date</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.dangerButton]} onPress={handleSignOut}>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7', // Biraz daha sıcak bir gri
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4B4B4B',
    letterSpacing: -0.5,
  },
  streakContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderBottomWidth: 4, // 3D effect
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B4B4B',
  },
  brokenStreakText: { color: '#999', opacity: 0.7 },
  pendingStreakText: { color: '#999', opacity: 0.6 },
  
  // WEEKLY STRIP
  weeklyProgressContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 24,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderBottomWidth: 4, // 3D effect
  },
  weeklyProgressTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#AFAFAF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyProgressStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: { alignItems: 'center', flex: 1 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCircleActive: {
    backgroundColor: '#FFC107', // Altın sarısı
    borderColor: '#FFA000',
  },
  dayCircleInactive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  dayCircleLoading: { backgroundColor: '#F0F0F0' },
  dayCircleToday: {
    borderColor: '#FFA500',
    borderWidth: 2,
  },
  dayCircleText: { fontSize: 14, fontWeight: '800' },
  dayCircleTextActive: { color: '#795548' },
  dayCircleTextInactive: { color: '#E5E5E5' },
  dayCircleTextLoading: { color: '#CCC' },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AFAFAF',
    textTransform: 'uppercase',
  },
  dayLabelToday: { color: '#FFA500' },

  // NOTEBOOKS
  notebooksContainer: {
    height: 280, // Reduced height for closer pagination
  },
  notebooksList: {
    // paddingHorizontal: 10,
  },
  // GAMIFIED CARD STYLES
  cardWrapper: {
    paddingBottom: 2, // Reduced shadow space
  },
  mainNotebookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderBottomWidth: 6,
    borderBottomColor: '#D1D5DB',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  badgeRowLeft: { flexDirection: 'row', gap: 8 },
  badgeCircle: { width: 44, height: 44 },
  badgeInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
    borderColor: '#CD7F32',
    borderBottomColor: '#A05A2C',
  },
  silverBadgeLocked: {
    backgroundColor: '#C0C0C0',
    borderColor: '#C0C0C0',
    borderBottomColor: '#A0A0A0',
  },
  goldBadgeLocked: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
    borderBottomColor: '#E6C200',
  },
  badgeNumber: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  flagIcon3D: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderBottomWidth: 4,
    borderBottomColor: '#D1D5DB',
  },
  notebookTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4B4B4B',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  notebookStats: {
    fontSize: 15,
    color: '#AFAFAF',
    fontWeight: '700',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  // 3D BUTTONS
  actionButton3D: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 0,
    borderBottomWidth: 5,
  },
  actionButtonText3D: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  
  // PAGINATION
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFA500',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFA500', // Orange for add action
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFA500',
    borderBottomWidth: 6,
    borderBottomColor: '#D97706',
  },
  fabShadow: {
    // 3D effect handled by borders
  },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  

  
  // COMMON
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#4B4B4B', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#AFAFAF', fontWeight: '600', textAlign: 'center', maxWidth: 250 },
  createFirstButton: {
    marginTop: 24,
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderBottomWidth: 5,
    borderBottomColor: '#D97706',
  },
  createFirstButtonText: { color: 'white', fontWeight: '800', fontSize: 16, textTransform: 'uppercase' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, fontWeight: '700', color: '#AFAFAF' },
  spacer: { height: 100 },
  devButton: { position: 'absolute', bottom: 110, left: 24, backgroundColor: '#333', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  devButtonText: { fontSize: 20 },
  modalButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFA500',
    marginVertical: 4,
  },
  dangerButton: { backgroundColor: '#FF4444' },
  closeButton: { backgroundColor: '#666' },
  modalButtonText: { color: 'white', fontWeight: '600' },
  simulatedTime: { marginBottom: 10, fontWeight: 'bold', color: '#FFA500' }
});