import React, { useState, useMemo } from 'react';
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
import { useNotebooks, useProfile, useNotebookStats, useNotebookButtonState, useWeeklyWordCounts, useNotebookStageStats, NotebookStageStats } from '../../lib/database-hooks';
import { useSubscription } from '../../lib/revenuecat';
import { useCurrentTime } from '../../lib/time-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/Header';
import { HeaderProButton } from '../../components/HeaderProButton';

// --- COMPONENT DEFINITIONS ---

// StageCircle Component
interface StageCircleProps {
  stage: 'bronze' | 'silver' | 'gold';
  count: number;
  isUnlocked: boolean;
}

function StageCircle({ stage, count, isUnlocked }: StageCircleProps) {
  const getStageStyles = () => {
    if (!isUnlocked) {
      // Locked state - gray with lock icon
      return {
        backgroundColor: '#D1D5DB',
        borderColor: '#D1D5DB',
      };
    }
    
    // Unlocked state - stage colors
    switch (stage) {
      case 'bronze':
        return {
          backgroundColor: '#CD7F32',
          borderColor: '#A0591C',
        };
      case 'silver':
        return {
          backgroundColor: '#C0C0C0',
          borderColor: '#A0A0A0',
        };
      case 'gold':
        return {
          backgroundColor: '#FFD700',
          borderColor: '#E6C200',
        };
      default:
        return {
          backgroundColor: '#D1D5DB',
          borderColor: '#D1D5DB',
        };
    }
  };

  const stageStyle = getStageStyles();

  return (
    <View style={styles.badgeCircle}>
      <View style={[
        styles.badgeInner,
        {
          backgroundColor: stageStyle.backgroundColor,
          borderColor: stageStyle.borderColor,
          borderBottomColor: stageStyle.borderColor,
        }
      ]}>
        {isUnlocked ? (
          <Text style={styles.badgeNumber}>{count}</Text>
        ) : (
          <MaterialIcons name="lock" size={16} color="#FFF" />
        )}
      </View>
    </View>
  );
}

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

// Custom hook to aggregate status across all notebooks
function useNotebookStatusSummary() {
  const { currentTime } = useCurrentTime();
  const { data: notebooks } = useNotebooks();
  
  return useMemo(() => {
    if (!notebooks || notebooks.length === 0) {
      return { message: "Create your first notebook to get started", type: 'info' };
    }
    
    // Simple message based on notebook count and time of day
    const totalNotebooks = notebooks.length;
    const hour = new Date(currentTime).getHours();
    
    if (hour < 12) {
      return {
        message: `Good morning! ${totalNotebooks} notebook${totalNotebooks > 1 ? 's' : ''} ready to go`,
        type: 'add'
      };
    } else if (hour < 18) {
      return {
        message: `${totalNotebooks} notebook${totalNotebooks > 1 ? 's' : ''} waiting for your attention`,
        type: 'review'
      };
    } else {
      return {
        message: `Evening study time! ${totalNotebooks} notebook${totalNotebooks > 1 ? 's' : ''} available`,
        type: 'mixed'
      };
    }
  }, [notebooks, currentTime]);
}

function StatusMessageCard() {
  const statusSummary = useNotebookStatusSummary();
  
  const getBackgroundColor = () => {
    switch (statusSummary.type) {
      case 'review': return '#FFF5F5'; // Light red
      case 'add': return '#FFF8F0'; // Light orange
      case 'mixed': return '#FEF3C7'; // Light yellow
      case 'done': return '#F0FDF4'; // Light green
      default: return '#F8FAFC'; // Light gray
    }
  };
  
  const getBorderColor = () => {
    switch (statusSummary.type) {
      case 'review': return '#FEB2B2';
      case 'add': return '#FED7AA';
      case 'mixed': return '#FDE68A';
      case 'done': return '#BBF7D0';
      default: return '#E2E8F0';
    }
  };
  
  return (
    <View style={[
      styles.statusMessageCard,
      { 
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
      }
    ]}>
      <Text style={styles.statusMessageText}>{statusSummary.message}</Text>
    </View>
  );
}

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
function NotebookCard({ notebook, stats, buttonState, onPress, onButtonPress, stageStats }: NotebookCardProps & { stageStats?: NotebookStageStats }) {
  const totalWords = stats?.total || 0;
  const masteredWords = stats?.mastered || 0;

  // Stage progression logic
  const bronzeCount = stageStats?.bronze || 0;
  const silverCount = stageStats?.silver || 0;
  const goldCount = stageStats?.gold || 0;
  
  const isSilverUnlocked = silverCount > 0;
  const isGoldUnlocked = goldCount > 0;

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
            {/* Dynamic Stage Circles */}
            <StageCircle 
              stage="bronze" 
              count={bronzeCount} 
              isUnlocked={true} // Bronze is always unlocked
            />
            
            <StageCircle 
              stage="silver" 
              count={silverCount} 
              isUnlocked={isSilverUnlocked}
            />
            
            <StageCircle 
              stage="gold" 
              count={goldCount} 
              isUnlocked={isGoldUnlocked}
            />
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
  const { data: stageStats } = useNotebookStageStats(notebook.id);
  const buttonState = useNotebookButtonState(notebook, currentTime);
  
  return (
    <NotebookCard
      notebook={notebook}
      stats={stats}
      buttonState={buttonState}
      stageStats={stageStats}
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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { isProUser, totalWordCount } = useSubscription();
  
  const { width: screenWidth } = Dimensions.get('window');
  const { currentTime } = useCurrentTime();
  
  const router = useRouter();
  const { data: notebooks, isLoading } = useNotebooks();
  const { data: profile } = useProfile();
  
  // Calculate display streak
  const streakInfo = calculateDisplayStreak(profile, currentTime);
  const displayStreak = streakInfo.streak;
  const streakStatus = streakInfo.status;


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
        <Header title="Gold List" rightElement={<HeaderProButton />} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="Gold List" 
        showStreak={true}
        streakValue={displayStreak}
        streakStatus={streakStatus as 'completed' | 'pending' | 'broken'}
        rightElement={<HeaderProButton />}
      />

      {/* Weekly Progress Strip */}
      <WeeklyProgressStrip />

      {/* Status Message */}
      <StatusMessageCard />

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


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7', // Biraz daha sıcak bir gri
  },
  
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

  // STATUS MESSAGE CARD
  statusMessageCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4, // 3D effect
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMessageText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B4B4B',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

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
  
  // PRO BUTTON STYLES
  proButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFA500',
    borderBottomWidth: 3,
    borderBottomColor: '#D97706',
    position: 'relative',
  },
  proButtonActive: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
    borderBottomColor: '#E6C200',
  },
  warningDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  }
});