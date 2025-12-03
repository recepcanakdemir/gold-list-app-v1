import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useProfile, useDashboardStats, useActivityLog } from '../../lib/database-hooks';
import { useCurrentTime } from '../../lib/time-provider';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

interface ModernCircleProgressProps {
  percentage: number;
  color: string;
  size?: number;
  animate?: boolean;
}

function ModernCircleProgress({ percentage, color, size = 120, animate = true }: ModernCircleProgressProps) {
  const animatedOffset = useRef(new Animated.Value(0)).current;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const targetOffset = circumference - (percentage / 100) * circumference;
    
    if (animate) {
      // Start from full circumference (0% visible) and animate to target
      animatedOffset.setValue(circumference);
      Animated.timing(animatedOffset, {
        toValue: targetOffset,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      animatedOffset.setValue(targetOffset);
    }
  }, [percentage, animate, circumference]);

  return (
    <View style={[styles.circleProgress, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle - only show if percentage > 0 */}
        {percentage > 0 && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={[circumference, circumference]}
            strokeDashoffset={animatedOffset}
          />
        )}
      </Svg>
      
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.percentageText, { color }]}>
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
}

interface GitHubHeatmapProps {
  activityDates: { date: Date }[];
  currentTime: Date;
}

// Helper function to validate activity data
function validateActivityData(activityDates: { date: Date }[] | undefined): { date: Date }[] {
  if (!Array.isArray(activityDates)) {
    console.warn('activityDates is not an array:', activityDates);
    return [];
  }
  
  return activityDates.filter(({ date }) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Filtering out invalid date:', date);
      return false;
    }
    return true;
  });
}

