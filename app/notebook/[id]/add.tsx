import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotebook, useCreateWordOptimistic, useWordsCountByPage } from '../../../lib/database-hooks';
import { useIsMutating } from '@tanstack/react-query';
import { useCurrentTime, formatDate, addDays } from '../../../lib/time-provider';

const WORD_TYPES = ['noun', 'verb', 'adjective', 'adverb', 'other'] as const;
type WordType = typeof WORD_TYPES[number];

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
  const createWordOptimistic = useCreateWordOptimistic();
  const isMutating = useIsMutating();
  
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

  const handleInputChange = (field: keyof WordData, value: string) => {
    setCurrentWord(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (type: WordType) => {
    setCurrentWord(prev => ({ ...prev, type }));
  };

  const handleNext = () => {
    if (!currentWord.term.trim() || !currentWord.definition.trim()) {
      Alert.alert('Missing Information', 'Please enter both term and definition');
      return;
    }

    // Add to session tracking and optimistic UI update
    setSessionWords(prev => [...prev, currentWord]);
    setLocalWords(prev => [...prev, currentWord]);
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
        onError: (error) => {
          Alert.alert('Save Error', 'Failed to save word. Please check your connection and try again.');
          console.error('Word save error:', error);
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

  if (notebookLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!notebook) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Notebook not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {viewMode === 'input' ? (
        <>
          {/* Input Mode - Original UI */}
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Words</Text>
            <TouchableOpacity onPress={handleSaveAndExit}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

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

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Word Type Selector */}
            <Text style={styles.sectionTitle}>Word Type</Text>
            <View style={styles.typeSelector}>
              {WORD_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    currentWord.type === type && styles.typeButtonActive
                  ]}
                  onPress={() => handleTypeSelect(type)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    currentWord.type === type && styles.typeButtonTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
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
            <Text style={styles.sectionTitle}>Definition *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter the definition"
              value={currentWord.definition}
              onChangeText={(value) => handleInputChange('definition', value)}
              multiline
              numberOfLines={3}
            />

            {/* Example Input */}
            <Text style={styles.sectionTitle}>Example (Optional)</Text>
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
        </>
      ) : (
        <>
          {/* Summary Mode - Word Cards & Safety Lock */}
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 24 }} />
            <Text style={styles.headerTitle}>Words Added</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {sessionWords.map((word, index) => (
              <View key={index} style={styles.wordCard}>
                <View style={styles.wordCardHeader}>
                  <Text style={styles.wordTerm}>{word.term}</Text>
                  <Text style={styles.wordType}>{word.type}</Text>
                </View>
                <Text style={styles.wordDefinition}>{word.definition}</Text>
                {word.example && (
                  <Text style={styles.wordExample}>Example: {word.example}</Text>
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
    </SafeAreaView>
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
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#666',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  // Summary Mode Styles
  wordCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'capitalize',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  closeButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonTextDisabled: {
    color: '#999',
  },
});