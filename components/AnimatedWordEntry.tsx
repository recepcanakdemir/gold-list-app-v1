import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Effects3D, Spacing, BorderRadius } from '../styles/theme';

interface WordPair {
  foreign: string;
  translation: string;
}

const WORD_PAIRS: WordPair[] = [
  { foreign: 'Hola', translation: 'Hello' },
  { foreign: 'Gracias', translation: 'Thank you' },
  { foreign: 'Casa', translation: 'House' },
  { foreign: 'Amigo', translation: 'Friend' },
];

interface AnimatedWordEntryProps {
  onAnimationComplete?: () => void;
}

export default function AnimatedWordEntry({ onAnimationComplete }: AnimatedWordEntryProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTypingTranslation, setIsTypingTranslation] = useState(false);
  const [displayedWords, setDisplayedWords] = useState<Array<{ foreign: string; translation: string }>>([]);
  const [isAnimating, setIsAnimating] = useState(true);
  
  const fadeAnims = useRef(WORD_PAIRS.map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef(WORD_PAIRS.map(() => new Animated.Value(0.8))).current;

  useEffect(() => {
    if (!isAnimating) return;

    const typingInterval = setInterval(() => {
      const currentWord = WORD_PAIRS[currentWordIndex];
      
      if (!isTypingTranslation) {
        // Typing the foreign word
        if (currentCharIndex < currentWord.foreign.length) {
          setCurrentCharIndex(prev => prev + 1);
        } else {
          // Finished typing foreign word, start typing translation
          setIsTypingTranslation(true);
          setCurrentCharIndex(0);
        }
      } else {
        // Typing the translation
        if (currentCharIndex < currentWord.translation.length) {
          setCurrentCharIndex(prev => prev + 1);
        } else {
          // Finished typing both parts of current word
          const newWord = {
            foreign: currentWord.foreign,
            translation: currentWord.translation
          };
          
          setDisplayedWords(prev => [...prev, newWord]);
          
          // Animate the completed word in
          Animated.parallel([
            Animated.timing(fadeAnims[currentWordIndex], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnims[currentWordIndex], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();

          // Move to next word or restart
          if (currentWordIndex < WORD_PAIRS.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
            setCurrentCharIndex(0);
            setIsTypingTranslation(false);
          } else {
            // All words completed, restart after pause
            setIsAnimating(false);
            setTimeout(() => {
              // Reset everything for restart
              setCurrentWordIndex(0);
              setCurrentCharIndex(0);
              setIsTypingTranslation(false);
              setDisplayedWords([]);
              
              // Reset animations
              fadeAnims.forEach(anim => anim.setValue(0));
              scaleAnims.forEach(anim => anim.setValue(0.8));
              
              // Resume animation
              setIsAnimating(true);
            }, 2000);
          }
        }
      }
    }, 120); // Typing speed: 120ms per character

    return () => clearInterval(typingInterval);
  }, [currentWordIndex, currentCharIndex, isTypingTranslation, isAnimating, fadeAnims, scaleAnims]);

  const getCurrentTypingText = () => {
    const currentWord = WORD_PAIRS[currentWordIndex];
    if (!currentWord) return { foreign: '', translation: '' };
    
    if (!isTypingTranslation) {
      return {
        foreign: currentWord.foreign.slice(0, currentCharIndex),
        translation: ''
      };
    } else {
      return {
        foreign: currentWord.foreign,
        translation: currentWord.translation.slice(0, currentCharIndex)
      };
    }
  };

  const currentTypingText = getCurrentTypingText();

  return (
    <View style={styles.container}>
      {/* Completed words */}
      {displayedWords.map((word, index) => (
        <Animated.View
          key={index}
          style={[
            styles.wordEntry,
            {
              opacity: fadeAnims[index] || 0,
              transform: [{ scale: scaleAnims[index] || 0.8 }]
            }
          ]}
        >
          <View style={styles.inputContainer}>
            <Text style={styles.inputText}>{word.foreign}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputText}>{word.translation}</Text>
          </View>
        </Animated.View>
      ))}

      {/* Currently typing word */}
      {currentWordIndex < WORD_PAIRS.length && (
        <View style={[styles.wordEntry, styles.activeWordEntry]}>
          <View style={[styles.inputContainer, styles.activeInput]}>
            <Text style={styles.inputText}>
              {currentTypingText.foreign}
              {!isTypingTranslation && <Text style={styles.cursor}>|</Text>}
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
          <View style={[styles.inputContainer, isTypingTranslation && styles.activeInput]}>
            <Text style={styles.inputText}>
              {currentTypingText.translation}
              {isTypingTranslation && <Text style={styles.cursor}>|</Text>}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  wordEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    width: '100%',
  },
  activeWordEntry: {
    // Add subtle highlight for active entry
  },
  inputContainer: {
    ...Effects3D.input,
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeInput: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFF8F0', // Very light orange tint
  },
  inputText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 20, // Prevent layout shift
  },
  arrowContainer: {
    marginHorizontal: Spacing.sm,
    width: 20,
    alignItems: 'center',
  },
  arrow: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  cursor: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});