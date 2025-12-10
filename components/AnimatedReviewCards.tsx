import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Colors, Typography, Effects3D, Spacing, BorderRadius } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = screenHeight * 0.4;

interface WordCard {
  term: string;
  definition: string;
  stage: string;
  round: number;
  id: number;
}

const DEMO_CARDS: WordCard[] = [
  { id: 1, term: 'Bonjour', definition: 'Hello', stage: 'bronze', round: 1 },
  { id: 2, term: 'Merci', definition: 'Thank you', stage: 'bronze', round: 2 },
  { id: 3, term: 'Maison', definition: 'House', stage: 'silver', round: 1 },
  { id: 4, term: 'Ami', definition: 'Friend', stage: 'silver', round: 2 },
  { id: 5, term: 'Chat', definition: 'Cat', stage: 'gold', round: 1 },
];

// Card color function from review page
function getCardColors(stage: string, round: number) {
  const stageKey = stage?.toLowerCase() || 'bronze';
  
  const colorMap = {
    bronze: {
      1: { backgroundColor: '#FFECEC', borderColor: '#FF4444', borderBottomColor: '#D32F2F', textColor: '#333333', badgeEmoji: '🥉' },
      2: { backgroundColor: '#E8F6E8', borderColor: '#4CAF50', borderBottomColor: '#388E3C', textColor: '#333333', badgeEmoji: '🥉' },
      3: { backgroundColor: '#E3F2FD', borderColor: '#2196F3', borderBottomColor: '#1976D2', textColor: '#333333', badgeEmoji: '🥉' },
      4: { backgroundColor: '#FFFDE7', borderColor: '#FFD700', borderBottomColor: '#F57F17', textColor: '#333333', badgeEmoji: '🥉' },
    },
    silver: {
      1: { backgroundColor: '#FFF3E0', borderColor: '#FF9800', borderBottomColor: '#F57C00', textColor: '#333333', badgeEmoji: '🥈' },
      2: { backgroundColor: '#FCE4EC', borderColor: '#E91E63', borderBottomColor: '#C2185B', textColor: '#333333', badgeEmoji: '🥈' },
      3: { backgroundColor: '#F5F5F5', borderColor: '#9E9E9E', borderBottomColor: '#757575', textColor: '#333333', badgeEmoji: '🥈' },
      4: { backgroundColor: '#FAFAFA', borderColor: '#E0E0E0', borderBottomColor: '#BDBDBD', textColor: '#333333', badgeEmoji: '🥈' },
    },
    gold: {
      1: { backgroundColor: '#FFF8E1', borderColor: '#FF6F00', borderBottomColor: '#E65100', textColor: '#333333', badgeEmoji: '🥇' },
      2: { backgroundColor: '#EFEBE9', borderColor: '#8D6E63', borderBottomColor: '#5D4037', textColor: '#333333', badgeEmoji: '🥇' },
      3: { backgroundColor: '#F0F8FF', borderColor: '#81D4FA', borderBottomColor: '#29B6F6', textColor: '#333333', badgeEmoji: '🥇' },
      4: { backgroundColor: '#F1F8E9', borderColor: '#C8E6C9', borderBottomColor: '#81C784', textColor: '#333333', badgeEmoji: '🥇' },
    },
  };

  const stageColors = colorMap[stageKey as keyof typeof colorMap];
  const roundColors = stageColors?.[round as keyof typeof stageColors];
  
  return roundColors || colorMap.bronze[1];
}

interface AnimatedReviewCardsProps {
  onAnimationComplete?: () => void;
}

