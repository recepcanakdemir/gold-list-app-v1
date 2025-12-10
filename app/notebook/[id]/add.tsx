import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotebook, useCreateWordOptimistic, useWordsCountByPage, useProfile } from '../../../lib/database-hooks';
import { useSubscription, useWordLimitCheck } from '../../../lib/revenuecat';
import * as StoreReview from 'expo-store-review';
import { useIsMutating } from '@tanstack/react-query';
import { useCurrentTime, formatDate, addDays } from '../../../lib/time-provider';
import { translateTerm, generateExample, getLanguagesFromNotebook } from '../../../lib/ai-helper';
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../../styles/theme';
import { Header } from '../../../components/Header';

const WORD_TYPES = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adj' },
  { value: 'adverb', label: 'Adv' },
  { value: 'other', label: 'Other' }
] as const;
type WordType = typeof WORD_TYPES[number]['value'];

interface WordData {
  term: string;
  definition: string;
  example: string;
  type: WordType;
}

export default function AddWordsScreen() {
  const { id, page } = useLocalSearchParams();
  const router = useRouter();
  const { currentTime } = useCurrentTime();
  
  const { data: notebook, isLoading: notebookLoading } = useNotebook(id as string);
  const { data: wordsCount } = useWordsCountByPage(id as string);
  const { data: profile } = useProfile();
  const { isProUser } = useSubscription();
  const { checkCanAddWord } = useWordLimitCheck();
  const createWordOptimistic = useCreateWordOptimistic();
  const isMutating = useIsMutating();
  
  // AI functionality states
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  
  // View switching state management
  const [viewMode, setViewMode] = useState<'input' | 'summary'>('input');
  const [sessionWords, setSessionWords] = useState<WordData[]>([]);
  
  // Snapshot logic for accurate progress tracking
  const [initialDbCount, setInitialDbCount] = useState<number | null>(null);
  const hasSnapshotTaken = useRef(false);
  
  // Optimistic state management
  const [localWords, setLocalWords] = useState<WordData[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<WordData>({
    term: '',
    definition: '',
    example: '',
    type: 'noun'
  });
  
  const pageNumber = parseInt(page as string) || 1;
  const wordLimit = notebook?.words_per_page_limit || 20;
  
  // Use snapshot logic for accurate counting
  const currentTotal = (initialDbCount || 0) + sessionWords.length;
  const isLastWord = currentTotal >= wordLimit - 1;
  
  // Calculate target date for this page (14-day spacing)
  const targetDate = notebook ? 
    formatDate(addDays(new Date(notebook.created_at), (pageNumber - 1) * 14)) 
    : formatDate(new Date());

  // Snapshot initial database count (freeze it for this session)
  useEffect(() => {
    // Take snapshot immediately on mount, regardless of query state
    if (!hasSnapshotTaken.current) {
      // For fresh pages: wordsCount?.[pageNumber] will be undefined → default to 0
      // For existing pages: wordsCount?.[pageNumber] will have the actual count
      setInitialDbCount(wordsCount?.[pageNumber] || 0);
      hasSnapshotTaken.current = true; // LOCK IT PERMANENTLY for this mount
    }
  }, [pageNumber]); // Only depend on pageNumber, not wordsCount

  // Resume from correct word index based on existing words
  useEffect(() => {
    if (notebook && wordsCount) {
      // Set starting index to resume from next available slot
      setCurrentWordIndex(0); // Local index starts at 0, but progress shows correctly
    }
  }, [notebook, wordsCount, pageNumber]);

  // Proactive word limit check on component mount
  useEffect(() => {
    const { canAdd } = checkCanAddWord()
    if (!canAdd) {
      Alert.alert(
        "Limit Reached 🔒",
        "You have used your free 300 words. Upgrade to continue adding.",
        [
          { text: "Cancel", style: "cancel", onPress: () => router.back() },
          { text: "Upgrade", onPress: () => router.push('/paywall') }
        ]
      )
    }
  }, [checkCanAddWord])

  const handleInputChange = (field: keyof WordData, value: string) => {
    setCurrentWord(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (type: WordType) => {
    setCurrentWord(prev => ({ ...prev, type }));
  };

  const handleNext = () => {
    // Check word limit before any processing
    const { canAdd, message } = checkCanAddWord()
    if (!canAdd) {
      Alert.alert(
        "Limit Reached 🔒",
        message || "You've reached the free word limit. Upgrade for unlimited words!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push('/paywall') }
        ]
      )
      return // Stop execution
    }

    if (!currentWord.term.trim() || !currentWord.definition.trim()) {
      Alert.alert('Missing Information', 'Please enter both term and definition');
      return;
    }

    // Add to session tracking and optimistic UI update
    setSessionWords(prev => [...prev, currentWord]);
    setLocalWords(prev => [...prev, currentWord]);
    
    // Calculate new total count BEFORE resetting currentWord for win-moment review
    const newTotalCount = (initialDbCount || 0) + localWords.length + 1;
    
    setCurrentWord({
      term: '',
      definition: '',
      example: '',
      type: 'noun'
    });

    // Background save (async)
    createWordOptimistic.mutate(
      {
        notebook_id: notebook!.id,
        page_number: pageNumber,
        target_date: targetDate,
        currentTime,
        word: {
          term: currentWord.term.trim(),
          definition: currentWord.definition.trim(),
          type: currentWord.type,
          example_sentence: currentWord.example.trim() || undefined,
        },
      },
      {
        onSuccess: async () => {
          // Check if this is the 5th word milestone for win-moment review
          if (newTotalCount === 5) {
            try {
              if (await StoreReview.hasAction()) {
                // Slight delay for better UX after successful save
                setTimeout(async () => {
                  await StoreReview.requestReview();
                }, 1000);
              }
            } catch (error) {
              console.log('Review request failed:', error);
            }
          }
        },
        onError: (error) => {
          // Check if the error is the specific limit error
          if (error.message === 'WORD_LIMIT_REACHED' || (error as any).code === 'WORD_LIMIT_REACHED') {
            Alert.alert(
              "Limit Reached 🔒",
              "You have reached the free word limit. Upgrade for unlimited words!",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Upgrade", onPress: () => router.push('/paywall') }
              ]
            );
          } else {
            // Handle other real errors
            Alert.alert('Save Error', 'Failed to save word. Please check your connection and try again.');
            console.error('Word save error:', error);
          }
        },
      }
    );
  };

  const handlePrevious = () => {
    if (localWords.length > 0) {
      // Move back to previous locally added word
      const previousWord = localWords[localWords.length - 1];
      setCurrentWord(previousWord);
      setLocalWords(prev => prev.slice(0, -1));
      // Also remove from session tracking
      setSessionWords(prev => prev.slice(0, -1));
    }
  };

  const handleSaveAndExit = () => {
    if (currentWord.term.trim() || currentWord.definition.trim()) {
      handleNext();
    }
    // Switch to summary view instead of navigating
    setViewMode('summary');
  };

  const handleCloseSummary = () => {
    router.back();
  };

  // AI handler functions
  const handleTranslate = async () => {
    // Pro feature guard
    if (!isProUser) {
      Alert.alert(
        "Pro Feature 👑",
        "AI Translation is available only for Pro members.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }

    if (!currentWord.term.trim()) {
      Alert.alert('Error', 'Please enter a term first');
      return;
    }

    if (!notebook) {
      Alert.alert('Error', 'Notebook not loaded. Please try again.');
      return;
    }

    setIsTranslating(true);
    try {
      const { targetLang, nativeLang, languageLevel } = getLanguagesFromNotebook(notebook);
      const translation = await translateTerm(currentWord.term, targetLang, nativeLang, languageLevel);
      handleInputChange('definition', translation);
    } catch (error) {
      Alert.alert('Translation Error', (error as Error).message || 'Failed to translate');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateExample = async () => {
    // Pro feature guard
    if (!isProUser) {
      Alert.alert(
        "Pro Feature 👑",
        "AI Examples are available only for Pro members.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push('/paywall') }
        ]
      );
      return;
    }

    if (!currentWord.term.trim()) {
      Alert.alert('Error', 'Please enter a term first');
      return;
    }

    if (!notebook) {
      Alert.alert('Error', 'Notebook not loaded. Please try again.');
      return;
    }

    setIsGeneratingExample(true);
    try {
      const { targetLang, nativeLang, languageLevel } = getLanguagesFromNotebook(notebook);
      // Clear existing example first to allow multiple generations
      handleInputChange('example', '');
      const example = await generateExample(currentWord.term, targetLang, nativeLang, languageLevel);
      handleInputChange('example', example);
    } catch (error) {
      Alert.alert('Example Generation Error', (error as Error).message || 'Failed to generate example');
    } finally {
      setIsGeneratingExample(false);
    }
  };

  if (notebookLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!notebook) {
    return (
      <View style={styles.container}>
        <Text>Notebook not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'input' ? (
        <>
          {/* Input Mode - Original UI */}
          {/* Header */}
          <Header 
            title="Add Words"
            leftElement={
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            }
            rightElement={
              <TouchableOpacity onPress={handleSaveAndExit}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            }
          />

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentTotal + 1) / wordLimit) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              Word {currentTotal + 1} of {wordLimit}
            </Text>
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardContainer}
          >
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Word Type Selector */}
            <Text style={[styles.sectionTitle, styles.firstSectionTitle]}>Word Type</Text>
            <View style={styles.typeSelector}>
              {WORD_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    currentWord.type === type.value && styles.typeButtonActive
                  ]}
                  onPress={() => handleTypeSelect(type.value)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    currentWord.type === type.value && styles.typeButtonTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Term Input */}
            <Text style={styles.sectionTitle}>Term *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter the word or phrase"
              value={currentWord.term}
              onChangeText={(value) => handleInputChange('term', value)}
              autoFocus
            />

            {/* Definition Input */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>Definition *</Text>
              <TouchableOpacity 
                style={[styles.aiButton, isTranslating && styles.aiButtonLoading]}
                onPress={handleTranslate}
                disabled={isTranslating || !currentWord.term.trim()}
              >
                {isTranslating ? (
                  <Ionicons name="sync" size={16} color="#FFA500" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="#FFA500" />
                )}
                <Text style={styles.aiButtonText}>
                  {isTranslating ? 'Translating...' : 'Translate'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter the definition"
              value={currentWord.definition}
              onChangeText={(value) => handleInputChange('definition', value)}
              multiline
              numberOfLines={3}
            />

            {/* Example Input */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>Example (Optional)</Text>
              <TouchableOpacity 
                style={[styles.aiButton, isGeneratingExample && styles.aiButtonLoading]}
                onPress={handleGenerateExample}
                disabled={isGeneratingExample || !currentWord.term.trim()}
              >
                {isGeneratingExample ? (
                  <Ionicons name="sync" size={16} color="#FFA500" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="#FFA500" />
                )}
                <Text style={styles.aiButtonText}>
                  {isGeneratingExample ? 'Generating...' : 'Example'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter an example sentence"
              value={currentWord.example}
              onChangeText={(value) => handleInputChange('example', value)}
              multiline
              numberOfLines={3}
            />
            </ScrollView>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.navButton, localWords.length === 0 && styles.navButtonDisabled]}
                onPress={handlePrevious}
                disabled={localWords.length === 0}
              >
                <Ionicons name="chevron-back" size={20} color={localWords.length === 0 ? "#999" : "white"} />
                <Text style={[styles.navButtonText, localWords.length === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.nextButton}
                onPress={isLastWord ? handleSaveAndExit : handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {isLastWord ? 'Done' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <>
          {/* Summary Mode - Word Cards & Safety Lock */}
          {/* Header */}
          <Header 
            title="Words Added" 
            rightElement={
              <Text style={styles.streakText}>+1 🔥</Text>
            }
          />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {sessionWords.map((word, index) => (
              <View key={index} style={styles.wordCard}>
                <View style={styles.wordSection}>
                  <View style={styles.wordCardHeader}>
                    <Text style={styles.wordTerm}>{word.term}</Text>
                    <Text style={styles.wordType}>{word.type}</Text>
                  </View>
                </View>
                <View style={styles.definitionSection}>
                  <Text style={styles.wordDefinition}>{word.definition}</Text>
                </View>
                {word.example && (
                  <View style={styles.exampleSection}>
                    <Text style={styles.wordExample}>Example: {word.example}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Safety Lock Footer */}
          <View style={styles.summaryFooter}>
            <Text style={styles.summaryStats}>
              {sessionWords.length} word{sessionWords.length !== 1 ? 's' : ''} added
            </Text>
            <TouchableOpacity 
              style={[
                styles.closeButton,
                isMutating > 0 && styles.closeButtonDisabled
              ]}
              onPress={handleCloseSummary}
              disabled={isMutating > 0}
            >
              {isMutating > 0 && (
                <Ionicons name="sync" size={16} color="#999" style={{ marginRight: 8 }} />
              )}
              <Text style={[
                styles.closeButtonText,
                isMutating > 0 && styles.closeButtonTextDisabled
              ]}>
                {isMutating > 0 ? 'Saving...' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.page,
  },
  keyboardContainer: {
    flex: 1,
  },
  saveButton: {
    ...Typography.titleMedium,
    color: Colors.primary,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.inactive,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.small,
  },
  progressText: {
    ...Typography.subtitleSmall,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  firstSectionTitle: {
    marginTop: Spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  typeButton: {
    ...Effects3D.button,
    ...Effects3D.container,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xlarge,
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
    borderBottomColor: Colors.border,
  },
  typeButtonActive: {
    ...Effects3D.buttonPrimary,
  },
  typeButtonText: {
    ...Typography.subtitleSmall,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  input: {
    ...Effects3D.input,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.lg,
  },
  navButton: {
    ...ButtonStyles.primaryMedium,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
    flex: 1,
  },
  navButtonDisabled: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
    borderBottomColor: Colors.border,
  },
  navButtonText: {
    ...Typography.buttonMedium,
    marginLeft: Spacing.xs,
  },
  navButtonTextDisabled: {
    color: Colors.textLight,
  },
  nextButton: {
    ...ButtonStyles.primaryMedium,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nextButtonText: {
    ...Typography.buttonMedium,
    marginRight: Spacing.xs,
  },
  // Summary Mode Styles
  wordCard: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    padding: Spacing.sm, // Add some padding to the main card
  },
  wordSection: {
    backgroundColor: '#FFF8F0', // Very light warm orange (primary theme)
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FFE4CC', // Light orange border
  },
  definitionSection: {
    backgroundColor: '#F0FDF4', // Very light success green
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: '#BBF7D0', // Light green border
  },
  exampleSection: {
    backgroundColor: '#FFFBEB', // Very light gold tint
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: '#FDE68A', // Light gold border
  },
  wordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordTerm: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  wordType: {
    fontSize: 12,
    color: Colors.white,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  wordDefinition: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  wordExample: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  summaryFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34, // Add bottom padding for safe area
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  summaryStats: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  closeButton: {
    ...ButtonStyles.primaryMedium,
    ...Effects3D.button,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  closeButtonDisabled: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
    borderBottomColor: Colors.border,
  },
  closeButtonText: {
    ...Typography.buttonMedium,
  },
  closeButtonTextDisabled: {
    color: Colors.textLight,
  },
  streakText: {
    ...Typography.titleMedium,
    color: Colors.primary,
    fontSize: 16,
  },
  // AI button styles
  inputSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF4E6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  aiButtonLoading: {
    backgroundColor: '#F0F0F0',
    borderColor: '#CCC',
  },
  aiButtonText: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
    marginLeft: 6,
  },
});