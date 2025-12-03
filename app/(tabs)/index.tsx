import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Modal, 
  Alert, 
  FlatList,
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { supabase } from '../../lib/supabase';
import { useNotebooks, useProfile, useNotebookStats, useNotebookButtonState, useWeeklyWordCounts } from '../../lib/database-hooks';
import { useCurrentTime } from '../../lib/time-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to validate streak based on last activity
function calculateDisplayStreak(profile: any, currentTime: Date) {
  if (!profile?.last_activity_date) {
    // First time user or no activity recorded
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
    // Activity done today → Show streak (completed, safe)
    return { streak: profile.current_streak || 0, status: 'completed' };
  }
  
  if (diffDays === 1) {
    // Activity done yesterday → Show streak (pending, needs action today)
    return { streak: profile.current_streak || 0, status: 'pending' };
  }
  
  // diffDays >= 2: Activity done before yesterday → Show 0 (broken, missed yesterday)
  return { streak: 0, status: 'broken' };
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
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '---'; // Fallback for invalid dates
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const isToday = (date: Date): boolean => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false; // Safe fallback for invalid dates
    }
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
          
          // Additional safeguard: skip rendering if date is invalid
          if (!dayData.date) {
            console.warn('Invalid dayData.date found:', dayData);
            return null;
          }
          
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