function GitHubStyleHeatmap({ activityDates, currentTime }: GitHubHeatmapProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const daysToShow = 365; // Show past year
  
  // Validate and sanitize activity data
  const validActivityDates = validateActivityData(activityDates);
  
  // Generate array of past X days from today
  const generateDateRange = () => {
    const dates = [];
    
    // Validate currentTime first
    if (!currentTime || !(currentTime instanceof Date) || isNaN(currentTime.getTime())) {
      console.error('Invalid currentTime provided to heatmap:', currentTime);
      return [];
    }
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(currentTime);
      date.setDate(date.getDate() - i);
      
      // Validate the generated date
      if (!isNaN(date.getTime())) {
        dates.push(date);
      }
    }
    return dates;
  };

  // Create activity lookup for fast checking (using pre-validated data)
  const activityMap = new Set(
    validActivityDates.map(({ date }) => date.toDateString())
  );

  // Check if a date has activity (with additional safety)
  const hasActivity = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    return activityMap.has(date.toDateString());
  };

  // Group dates into weeks (GitHub style: columns = weeks, rows = days)
  const createWeekGrid = (dates: Date[]) => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    dates.forEach((date, index) => {
      currentWeek.push(date);
      
      // Complete week every 7 days or at the end
      if (currentWeek.length === 7 || index === dates.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const allDates = generateDateRange();
  const weekGrid = createWeekGrid(allDates);

  // Auto-scroll to the end (today) when component mounts
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  return (
    <View style={styles.heatmapContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heatmapScrollContent}
      >
        {weekGrid.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.heatmapWeek}>
            {week.map((date) => {
              const isActive = hasActivity(date);
              return (
                <View
                  key={date.toDateString()}
                  style={[
                    styles.heatmapDay,
                    isActive ? styles.heatmapActiveDay : styles.heatmapInactiveDay,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function DashboardScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'Week' | 'Month'>('Week');
  const [refreshing, setRefreshing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  const { currentTime } = useCurrentTime();
  const { data: profile } = useProfile();
  const { data: dashboardStats, isLoading: statsLoading, refetch } = useDashboardStats(selectedPeriod);
  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useActivityLog(365);

  // Real data from RPC function
  const wordsAddedPercentage = dashboardStats?.words_added_percentage || 0;
  const masteryRatePercentage = dashboardStats?.mastery_rate_percentage || 0;
  
  // Calculate display streak with three-state logic
  const streakInfo = calculateDisplayStreak(profile, currentTime);
  const currentStreak = streakInfo.streak;
  const streakStatus = streakInfo.status;

  // Determine colors based on Goldlist performance
  const getMasteryColor = (percentage: number) => {
    if (percentage >= 100) return '#4CAF50'; // Green when at or above 100% (Success)
    if (percentage >= 70) return '#FFA500';  // Orange when 70-99%
    return '#FF5722';                        // Red when below 70%
  };

  // Auto-refetch on focus + trigger animations
  useFocusEffect(
    useCallback(() => {
      refetch(); // Fresh stats data
      refetchActivity(); // Fresh activity data
      setShouldAnimate(true); // Trigger animations
      return () => setShouldAnimate(false); // Reset on blur
    }, [refetch, refetchActivity])
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setShouldAnimate(true); // Trigger animations on manual refresh
    await Promise.all([refetch(), refetchActivity()]);
    setRefreshing(false);
  }, [refetch, refetchActivity]);


  return (
    <View style={styles.container}>
      {/* Custom Header - No default header needed */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.streakContainer}>
          <Text style={[
            styles.streakText, 
            streakStatus === 'pending' && styles.pendingStreakText,
            streakStatus === 'broken' && styles.brokenStreakText
          ]}>
            {streakStatus === 'broken' ? '💔' : '🔥'} {currentStreak}
          </Text>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
            title="Updating dashboard..."
            titleColor="#666"
          />
        }
      >

      {/* Progress Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress Overview</Text>
          
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'Week' && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod('Week')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === 'Week' && styles.periodButtonTextActive,
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'Month' && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod('Month')}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === 'Month' && styles.periodButtonTextActive,
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Animated Progress Circles */}
        <View style={styles.progressCircles}>
          <View style={styles.progressItem}>
            <ModernCircleProgress 
              percentage={wordsAddedPercentage} 
              color="#FFA500" 
              animate={shouldAnimate}
            />
            <Text style={styles.progressLabel}>Words Added</Text>
            <Text style={styles.progressSubLabel}>
              {statsLoading ? '...' : `${dashboardStats?.words_added_period || 0}/${dashboardStats?.words_should_add || 0}`}
            </Text>
          </View>
          <View style={styles.progressItem}>
            <ModernCircleProgress 
              percentage={masteryRatePercentage} 
              color={getMasteryColor(masteryRatePercentage)} 
              animate={shouldAnimate}
            />
            <Text style={styles.progressLabel}>Mastery Rate</Text>
            <Text style={styles.progressSubLabel}>
              {statsLoading ? '...' : `${dashboardStats?.words_remembered_period || 0}/${dashboardStats?.words_reviewed_period || 0} reviewed`}
            </Text>
          </View>
        </View>

        {/* Additional Stats */}
        <View style={styles.additionalStats}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>{streakStatus === 'broken' ? '💔' : '🔥'}</Text>
            <Text style={[
              styles.statNumber, 
              streakStatus === 'pending' && styles.pendingStreakText,
              streakStatus === 'broken' && styles.brokenStreakText
            ]}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statNumber}>{dashboardStats?.total_words || 0}</Text>
            <Text style={styles.statLabel}>Total Words</Text>
          </View>
        </View>
      </View>

      {/* Daily Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Activity</Text>
        <Text style={styles.sectionSubtitle}>Golden squares show active days</Text>
        
        {activityLoading ? (
          <View style={styles.heatmapContainer}>
            <Text style={styles.heatmapLoadingText}>Loading activity...</Text>
          </View>
        ) : (
          <GitHubStyleHeatmap 
            activityDates={activityData || []} 
            currentTime={currentTime}
          />
        )}
        
        <View style={styles.heatmapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.heatmapInactiveDay]} />
            <Text style={styles.legendText}>No activity</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.heatmapActiveDay]} />
            <Text style={styles.legendText}>Active</Text>
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Developer Menu Button (Only visible in DEV) */}
      {__DEV__ && (
        <TouchableOpacity style={styles.devButton}>
          <Text style={styles.devButtonText}>🔧 Dev</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for tab bar and dev button
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
  section: {
    backgroundColor: 'white',
    marginHorizontal: 8,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 3,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  periodButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  progressCircles: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  progressSubLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  circleProgress: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  heatmapContainer: {
    marginVertical: 20,
    height: 130, // Fixed height for 7 days + spacing (increased for bigger squares)
  },
  heatmapLoadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingVertical: 40,
  },
  heatmapScrollContent: {
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  heatmapWeek: {
    marginHorizontal: 1,
    flexDirection: 'column',
  },
  heatmapDay: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginVertical: 1,
  },
  heatmapEmptyDay: {
    width: 16,
    height: 16,
    marginVertical: 1,
  },
  heatmapActiveDay: {
    backgroundColor: '#FFA500',
  },
  heatmapInactiveDay: {
    backgroundColor: '#E0E0E0',
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
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