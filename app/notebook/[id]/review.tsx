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
  Modal,
  FlatList,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReviewWords, useUpdateWordReview, usePageTitle } from '../../../lib/database-hooks';
import { useCurrentTime } from '../../../lib/time-provider';
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../../styles/theme';
import { Header } from '../../../components/Header';

// Helper function to render text with **bold** markdown formatting
function renderTextWithBold(text: string, baseStyle: any, boldStyle?: any) {
  if (!text) return null;
  
  // Split text by **bold** patterns
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        // Check if part is bold (wrapped in **)
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2); // Remove ** from both ends
          return (
            <Text key={index} style={[baseStyle, { fontWeight: 'bold' }, boldStyle]}>
              {boldText}
            </Text>
          );
        } else {
          return part;
        }
      })}
    </Text>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = screenHeight * 0.5;
const SWIPE_THRESHOLD = screenWidth * 0.3;

// Circular Progress Component
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  backgroundColor?: string;
  showText?: boolean;
  textSize?: number;
}

function CircularProgress({ 
  percentage, 
  size = 60, 
  strokeWidth = 6, 
  color, 
  backgroundColor = '#E0E0E0',
  showText = true,
  textSize = 12
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.circularProgress, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showText && (
        <View style={styles.progressTextContainer}>
          <Text style={[styles.progressText, { fontSize: textSize, color }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      )}
    </View>
  );
}

// Page Context Display Component
function PageContextDisplay({ notebookId, pageNumber }: { notebookId: string, pageNumber: number }) {
  const { data: pageTitle } = usePageTitle(notebookId, pageNumber);
  
  if (!pageTitle) return null;
  
  return (
    <View style={styles.contextContainer}>
      <Text style={styles.contextText}>
        Context: {pageTitle}
      </Text>
    </View>
  );
}

// Word List Modal Component (Bottom Sheet)
interface WordListModalProps {
  visible: boolean;
  onClose: () => void;
  words: any[];
  title: string;
  type: 'remembered' | 'forgotten';
}

function WordListModal({ visible, onClose, words, title, type }: WordListModalProps) {
  const renderWordItem = ({ item }: { item: any }) => {
    const cardColors = getCardColors(item?.stage, item?.round);
    
    return (
      <View style={[styles.wordItem, { borderLeftColor: cardColors.borderColor }]}>
        <View style={styles.wordHeader}>
          <Text style={[styles.wordTerm, { color: cardColors.textColor }]}>{item.term}</Text>
          <View style={styles.stageRoundBadge}>
            <Text style={styles.badgeText}>{cardColors.badgeEmoji}</Text>
            <Text style={[styles.stageRoundText, { color: cardColors.textColor }]}>
              {item.stage?.toUpperCase()} R{item.round}
            </Text>
          </View>
        </View>
        <Text style={styles.wordDefinition}>{item.definition}</Text>
        {item.example_sentence && (
          <View style={styles.wordExample}>
            {renderTextWithBold(
              item.example_sentence,
              [styles.exampleText, { color: cardColors.textColor, opacity: 0.8 }]
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <Header 
          title={title}
          noPadding={true}
          leftElement={
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          }
        />
        
        <View style={styles.modalContent}>
          {words.length === 0 ? (
            <View style={styles.emptyWordsList}>
              <Text style={styles.emptyWordsText}>
                No {type} words in this session
              </Text>
            </View>
          ) : (
            <FlatList
              data={words}
              renderItem={renderWordItem}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.wordsList}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Color system for cards based on stage and round
function getCardColors(stage: string, round: number) {
  const stageKey = stage?.toLowerCase() || 'bronze';
  
  const colorMap = {
    bronze: {
      1: { backgroundColor: '#FFECEC', borderColor: '#FF4444', borderBottomColor: '#D32F2F', progressColor: '#FF4444', textColor: '#333333', badgeEmoji: '🥉' },
      2: { backgroundColor: '#E8F6E8', borderColor: '#4CAF50', borderBottomColor: '#388E3C', progressColor: '#4CAF50', textColor: '#333333', badgeEmoji: '🥉' },
      3: { backgroundColor: '#E3F2FD', borderColor: '#2196F3', borderBottomColor: '#1976D2', progressColor: '#2196F3', textColor: '#333333', badgeEmoji: '🥉' },
      4: { backgroundColor: '#FFFDE7', borderColor: '#FFD700', borderBottomColor: '#F57F17', progressColor: '#FFD700', textColor: '#333333', badgeEmoji: '🥉' },
    },
    silver: {
      1: { backgroundColor: '#FFF3E0', borderColor: '#FF9800', borderBottomColor: '#F57C00', progressColor: '#FF9800', textColor: '#333333', badgeEmoji: '🥈' },
      2: { backgroundColor: '#FCE4EC', borderColor: '#E91E63', borderBottomColor: '#C2185B', progressColor: '#E91E63', textColor: '#333333', badgeEmoji: '🥈' },
      3: { backgroundColor: '#F5F5F5', borderColor: '#9E9E9E', borderBottomColor: '#757575', progressColor: '#9E9E9E', textColor: '#333333', badgeEmoji: '🥈' },
      4: { backgroundColor: '#FAFAFA', borderColor: '#E0E0E0', borderBottomColor: '#BDBDBD', progressColor: '#E0E0E0', textColor: '#333333', badgeEmoji: '🥈' },
    },
    gold: {
      1: { backgroundColor: '#FFF8E1', borderColor: '#FF6F00', borderBottomColor: '#E65100', progressColor: '#FF6F00', textColor: '#333333', badgeEmoji: '🥇' },
      2: { backgroundColor: '#EFEBE9', borderColor: '#8D6E63', borderBottomColor: '#5D4037', progressColor: '#8D6E63', textColor: '#333333', badgeEmoji: '🥇' },
      3: { backgroundColor: '#F0F8FF', borderColor: '#81D4FA', borderBottomColor: '#29B6F6', progressColor: '#81D4FA', textColor: '#333333', badgeEmoji: '🥇' },
      4: { backgroundColor: '#F1F8E9', borderColor: '#C8E6C9', borderBottomColor: '#81C784', progressColor: '#C8E6C9', textColor: '#333333', badgeEmoji: '🥇' },
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
        style={[styles.card, { 
          backgroundColor: cardColors.backgroundColor,
          borderColor: cardColors.borderColor,
          borderBottomColor: cardColors.borderBottomColor
        }]} 
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
      style={[styles.card, { 
        backgroundColor: cardColors.backgroundColor,
        borderColor: cardColors.borderColor,
        borderBottomColor: cardColors.borderBottomColor
      }]} 
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
              {word?.example_sentence && (
                <View style={styles.exampleContainer}>
                  {renderTextWithBold(
                    word.example_sentence,
                    [styles.example, { color: cardColors.textColor, opacity: 0.8 }]
                  )}
                </View>
              )}
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
  
  // Modal states for word lists
  const [showRememberedModal, setShowRememberedModal] = useState(false);
  const [showForgottenModal, setShowForgottenModal] = useState(false);
  
  // Static session snapshot to prevent word skipping
  const [sessionWords, setSessionWords] = useState<any[]>([]);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  
  // Enhanced session statistics tracking
  const [sessionStats, setSessionStats] = useState({
    remembered: 0,
    forgotten: 0,
    startTime: Date.now(),
    rememberedWords: [] as any[],
    forgottenWords: [] as any[],
    stageRoundStats: {} as Record<string, { remembered: number; total: number }>
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

    // Create stage-round key for tracking
    const stageRoundKey = `${currentWord.stage}-${currentWord.round}`;

    // Update enhanced session statistics
    setSessionStats(prev => {
      const newStageRoundStats = { ...prev.stageRoundStats };
      
      // Initialize stage-round if not exists
      if (!newStageRoundStats[stageRoundKey]) {
        newStageRoundStats[stageRoundKey] = { remembered: 0, total: 0 };
      }
      
      // Update stage-round stats
      newStageRoundStats[stageRoundKey].total += 1;
      if (remembered) {
        newStageRoundStats[stageRoundKey].remembered += 1;
      }

      return {
        ...prev,
        remembered: prev.remembered + (remembered ? 1 : 0),
        forgotten: prev.forgotten + (remembered ? 0 : 1),
        rememberedWords: remembered 
          ? [...prev.rememberedWords, currentWord]
          : prev.rememberedWords,
        forgottenWords: !remembered 
          ? [...prev.forgottenWords, currentWord]
          : prev.forgottenWords,
        stageRoundStats: newStageRoundStats
      };
    });

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
        <Header 
          title="Review"
          noPadding={true}
          leftElement={
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          }
        />
        
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
    
    // Helper function to render stage-round progress bars
    const renderStageRounds = (stage: string, emoji: string) => {
      const rounds = [1, 2, 3, 4];
      const stageRounds = rounds
        .map(round => {
          const key = `${stage}-${round}`;
          const stats = sessionStats.stageRoundStats[key];
          return stats ? { round, ...stats, key } : null;
        })
        .filter(Boolean);
      
      // Only render if there are words for this stage
      if (stageRounds.length === 0) return null;
      
      return (
        <View key={stage} style={styles.stageSection}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageEmoji}>{emoji}</Text>
            <Text style={styles.stageTitle}>{stage.toUpperCase()}</Text>
          </View>
          <View style={styles.roundsContainer}>
            {stageRounds.map((roundData: any) => {
              const percentage = (roundData.remembered / roundData.total) * 100;
              const cardColors = getCardColors(stage, roundData.round);
              
              return (
                <View key={roundData.key} style={styles.roundItem}>
                  <CircularProgress
                    percentage={percentage}
                    size={50}
                    strokeWidth={5}
                    color={cardColors.progressColor}
                    textSize={10}
                  />
                  <Text style={styles.roundLabel}>R{roundData.round}</Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    };
    
    return (
      <>
        <SafeAreaView style={styles.container}>
          <Header 
            title="Review Summary"
            noPadding={true}
            leftElement={
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            }
          />
          
          <View style={styles.newSummaryContainer}>
            {/* Congrats Message */}
            <Text style={styles.newSummaryTitle}>🎉 Great Job!</Text>
            
            {/* Overall Score Circle */}
            <View style={styles.overallScoreSection}>
              <CircularProgress
                percentage={successRate}
                size={120}
                strokeWidth={8}
                color={successRate >= 70 ? '#4CAF50' : successRate >= 50 ? '#FF9800' : '#F44336'}
                textSize={18}
              />
              <Text style={styles.overallScoreLabel}>
                {sessionStats.remembered}/{totalReviewed} words mastered
              </Text>
            </View>
            
            {/* Stage-Round Breakdown */}
            <View style={styles.stageBreakdownSection}>
              {renderStageRounds('bronze', '🥉')}
              {renderStageRounds('silver', '🥈')}
              {renderStageRounds('gold', '🥇')}
            </View>
            
            {/* Action Buttons */}
            <View style={styles.newSummaryActions}>
              <TouchableOpacity 
                style={[styles.newActionButton, styles.rememberedButton]}
                onPress={() => setShowRememberedModal(true)}
              >
                <Text style={styles.newActionButtonText}>Remembered Words</Text>
                <Text style={styles.actionButtonCount}>({sessionStats.remembered})</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.newActionButton, styles.forgottenButton]}
                onPress={() => setShowForgottenModal(true)}
              >
                <Text style={styles.newActionButtonText}>Forgotten Words</Text>
                <Text style={styles.actionButtonCount}>({sessionStats.forgotten})</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.newActionButton, styles.backButton]}
                onPress={() => router.back()}
              >
                <Text style={styles.newActionButtonText}>Back to Notebook</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        
        {/* Word List Modals */}
        <WordListModal
          visible={showRememberedModal}
          onClose={() => setShowRememberedModal(false)}
          words={sessionStats.rememberedWords}
          title="Remembered Words"
          type="remembered"
        />
        
        <WordListModal
          visible={showForgottenModal}
          onClose={() => setShowForgottenModal(false)}
          words={sessionStats.forgottenWords}
          title="Forgotten Words"
          type="forgotten"
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header 
        title="Review"
        noPadding={true}
        leftElement={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        }
      />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {Math.min(currentCardIndex + 1, sessionWords.length)}/{sessionWords.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${(Math.min(currentCardIndex + 1, sessionWords.length) / sessionWords.length) * 100}%`,
                backgroundColor: currentWord ? getCardColors(currentWord.stage, currentWord.round).progressColor : Colors.primary
              }
            ]} 
          />
        </View>
        <Text style={styles.remainingText}>
          {remainingCount} left
        </Text>
      </View>

      {/* Page Context */}
      {currentWord?.pages?.page_number && (
        <PageContextDisplay notebookId={id as string} pageNumber={currentWord.pages.page_number} />
      )}

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

      {/* Swipe Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionText}>
          💡 Swipe left if you forgot • Swipe right if you remembered
        </Text>
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
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.revealButton]}
          onPress={flipCard}
        >
          <Ionicons name={isCardFlipped ? "eye-off" : "eye"} size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.rememberedButton]}
          onPress={() => {
            handleReviewResult(true);
            nextCard();
          }}
        >
          <Ionicons name="checkmark" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.page,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.titleLarge,
    color: Colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  progressText: {
    ...Typography.titleMedium,
    minWidth: 60,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.inactive,
    borderRadius: BorderRadius.small,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.small,
  },
  remainingText: {
    ...Typography.subtitleSmall,
    minWidth: 50,
    textAlign: 'right',
  },
  contextContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  contextText: {
    ...Typography.subtitleSmall,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  circularProgress: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontWeight: 'bold',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
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
    ...Effects3D.card,
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
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
    marginBottom: 16,
  },
  exampleContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
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
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    opacity: 0.8,
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
    ...Effects3D.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.large,
    width: 70,
    height: 70,
    marginHorizontal: 8,
  },
  forgotButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
    borderBottomColor: '#D32F2F',
  },
  revealButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
    borderBottomColor: '#1976D2',
  },
  rememberedButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderBottomColor: '#388E3C',
  },
  controlButtonText: {
    ...Typography.buttonMedium,
    color: 'white',
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
  
  // New Summary Page Styles
  newSummaryContainer: {
    flex: 1,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  newSummaryTitle: {
    ...Typography.headerLarge,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    color: Colors.textPrimary,
  },
  overallScoreSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  overallScoreLabel: {
    ...Typography.titleMedium,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  stageBreakdownSection: {
    marginBottom: Spacing.xxxl,
  },
  stageSection: {
    marginBottom: Spacing.xl,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stageEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  stageTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
  },
  roundsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.lg,
    paddingLeft: Spacing.xl,
  },
  roundItem: {
    alignItems: 'center',
  },
  roundLabel: {
    ...Typography.captionBold,
    marginTop: Spacing.xs,
    color: Colors.textMuted,
  },
  newSummaryActions: {
    gap: Spacing.md,
  },
  newActionButton: {
    ...Effects3D.button,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rememberedButton: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
    borderBottomColor: Colors.successDark,
  },
  forgottenButton: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    borderBottomColor: Colors.errorDark,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
  },
  newActionButtonText: {
    ...Typography.buttonLarge,
    color: Colors.white,
  },
  actionButtonCount: {
    ...Typography.buttonMedium,
    color: Colors.white,
    opacity: 0.9,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.xl,
  },
  wordsList: {
    paddingBottom: Spacing.xl,
  },
  wordItem: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  wordTerm: {
    ...Typography.titleLarge,
    flex: 1,
    marginRight: Spacing.md,
  },
  stageRoundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeText: {
    fontSize: 16,
  },
  stageRoundText: {
    ...Typography.captionBold,
    fontSize: 12,
  },
  wordDefinition: {
    ...Typography.body,
    color: Colors.textBody,
    marginBottom: Spacing.xs,
  },
  wordExample: {
    marginTop: Spacing.xs,
  },
  exampleText: {
    ...Typography.body,
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyWordsList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWordsText: {
    ...Typography.titleMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});