// Helper function to get country code for language flag
function getLanguageCountryCode(language: string): string {
  const countryCodeMap: { [key: string]: string } = {
    Spanish: 'ES',
    French: 'FR', 
    German: 'DE',
    Italian: 'IT',
    English: 'GB',
    Portuguese: 'PT',
    Russian: 'RU',
    Japanese: 'JP',
    Chinese: 'CN',
    Korean: 'KR',
    Arabic: 'SA',
    Dutch: 'NL',
    Swedish: 'SE',
    Norwegian: 'NO',
    Polish: 'PL',
    Turkish: 'TR',
    Hindi: 'IN'
  };
  return countryCodeMap[language] || 'UN'; // Default UN flag
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

function NotebookCard({ notebook, stats, buttonState, onPress, onButtonPress }: NotebookCardProps) {
  return (
    <View style={styles.notebookCard}>
      {/* Header with circles and flag */}
      <View style={styles.notebookHeader}>
        <View style={styles.progressCircles}>
          <View style={[styles.circle, styles.bronzeCircle]}>
            <Text style={styles.circleText}>0</Text>
          </View>
          <View style={[styles.circle, styles.silverCircle]}>
            <Ionicons name="lock-closed" size={12} color="white" />
          </View>
          <View style={[styles.circle, styles.goldCircle]}>
            <Ionicons name="lock-closed" size={12} color="white" />
          </View>
        </View>
        <CountryFlag 
          isoCode={getLanguageCountryCode(notebook.target_language || 'Spanish')} 
          size={48} 
          style={styles.flagIcon} 
        />
      </View>
      
      {/* Content area - clickable */}
      <TouchableOpacity style={styles.notebookContent} onPress={onPress}>
        <Text style={styles.notebookTitle}>{notebook.name}</Text>
        <Text style={styles.notebookStats}>
          {stats ? `${stats.total} total • ${stats.mastered} mastered` : "Loading..."}
        </Text>
      </TouchableOpacity>
      
      {/* Action button */}
      <TouchableOpacity 
        style={[
          styles.actionButton, 
          buttonState?.state === 'review' ? styles.reviewButton :
          buttonState?.state === 'done' ? styles.doneButton : 
          styles.addWordsButton
        ]} 
        onPress={onButtonPress}
      >
        <Text style={[
          styles.actionButtonText,
          buttonState?.state === 'review' ? styles.reviewButtonText :
          buttonState?.state === 'done' ? styles.doneButtonText :
          styles.addWordsButtonText
        ]}>
          {buttonState?.text || "Loading..."}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Wrapper component that fetches stats and button state for each notebook
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
  
  // Calculate display streak with three-state logic
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

  const handleCreateNotebook = () => {
    router.push('/create-notebook');
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

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
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

      {/* Content: Notebooks List or Empty State */}
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
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setCurrentSlideIndex(index);
              }}
            />
          </View>
          {/* Pagination Dots - Right after notebooks container */}
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
          {/* Spacer to push content up from tab bar */}
          <View style={styles.spacer} />
        </>
      ) : (
        <EmptyNotebooks onCreateNotebook={handleCreateNotebook} />
      )}

      {/* FAB - Always show for easy notebook creation */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleCreateNotebook}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>


      {/* Developer Menu (Only visible in DEV) */}
      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => setShowDevMenu(true)}
          >
            <Text style={styles.devButtonText}>🔧 Dev</Text>
          </TouchableOpacity>

          <Modal
            visible={showDevMenu}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDevMenu(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Developer Options</Text>

                {isSimulated && (
                  <>
                    <Text style={styles.simulatedTime}>
                      Simulated: {currentTime.toLocaleDateString()}
                    </Text>
                    <Text style={styles.simulatedTime}>
                      Days simulated: {Math.floor((currentTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + 2}
                    </Text>
                  </>
                )}

                <TouchableOpacity style={styles.modalButton} onPress={addDay}>
                  <Text style={styles.modalButtonText}>+1 Day</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalButton} onPress={resetToNow}>
                  <Text style={styles.modalButtonText}>Reset Time</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalButton} onPress={handleSignOut}>
                  <Text style={styles.modalButtonText}>Sign Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.dangerButton]}
                  onPress={handleClearStorage}
                >
                  <Text style={styles.modalButtonText}>Clear Storage</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  streakContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
  },
  brokenStreakText: {
    color: '#999',
    opacity: 0.7,
  },
  pendingStreakText: {
    color: '#999',
    opacity: 0.6,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  notificationNumber: {
    backgroundColor: '#FFA500',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 8,
  },
  notificationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  notebooksContainer: {
    paddingTop: 20,
    height: 240, // Reduced height for notebooks
  },
  notebooksList: {
    // Horizontal list styling handled by container
  },
  notebookCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  notebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressCircles: {
    flexDirection: 'row',
    gap: 6,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bronzeCircle: {
    backgroundColor: '#8B4513',
  },
  silverCircle: {
    backgroundColor: '#A0A0A0',
  },
  goldCircle: {
    backgroundColor: '#B8860B',
  },
  circleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  flagIcon: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  notebookContent: {
    marginBottom: 16,
  },
  notebookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  notebookStats: {
    fontSize: 14,
    color: '#8A8A8A',
    lineHeight: 20,
  },
  // Base action button style
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  addWordsButton: {
    backgroundColor: '#FFA500', // Golden
  },
  reviewButton: {
    backgroundColor: '#FF4444', // Red
  },
  doneButton: {
    backgroundColor: '#4CAF50', // Green
  },
  // Base action button text style
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
  },
  addWordsButtonText: {
    // Inherits from actionButtonText
  },
  reviewButtonText: {
    // Inherits from actionButtonText
  },
  doneButtonText: {
    // Inherits from actionButtonText
  },
  statsGrid: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 110, // Above tab bar (85px) + margin (25px)
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFA500',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  dangerButton: {
    backgroundColor: '#FFE5E5',
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  simulatedTime: {
    fontSize: 14,
    color: '#FFA500',
    marginBottom: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingBottom: 140, // Space for tab bar
    marginTop: 20, // Space below header
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  createFirstButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 8,
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
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  spacer: {
    flex: 1,
    minHeight: 120, // Minimum space for tab bar + FAB
  },
  // Weekly Progress Strip styles
  weeklyProgressContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  weeklyProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  weeklyProgressStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayCircleActive: {
    backgroundColor: '#FFA500', // Orange/Gold for days with words
  },
  dayCircleInactive: {
    backgroundColor: '#E0E0E0', // Light gray for days with no words
  },
  dayCircleLoading: {
    backgroundColor: '#F5F5F5', // Very light gray for loading state
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: '#FFA500',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCircleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayCircleTextActive: {
    color: 'white', // White text on orange background
  },
  dayCircleTextInactive: {
    color: '#666', // Dark gray text on light gray background
  },
  dayCircleTextLoading: {
    color: '#CCC', // Light gray for loading
  },
  dayLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayLabelToday: {
    color: '#FFA500',
    fontWeight: '700',
  },
});