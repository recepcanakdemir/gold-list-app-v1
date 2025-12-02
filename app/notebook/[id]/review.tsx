import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewWords, useUpdateWordReview } from '../../../lib/database-hooks';
import { useCurrentTime } from '../../../lib/time-provider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = screenHeight * 0.5;
const SWIPE_THRESHOLD = screenWidth * 0.3;

// Color system for cards based on stage and round
function getCardColors(stage: string, round: number) {
  const stageKey = stage?.toLowerCase() || 'bronze';
  
  const colorMap = {
    bronze: {
      1: { backgroundColor: '#FF4444', textColor: '#FFFFFF', badgeEmoji: '🥉' },
      2: { backgroundColor: '#4CAF50', textColor: '#FFFFFF', badgeEmoji: '🥉' },
      3: { backgroundColor: '#2196F3', textColor: '#FFFFFF', badgeEmoji: '🥉' },
      4: { backgroundColor: '#FFD700', textColor: '#333333', badgeEmoji: '🥉' },
    },
    silver: {
      1: { backgroundColor: '#FF9800', textColor: '#FFFFFF', badgeEmoji: '🥈' },
      2: { backgroundColor: '#E91E63', textColor: '#FFFFFF', badgeEmoji: '🥈' },
      3: { backgroundColor: '#9E9E9E', textColor: '#FFFFFF', badgeEmoji: '🥈' },
      4: { backgroundColor: '#F5F5F5', textColor: '#333333', badgeEmoji: '🥈' },
    },
    gold: {
      1: { backgroundColor: '#FF6F00', textColor: '#FFFFFF', badgeEmoji: '🥇' },
      2: { backgroundColor: '#8D6E63', textColor: '#FFFFFF', badgeEmoji: '🥇' },
      3: { backgroundColor: '#81D4FA', textColor: '#333333', badgeEmoji: '🥇' },
      4: { backgroundColor: '#C8E6C9', textColor: '#333333', badgeEmoji: '🥇' },
    },
  };

  const stageColors = colorMap[stageKey as keyof typeof colorMap];
  const roundColors = stageColors?.[round as keyof typeof stageColors];
  
  // Fallback to bronze round 1 if invalid stage/round
  return roundColors || colorMap.bronze[1];
}

// Reusable Card Component
interface CardContentProps {
  word: any;
  isInteractive?: boolean;
  isFlipped?: boolean;
  onFlip?: () => void;
}