export default function AnimatedReviewCards({ onAnimationComplete }: AnimatedReviewCardsProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!isAnimating) return;

    const cardCycle = () => {
      // Show front (term) for 1 second
      setTimeout(() => {
        setIsFlipped(true);
        
        // Show back (definition) for 800ms, then swipe
        setTimeout(() => {
          // Animate swipe (alternating left/right)
          const direction = currentCardIndex % 2 === 0 ? 1 : -1;
          
          Animated.parallel([
            Animated.timing(pan.x, {
              toValue: direction * 300,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: direction * 0.3,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Reset position and move to next card
            pan.setValue({ x: 0, y: 0 });
            rotateAnim.setValue(0);
            setIsFlipped(false);
            
            if (currentCardIndex < DEMO_CARDS.length - 1) {
              setCurrentCardIndex(prev => prev + 1);
            } else {
              // Reset to beginning
              setTimeout(() => {
                setCurrentCardIndex(0);
              }, 300);
            }
          });
        }, 800);
      }, 1000);
    };

    cardCycle();
  }, [currentCardIndex, isAnimating]);

  const currentCard = DEMO_CARDS[currentCardIndex];
  const nextCard = DEMO_CARDS[currentCardIndex + 1];
  const currentCardColors = getCardColors(currentCard?.stage, currentCard?.round);
  const nextCardColors = nextCard ? getCardColors(nextCard.stage, nextCard.round) : currentCardColors;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-30deg', '30deg'],
  });

  const rightOverlayOpacity = pan.x.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftOverlayOpacity = pan.x.interpolate({
    inputRange: [-150, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Next Card (Background) */}
        {nextCard && (
          <Animated.View
            style={[
              styles.cardWrapper,
              styles.nextCard,
              {
                opacity: nextCardOpacity,
                transform: [
                  { scale: nextCardScale },
                  { translateY: 8 },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: nextCardColors.backgroundColor,
                  borderColor: nextCardColors.borderColor,
                  borderBottomColor: nextCardColors.borderBottomColor,
                },
              ]}
              activeOpacity={1}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <View style={styles.stageIndicatorContainer}>
                      <Text style={styles.stageBadge}>{nextCardColors.badgeEmoji}</Text>
                      <Text style={[styles.stageIndicator, { color: nextCardColors.textColor }]}>
                        {nextCard.stage?.toUpperCase()} • Round {nextCard.round}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.termContainer}>
                    <Text style={[styles.term, { color: nextCardColors.textColor }]}>
                      {nextCard.term}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Active Card */}
        {currentCard && (
          <Animated.View
            style={[
              styles.cardWrapper,
              styles.activeCard,
              {
                transform: [
                  { translateX: pan.x },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            {/* Swipe Overlays */}
            <Animated.View style={[styles.overlay, styles.rememberedOverlay, { opacity: rightOverlayOpacity }]}>
              <Text style={styles.overlayIcon}>✓</Text>
              <Text style={styles.overlayText}>Remembered!</Text>
            </Animated.View>
            
            <Animated.View style={[styles.overlay, styles.forgottenOverlay, { opacity: leftOverlayOpacity }]}>
              <Text style={styles.overlayIcon}>✗</Text>
              <Text style={styles.overlayText}>Forgotten</Text>
            </Animated.View>

            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: currentCardColors.backgroundColor,
                  borderColor: currentCardColors.borderColor,
                  borderBottomColor: currentCardColors.borderBottomColor,
                },
              ]}
              activeOpacity={1}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardInner}>
                  {!isFlipped ? (
                    // Front - Term
                    <>
                      <View style={styles.cardHeader}>
                        <View style={styles.stageIndicatorContainer}>
                          <Text style={styles.stageBadge}>{currentCardColors.badgeEmoji}</Text>
                          <Text style={[styles.stageIndicator, { color: currentCardColors.textColor }]}>
                            {currentCard.stage?.toUpperCase()} • Round {currentCard.round}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.termContainer}>
                        <Text style={[styles.term, { color: currentCardColors.textColor }]}>
                          {currentCard.term}
                        </Text>
                        <Text style={styles.flipHint}>Tap to reveal</Text>
                      </View>
                    </>
                  ) : (
                    // Back - Definition
                    <>
                      <View style={styles.cardHeader}>
                        <View style={styles.stageIndicatorContainer}>
                          <Text style={styles.stageBadge}>{currentCardColors.badgeEmoji}</Text>
                          <Text style={[styles.stageIndicator, { color: currentCardColors.textColor }]}>
                            {currentCard.stage?.toUpperCase()} • Round {currentCard.round}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.definitionContainer}>
                        <Text style={[styles.definition, { color: currentCardColors.textColor }]}>
                          {currentCard.definition}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
      
      {/* Instructions */}
      <Text style={styles.instructionText}>
        💡 Swipe left if you forgot • Swipe right if you remembered
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH + 40,
    height: CARD_HEIGHT + 80,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: BorderRadius.large,
    zIndex: 10,
  },
  rememberedOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  forgottenOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  overlayIcon: {
    color: 'white',
    fontSize: 60,
    fontWeight: 'bold',
  },
  overlayText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
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
  flipHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: Spacing.sm,
  },
});