function CardContent({ word, isInteractive = false, isFlipped = false, onFlip }: CardContentProps) {
  // Get card colors based on word stage and round
  const cardColors = getCardColors(word?.stage, word?.round);
  
  // Safety check: If no word data, show placeholder
  if (!word) {
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: cardColors.backgroundColor }]} 
        onPress={isInteractive ? onFlip : undefined}
        activeOpacity={isInteractive ? 0.9 : 1}
        disabled={!isInteractive}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardInner}>
            <View style={styles.termContainer}>
              <Text style={[styles.term, { color: cardColors.textColor }]}>No Data</Text>
              <Text style={[styles.definition, { color: cardColors.textColor }]}>Word data not available</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: cardColors.backgroundColor }]} 
      onPress={isInteractive ? onFlip : undefined}
      activeOpacity={isInteractive ? 0.9 : 1}
      disabled={!isInteractive}
    >
      <View style={styles.cardContent}>
        {!isFlipped ? (
          // Front - Term
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.stageIndicatorContainer}>
                <Text style={styles.stageBadge}>{cardColors.badgeEmoji}</Text>
                <Text style={[styles.stageIndicator, { color: cardColors.textColor }]}>
                  {word?.stage?.toUpperCase() || 'UNKNOWN'} • Round {word?.round || '?'}
                </Text>
              </View>
            </View>
            <View style={styles.termContainer}>
              <Text style={[styles.term, { color: cardColors.textColor }]}>{word?.term || 'No term'}</Text>
            </View>
            {isInteractive && (
              <Text style={[styles.flipHint, { color: cardColors.textColor, opacity: 0.7 }]}>Tap to reveal definition</Text>
            )}
          </View>
        ) : (
          // Back - Definition
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <Text style={[styles.wordType, { color: cardColors.textColor }]}>{word?.type || 'No type'}</Text>
            </View>
            <View style={styles.definitionContainer}>
              <Text style={[styles.definition, { color: cardColors.textColor }]}>{word?.definition || 'No definition'}</Text>
              {word?.example_sentence && (
                <Text style={[styles.example, { color: cardColors.textColor, opacity: 0.8 }]}>
                  Example: {word.example_sentence}
                </Text>
              )}
            </View>
            {isInteractive && (
              <Text style={[styles.flipHint, { color: cardColors.textColor, opacity: 0.7 }]}>Swipe or use buttons below</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentTime } = useCurrentTime();
  
  const { data: reviewWords, isLoading } = useReviewWords(id as string, currentTime);
  const updateWordReview = useUpdateWordReview();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  // Static session snapshot to prevent word skipping
  const [sessionWords, setSessionWords] = useState<any[]>([]);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  
  // Session statistics tracking
  const [sessionStats, setSessionStats] = useState({
    remembered: 0,
    forgotten: 0,
    startTime: Date.now()
  });
  
  // Animation values using built-in Animated API
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Initialize static session snapshot once
  React.useEffect(() => {
    if (reviewWords && reviewWords.length > 0 && !sessionInitialized) {
      console.log('📚 Initializing session with words:', reviewWords.length, reviewWords);
      setSessionWords(reviewWords);
      setSessionInitialized(true);
    }
  }, [reviewWords, sessionInitialized]);
  
  // Use static session words to prevent skipping
  const currentWord = sessionWords[currentCardIndex];
  const nextWord = sessionWords[currentCardIndex + 1];
  const remainingCount = Math.max(0, sessionWords.length - currentCardIndex);
  const isSessionComplete = currentCardIndex >= sessionWords.length;
  
  // Debug logging
  console.log('🎯 Current state:', {
    sessionWords: sessionWords.length,
    currentCardIndex,
    currentWord: currentWord?.term,
    nextWord: nextWord?.term,
    remainingCount,
    isSessionComplete
  });

  const resetCard = () => {
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const nextCard = () => {
    if (currentCardIndex < sessionWords.length) {
      setCurrentCardIndex(prev => prev + 1);
      setIsCardFlipped(false);
      // Animation values will be reset in useEffect after re-render
    }
  };

  // Reset animation values AFTER component re-renders with new card index
  React.useEffect(() => {
    pan.setValue({ x: 0, y: 0 }); // Keep y for PanResponder compatibility
    scaleAnim.setValue(1);
  }, [currentCardIndex]);

  const handleReviewResult = (remembered: boolean) => {
    if (!currentWord) return;

    // Update session statistics
    setSessionStats(prev => ({
      ...prev,
      remembered: prev.remembered + (remembered ? 1 : 0),
      forgotten: prev.forgotten + (remembered ? 0 : 1)
    }));

    // Fire-and-forget database update (instant UI, background sync)
    updateWordReview.mutate({
      wordId: currentWord.id,
      remembered,
      currentTime,
    }, {
      onError: (error) => {
        console.error('Review update error (background):', error);
        // Note: Could show toast notification here if needed
      }
    });
  };

  const flipCard = () => {
    const newFlipped = !isCardFlipped;
    setIsCardFlipped(newFlipped);
    // Removed animation - instant flip
  };

  // PanResponder for swipe gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({
        x: (pan.x as any)._value,
        y: (pan.y as any)._value,
      });
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: false,
      }).start();
    },
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gestureState) => {
      pan.flattenOffset();
      
      const { dx } = gestureState;
      const isSwipeRight = dx > SWIPE_THRESHOLD;
      const isSwipeLeft = dx < -SWIPE_THRESHOLD;
      
      if (isSwipeRight) {
        // Remembered - animate off screen right
        Animated.timing(pan, {
          toValue: { x: screenWidth * 1.5, y: 0 },
          duration: 150, // Faster animation for snappy feel
          useNativeDriver: false,
        }).start(() => {
          // Instant UI update + background DB sync
          handleReviewResult(true);
          nextCard();
        });
      } else if (isSwipeLeft) {
        // Forgotten - animate off screen left
        Animated.timing(pan, {
          toValue: { x: -screenWidth * 1.5, y: 0 },
          duration: 150, // Faster animation for snappy feel
          useNativeDriver: false,
        }).start(() => {
          // Instant UI update + background DB sync
          handleReviewResult(false);
          nextCard();
        });
      } else {
        // Reset card to center
        resetCard();
      }
    },
  });

  // Interpolations for animations
  const cardRotation = pan.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });


  const rightOverlayOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftOverlayOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Stack Zoom Animation: Next card scales up as active card is swiped
  const nextCardScale = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [1.0, 0.9, 1.0],
    extrapolate: 'clamp',
  });

  // Next card opacity: Fade to full opacity as we swipe away
  const nextCardOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [1, 0.8, 1],
    extrapolate: 'clamp',
  });

  // Removed nextCardTranslateY interpolation for stability - using static vertical positioning

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading review...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionWords || sessionWords.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No words due for review today.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Notebook</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isSessionComplete) {
    const totalReviewed = sessionStats.remembered + sessionStats.forgotten;
    const successRate = totalReviewed > 0 ? Math.round((sessionStats.remembered / totalReviewed) * 100) : 0;
    const sessionDuration = Math.round((Date.now() - sessionStats.startTime) / 1000 / 60); // minutes
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Summary</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>🎉 Session Complete!</Text>
          
          {/* Main Stats */}
          <View style={styles.mainStatsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalReviewed}</Text>
              <Text style={styles.statLabel}>Words Reviewed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{sessionStats.remembered}</Text>
              <Text style={styles.statLabel}>Remembered</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#F44336' }]}>{sessionStats.forgotten}</Text>
              <Text style={styles.statLabel}>Forgotten</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Success Rate: {successRate}%</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${successRate}%`, backgroundColor: successRate >= 70 ? '#4CAF50' : successRate >= 50 ? '#FF9800' : '#F44336' }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* Session Info */}
          <View style={styles.sessionInfoContainer}>
            <View style={styles.sessionInfoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.sessionInfoText}>Duration: {sessionDuration} min</Text>
            </View>
            {successRate >= 80 && (
              <View style={styles.sessionInfoRow}>
                <Ionicons name="trophy-outline" size={20} color="#FFD700" />
                <Text style={styles.sessionInfoText}>Excellent performance! 🌟</Text>
              </View>
            )}
            {successRate >= 70 && successRate < 80 && (
              <View style={styles.sessionInfoRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                <Text style={styles.sessionInfoText}>Good job! Keep it up! 👍</Text>
              </View>
            )}
            {successRate < 70 && (
              <View style={styles.sessionInfoRow}>
                <Ionicons name="refresh-outline" size={20} color="#FF9800" />
                <Text style={styles.sessionInfoText}>Review these words again soon 📚</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.summaryActions}>
            <TouchableOpacity 
              style={[styles.summaryButton, styles.primaryButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.summaryButtonText}>Back to Notebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {Math.min(currentCardIndex + 1, sessionWords.length)}/{sessionWords.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(Math.min(currentCardIndex + 1, sessionWords.length) / sessionWords.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.remainingText}>
          {remainingCount} left
        </Text>
      </View>

      {/* Stacked Card Container */}
      <View style={styles.cardContainer}>
        {/* Map-Based Stable Rendering - Prevents Flicker */}
        {sessionWords.map((word, index) => {
          // Only render current and next cards
          if (index === currentCardIndex) {
            // Active Card (Top Layer) - Interactive
            return (
              <Animated.View 
                key={word.id}
                {...panResponder.panHandlers}
                style={[
                  styles.cardWrapper,
                  styles.activeCard,
                  {
                    transform: [
                      { translateX: pan.x },
                      { rotate: cardRotation },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                {/* Swipe Overlays */}
                <Animated.View style={[styles.overlay, styles.rememberedOverlay, { opacity: rightOverlayOpacity }]}>
                  <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                  <Text style={styles.overlayText}>Remembered!</Text>
                </Animated.View>
                
                <Animated.View style={[styles.overlay, styles.forgottenOverlay, { opacity: leftOverlayOpacity }]}>
                  <Ionicons name="close-circle" size={80} color="#F44336" />
                  <Text style={styles.overlayText}>Forgotten</Text>
                </Animated.View>

                <CardContent 
                  word={word}
                  isInteractive={true}
                  isFlipped={isCardFlipped}
                  onFlip={flipCard}
                />
              </Animated.View>
            );
          } else if (index === currentCardIndex + 1) {
            // Next Card (Bottom Layer) - Dynamic Scale and Opacity, Static Position
            return (
              <Animated.View 
                key={word.id}
                style={[
                  styles.cardWrapper, 
                  styles.nextCard,
                  {
                    opacity: nextCardOpacity,
                    transform: [
                      { scale: nextCardScale },
                      { translateY: 8 } // Static stacked offset for visual depth
                    ]
                  }
                ]}
              >
                <CardContent 
                  word={word}
                  isInteractive={false}
                  isFlipped={false}
                />
              </Animated.View>
            );
          }
          
          // Don't render other cards
          return null;
        })}
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.forgotButton]}
          onPress={() => {
            handleReviewResult(false);
            nextCard();
          }}
        >
          <Ionicons name="close" size={24} color="white" />
          <Text style={styles.controlButtonText}>Forgot</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.revealButton]}
          onPress={flipCard}
        >
          <Ionicons name="eye" size={24} color="white" />
          <Text style={styles.controlButtonText}>
            {isCardFlipped ? 'Hide' : 'Reveal'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.rememberedButton]}
          onPress={() => {
            handleReviewResult(true);
            nextCard();
          }}
        >
          <Ionicons name="checkmark" size={24} color="white" />
          <Text style={styles.controlButtonText}>Remembered</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 60,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 14,
    color: '#666',
    minWidth: 50,
    textAlign: 'right',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'absolute',
  },
  activeCard: {
    zIndex: 2,
  },
  nextCard: {
    zIndex: 1,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    zIndex: 10,
  },
  rememberedOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  forgottenOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  overlayText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardInner: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardHeader: {
    alignItems: 'center',
  },
  stageIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBadge: {
    fontSize: 16,
    marginRight: 8,
  },
  stageIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  wordType: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  termContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  term: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  definitionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  definition: {
    fontSize: 20,
    color: '#333',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 16,
  },
  example: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  flipHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  controlButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    flex: 1,
    marginHorizontal: 4,
  },
  forgotButton: {
    backgroundColor: '#F44336',
  },
  revealButton: {
    backgroundColor: '#2196F3',
  },
  rememberedButton: {
    backgroundColor: '#4CAF50',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Summary Page Styles
  summaryContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  mainStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 2,
  },
  sessionInfoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionInfoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  summaryActions: {
    marginTop: 'auto',
  },
  summaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  summaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});