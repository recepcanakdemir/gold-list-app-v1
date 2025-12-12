import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  ScrollView,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  useNotebook, 
  usePageNumbers,
  useWordsCountByPage,
  useUpdateNotebook,
  useDeleteNotebook,
  useReviewWords,
  useProfile,
  usePageTitle,
  useUpdatePageTitle
} from '../../lib/database-hooks';
import { supabase } from '../../lib/supabase';
import { useCurrentTime, formatDate, addDays, daysBetween } from '../../lib/time-provider';
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../../styles/theme';
import { Header } from '../../components/Header';

// Language levels (same as create notebook)
const LANGUAGE_LEVELS = [
  { code: 'A1', label: 'A1 - Beginner', description: 'Can understand basic phrases' },
  { code: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple tasks' },
  { code: 'B1', label: 'B1 - Intermediate', description: 'Can handle most everyday situations' },
  { code: 'B2', label: 'B2 - Upper Intermediate', description: 'Can express ideas fluently' },
  { code: 'C1', label: 'C1 - Advanced', description: 'Can use language effectively' },
  { code: 'C2', label: 'C2 - Proficient', description: 'Can understand virtually everything' },
];

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Language to country code mapping (from index.tsx)
function getLanguageCountryCode(language: string): string {
  const countryCodeMap: { [key: string]: string } = {
    Spanish: 'ES', French: 'FR', German: 'DE', Italian: 'IT', English: 'GB',
    Portuguese: 'PT', Russian: 'RU', Japanese: 'JP', Chinese: 'CN', Korean: 'KR',
    Arabic: 'SA', Dutch: 'NL', Swedish: 'SE', Norwegian: 'NO', Polish: 'PL',
    Turkish: 'TR', Hindi: 'IN'
  };
  return countryCodeMap[language] || 'US';
}

// Sinusoidal roadmap coordinate calculation
function getRoadmapCoordinates(index: number) {
  const centerX = screenWidth / 2;
  const amplitude = screenWidth * 0.15; // Wave width (15% of screen width, reduced to keep popups on screen)
  const frequency = 0.8; // Wave frequency - controls how many waves (increased for more dynamic curves)
  const verticalSpacing = 100; // Distance between nodes vertically
  const startOffset = 160; // Initial vertical offset from top (increased to avoid header covering popup)
  
  return {
    x: centerX + amplitude * Math.sin(index * frequency),
    y: index * verticalSpacing + startOffset
  };
}


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

interface RoadmapItem {
  isGhost?: boolean;
  page_number: number;
  target_date: string;
  title: string | null;
  isActive: boolean;
  isMissed?: boolean;
  isLocked?: boolean;
  isCompleted?: boolean;
  isPartial?: boolean;
  wordCount?: number;
  wordLimit?: number;
  id?: string;
}

interface LessonNodeProps {
  item: RoadmapItem;
  index: number;
  coordinates: { x: number; y: number };
  onNodePress: (item: RoadmapItem, index: number) => void;
  isPopupVisible: boolean;
  onAddWords: () => void;
  onReviewWords: () => void;
  onAddContext: () => void;
  onClosePopup: () => void;
  reviewWordsCount: number;
  notebook: any;
  currentTime: Date;
}

function LessonNode({ item, index, coordinates, onNodePress, isPopupVisible, onAddWords, onReviewWords, onAddContext, onClosePopup, reviewWordsCount, notebook, currentTime }: LessonNodeProps) {
  // Determine visual style based on word count status
  const getCircleStyle = () => {
    if (item.isActive) return styles.activeCircle; // Red - today, no words yet
    if (item.isPartial) return styles.partialCircle; // Yellow - some words, under limit
    if (item.isCompleted) return styles.completedCircle; // Green - reached word limit
    if (item.isMissed) return styles.missedCircle; // Gray - missed day, no words
    return styles.lockedCircle; // Gray - future/locked
  };

  const getTextStyle = () => {
    if (item.isActive) return styles.activeText;
    if (item.isPartial) return styles.partialText;
    if (item.isCompleted) return styles.completedText; 
    if (item.isMissed) return styles.missedText;
    return styles.lockedText;
  };

  // Calculate popup content
  const getPopupContent = () => {
    if (!notebook) return { subtitle: "", showActions: false };
    
    // Calculate current active day (same logic as roadmap generation)
    const notebookCreatedDate = new Date(notebook.created_at);
    const currentDate = new Date(currentTime);
    const daysSinceCreation = daysBetween(notebookCreatedDate, currentDate);
    const currentActiveDay = daysSinceCreation + 1;
    
    const isCurrentDay = item.page_number === currentActiveDay;
    const hasWords = item.wordCount && item.wordCount > 0;
    const reachedLimit = item.wordCount >= item.wordLimit;
    
    let subtitle = "";
    let showActions = false;
    
    if (isCurrentDay) {
      // Current day logic
      if (reachedLimit) {
        subtitle = "Words are waiting for review date";
      } else {
        subtitle = hasWords 
          ? `Add ${item.wordLimit - item.wordCount} more words`
          : `Add ${item.wordLimit || 20} words`;
        showActions = true;
      }
    } else {
      // Past day logic  
      if (hasWords) {
        subtitle = "Words are waiting for review date";
      } else {
        subtitle = "No words added - skipped day";
      }
    }
    
    return { subtitle, showActions };
  };

  const popupContent = getPopupContent();
  
  // Determine popup position relative to node
  const getPopupPosition = () => {
    const popupWidth = 200;
    // Calculate popup height based on content
    const baseHeight = 80; // Title + subtitle
    const buttonHeight = popupContent.showActions ? 80 : 0; // Space for buttons if present
    const totalPopupHeight = baseHeight + buttonHeight;
    const nodeRadius = 10; // Half of 80px node
    const spacing = 16; // Gap between node and popup
    
    return {
      left: -(popupWidth / 2) + nodeRadius, // Center popup horizontally over the 80px node
      top: -(totalPopupHeight + spacing + nodeRadius), // Position popup above node with consistent spacing
    };
  };

  const popupPosition = getPopupPosition();

  return (
    <View style={[
      styles.roadmapNode, 
      {
        position: 'absolute',
        left: coordinates.x - 40, // Center the 80px circle
        top: coordinates.y - 40,  // Center the 80px circle
        zIndex: isPopupVisible ? 1000 : 1, // Elevate entire node when popup is visible
        elevation: isPopupVisible ? 1000 : 1, // Android elevation
      }
    ]}>
      <TouchableOpacity 
        style={[styles.lessonCircle, getCircleStyle()]}
        onPress={() => onNodePress(item, index)}
        disabled={item.isLocked} // Allow clicks on all nodes except future locked ones
      >
        <Text style={[styles.lessonNumber, getTextStyle()]}>
          {item.page_number}
        </Text>
      </TouchableOpacity>
      
      {/* Embedded Popup */}
      {isPopupVisible && (
        <View style={[styles.embeddedPopup, popupPosition]}>
          {/* This Pressable stops clicks from going to the overlay */}
          <Pressable 
            onPress={(e) => e.stopPropagation()} 
            style={styles.nodePopupContent}
          >
            <Text style={styles.nodePopupTitle}>
              Lesson {item.page_number}
            </Text>
            <Text style={styles.nodePopupSubtitle}>
              {popupContent.subtitle}
            </Text>
            
            {popupContent.showActions && (
              <>
                {/* Show Review button if there are due words, otherwise Add Words */}
                {reviewWordsCount > 0 ? (
                  <TouchableOpacity style={styles.popupReviewBtn} onPress={onReviewWords}>
                    <Ionicons name="refresh" size={16} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.popupReviewBtnText}>
                      Review ({reviewWordsCount} due)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.popupAddWordsBtn} onPress={onAddWords}>
                    <Text style={styles.popupAddWordsBtnText}>Add Words</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.popupAddContextBtn} onPress={onAddContext}>
                  <Text style={styles.popupAddContextBtnText}>Add Context</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
          {/* Arrow pointing to node */}
          <View style={styles.popupArrow} />
        </View>
      )}
    </View>
  );
}

export default function NotebookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentTime } = useCurrentTime();
  
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditTitleModal, setShowEditTitleModal] = useState(false);
  const [showEditLevelModal, setShowEditLevelModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<typeof LANGUAGE_LEVELS[0]>(LANGUAGE_LEVELS[1]);
  const [contextText, setContextText] = useState('');
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(1);
  
  // ScrollView reference for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { data: notebook, isLoading: notebookLoading } = useNotebook(id as string);
  const { data: pageNumbers, isLoading: pageNumbersLoading } = usePageNumbers(id as string);
  const { data: wordsCount } = useWordsCountByPage(id as string);
  const { data: reviewWords } = useReviewWords(id as string, currentTime);
  const { data: profile } = useProfile();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();
  const updatePageTitle = useUpdatePageTitle();
  const { data: pageTitle } = usePageTitle(id as string, selectedPageNumber);
  
  // Calculate display streak with three-state logic
  const streakInfo = calculateDisplayStreak(profile, currentTime);
  const displayStreak = streakInfo.streak;
  const streakStatus = streakInfo.status;

  // Day-by-Day Progression: 1 page = 1 day with word count coloring
  const roadmapItems = useMemo((): RoadmapItem[] => {
    if (!notebook || !pageNumbers || !wordsCount) return [];

    const notebookCreatedDate = new Date(notebook.created_at);
    const currentDate = new Date(currentTime);
    
    // Simple day calculation: Day 1, Day 2, Day 3, etc.
    const daysSinceCreation = daysBetween(notebookCreatedDate, currentDate);
    const currentActiveDay = daysSinceCreation + 1; // Day 1 on creation day
    
    const wordLimit = notebook.words_per_page_limit || 20;
    const items: RoadmapItem[] = [];

    // Show all 200 pages - complete roadmap visualization
    for (let pageNumber = 1; pageNumber <= 200; pageNumber++) {
      const currentWordCount = wordsCount[pageNumber] || 0;
      const hasWords = currentWordCount > 0;
      const isFullyCompleted = currentWordCount >= wordLimit;
      
      // Advanced coloring logic based on word count vs limit
      let isActive = false;
      let isMissed = false;
      let isLocked = false;
      let isCompleted = false;
      let isPartial = false;
      let title = `Lesson ${pageNumber}`;
      
      if (pageNumber === currentActiveDay) {
        // Today's active page
        if (currentWordCount === 0) {
          isActive = true; // Red - no words added yet
        } else if (currentWordCount < wordLimit) {
          isPartial = true; // Yellow - some words but under limit
        } else {
          isCompleted = true; // Green - reached word limit
        }
      } else if (pageNumber < currentActiveDay) {
        // Past pages
        if (currentWordCount === 0) {
          isMissed = true; // Gray + X - skipped day, locked forever
          title = `Lesson ${pageNumber} (Missed)`;
        } else if (currentWordCount < wordLimit) {
          isPartial = true; // Yellow - partial progress, still editable
          title = `Lesson ${pageNumber} (${currentWordCount}/${wordLimit})`;
        } else {
          isCompleted = true; // Green - complete
          title = `Lesson ${pageNumber} (Done)`;
        }
      } else {
        // Future pages - gray, locked
        isLocked = true;
      }
      
      // Calculate target date (still using 14-day spacing for database)
      const targetDate = addDays(notebookCreatedDate, (pageNumber - 1) * 14);
      
      items.push({
        isGhost: !hasWords,
        page_number: pageNumber,
        target_date: formatDate(targetDate),
        title,
        isActive,
        isMissed,
        isLocked,
        isCompleted,
        isPartial,
        wordCount: currentWordCount,
        wordLimit,
        id: hasWords ? `page_${pageNumber}` : undefined,
      });
    }

    return items;
  }, [notebook, pageNumbers, wordsCount, currentTime]);

  // Auto-scroll to current day function
  const autoScrollToCurrentDay = () => {
    if (!notebook || roadmapItems.length === 0) return;
    
    const notebookCreatedDate = new Date(notebook.created_at);
    const currentDate = new Date(currentTime);
    const daysSinceCreation = daysBetween(notebookCreatedDate, currentDate);
    const currentActiveDay = daysSinceCreation + 1;
    
    // Find the current day's index in roadmapItems
    const currentDayIndex = roadmapItems.findIndex(item => item.page_number === currentActiveDay);
    
    if (currentDayIndex !== -1) {
      // Calculate scroll position for the current day
      const coordinates = getRoadmapCoordinates(currentDayIndex);
      const scrollY = coordinates.y - 200; // Offset to center node on screen
      
      // Scroll to current day
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, scrollY), // Ensure we don't scroll to negative position
        animated: true,
      });
      
      // Auto-open popup for current day after a short delay
      setTimeout(() => {
        setSelectedNodeIndex(currentDayIndex);
      }, 500);
    }
  };

  // Auto-scroll to current day when notebook data loads
  useEffect(() => {
    if (notebook && roadmapItems.length > 0 && !notebookLoading && !pageNumbersLoading) {
      // Small delay to ensure ScrollView is rendered
      setTimeout(() => {
        autoScrollToCurrentDay();
      }, 300);
    }
  }, [notebook, roadmapItems.length, notebookLoading, pageNumbersLoading]);

  const handleNodePress = (item: RoadmapItem, index: number) => {
    // Allow clicks on active nodes and all past nodes (block only future locked nodes)
    if (item.isLocked) return;
    
    // Toggle popup - if same node clicked, close it, otherwise show new one
    if (selectedNodeIndex === index) {
      setSelectedNodeIndex(null);
    } else {
      setSelectedNodeIndex(index);
    }
  };

  const handleAddWords = (pageNumber: number) => {
    setSelectedNodeIndex(null);
    router.push(`/notebook/${id}/add?page=${pageNumber}`);
  };

  const handleReviewWords = () => {
    setSelectedNodeIndex(null);
    router.push(`/notebook/${id}/review`);
  };

  const handleAddContext = async (pageNumber: number) => {
    setSelectedNodeIndex(null);
    setSelectedPageNumber(pageNumber);
    
    // Load existing context for this specific page
    try {
      const { data } = await supabase
        .from('pages')
        .select('title')
        .eq('notebook_id', id)
        .eq('page_number', pageNumber)
        .single();
      
      setContextText(data?.title || '');
    } catch (error) {
      // Page doesn't exist yet, start with empty context
      setContextText('');
    }
    
    setShowContextModal(true);
  };

  const handleSaveContext = async () => {
    if (!contextText.trim()) {
      Alert.alert('Error', 'Please enter some context');
      return;
    }

    try {
      await updatePageTitle.mutateAsync({
        notebookId: id as string,
        pageNumber: selectedPageNumber,
        title: contextText.trim(),
      });
      setShowContextModal(false);
      setContextText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save context');
    }
  };

  const handleClosePopup = () => {
    setSelectedNodeIndex(null);
  };

  const handleOptionsMenu = () => {
    setShowOptionsModal(true);
  };

  const handleEditTitle = () => {
    setEditedTitle(notebook?.name || '');
    setShowOptionsModal(false);
    setShowEditTitleModal(true);
  };

  const handleEditLevel = () => {
    const currentLevel = LANGUAGE_LEVELS.find(level => level.code === notebook?.language_level) || LANGUAGE_LEVELS[1];
    setSelectedLevel(currentLevel);
    setShowOptionsModal(false);
    setShowEditLevelModal(true);
  };

  const handleDeleteNotebook = () => {
    setShowOptionsModal(false);
    Alert.alert(
      'Delete Notebook',
      'Are you sure you want to delete this notebook? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotebook.mutateAsync(id as string);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notebook');
            }
          }
        }
      ]
    );
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      Alert.alert('Error', 'Please enter a valid title');
      return;
    }

    try {
      await updateNotebook.mutateAsync({
        id: id as string,
        name: editedTitle.trim(),
      });
      setShowEditTitleModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update notebook title');
    }
  };

  const handleSaveLevel = async () => {
    try {
      await updateNotebook.mutateAsync({
        id: id as string,
        language_level: selectedLevel.code,
      });
      setShowEditLevelModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update language level');
    }
  };


  if (notebookLoading || pageNumbersLoading) {
    return (
      <View style={styles.container}>
        <Header 
          title="Loading Notebook..."
          leftElement={
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notebook...</Text>
        </View>
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
      {/* Header */}
      <Header 
        title={
          <View style={styles.headerTitleContainer}>
            <Image 
              source={{ uri: `https://flagcdn.com/w160/${getLanguageCountryCode(notebook.target_language || 'Spanish').toLowerCase()}.png` }}
              style={styles.headerFlag}
              resizeMode="cover"
              defaultSource={{ uri: 'https://flagcdn.com/w160/us.png' }}
            />
            <Text style={styles.headerTitle}>{notebook.name}</Text>
          </View>
        }
        leftElement={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        }
        rightElement={
          <View style={styles.rightHeaderGroup}>
            <View style={styles.streakContainer}>
              <Text style={[
                styles.streakText, 
                streakStatus === 'pending' && styles.pendingStreakText,
                streakStatus === 'broken' && styles.brokenStreakText
              ]}>
                {streakStatus === 'broken' ? '💔' : '🔥'} {displayStreak}
              </Text>
            </View>
            <TouchableOpacity onPress={handleOptionsMenu} style={styles.optionsButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Sinusoidal Roadmap */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.roadmapScrollView}
        contentContainerStyle={styles.roadmapContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Invisible overlay to close popup when tapping outside */}
        {selectedNodeIndex !== null && (
          <Pressable
            style={styles.popupCloseOverlay}
            onPress={handleClosePopup}
          >
            <View pointerEvents="none" style={{ flex: 1 }} />
          </Pressable>
        )}
        
        {/* Lesson Nodes */}
        {roadmapItems.map((item, index) => {
          const coordinates = getRoadmapCoordinates(index);
          return (
            <LessonNode
              key={`lesson-${item.page_number}`}
              item={item}
              index={index}
              coordinates={coordinates}
              onNodePress={handleNodePress}
              isPopupVisible={selectedNodeIndex === index}
              onAddWords={() => handleAddWords(item.page_number)}
              onReviewWords={handleReviewWords}
              onAddContext={() => handleAddContext(item.page_number)}
              onClosePopup={handleClosePopup}
              reviewWordsCount={reviewWords?.length || 0}
              notebook={notebook}
              currentTime={currentTime}
            />
          );
        })}
      </ScrollView>


      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notebook Options</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowOptionsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.optionButton} onPress={handleEditTitle}>
              <Ionicons name="pencil" size={20} color="#333" />
              <Text style={styles.optionButtonText}>Edit Title</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={handleEditLevel}>
              <Ionicons name="school" size={20} color="#333" />
              <Text style={styles.optionButtonText}>Edit Language Level</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.optionButton, styles.deleteButton]} onPress={handleDeleteNotebook}>
              <Ionicons name="trash" size={20} color="#FF4444" />
              <Text style={[styles.optionButtonText, styles.deleteButtonText]}>Delete Notebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Title Modal */}
      <Modal
        visible={showEditTitleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditTitleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleCentered}>Edit Notebook Title</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter notebook title"
              value={editedTitle}
              onChangeText={setEditedTitle}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleSaveTitle}
              >
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEditTitleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Language Level Modal */}
      <Modal
        visible={showEditLevelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditLevelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleCentered}>Edit Language Level</Text>
            
            {LANGUAGE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.code}
                style={[
                  styles.levelOption,
                  selectedLevel.code === level.code && styles.levelOptionSelected
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <View style={styles.levelInfo}>
                  <Text style={[
                    styles.levelOptionText,
                    selectedLevel.code === level.code && styles.levelOptionTextSelected
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={[
                    styles.levelDescription,
                    selectedLevel.code === level.code && styles.levelDescriptionSelected
                  ]}>
                    {level.description}
                  </Text>
                </View>
                {selectedLevel.code === level.code && (
                  <Ionicons name="checkmark" size={20} color="#FFA500" />
                )}
              </TouchableOpacity>
            ))}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleSaveLevel}
              >
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEditLevelModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Context Modal */}
      <Modal
        visible={showContextModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContextModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleCentered}>Add Page Context</Text>
            <Text style={styles.contextSubtitle}>
              Add notes about where you found these words or any other context for Lesson {selectedPageNumber}
            </Text>
            
            <TextInput
              style={[styles.input, styles.contextInput]}
              placeholder="e.g., 'Found these words in Chapter 5 of my textbook' or 'Words from today's news article'"
              value={contextText}
              onChangeText={setContextText}
              multiline={true}
              numberOfLines={4}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleSaveContext}
              >
                <Text style={styles.submitButtonText}>Save Context</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowContextModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.page,
    backgroundColor: Colors.white,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 250,
  },
  headerFlag: {
    width: 24,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    ...Typography.headerMedium,
    color: Colors.textBody,
    fontSize: 18,
    flex: 1,
  },
  rightHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakContainer: {
    ...Effects3D.streakContainer,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xlarge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  streakText: {
    ...Typography.streakText,
  },
  optionsButton: {
    padding: Spacing.xs,
  },
  brokenStreakText: {
    color: Colors.textLight,
    opacity: 0.7,
  },
  pendingStreakText: {
    color: Colors.textLight,
    opacity: 0.6,
  },
  flagEmoji: {
    fontSize: 20,
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
  roadmapScrollView: {
    flex: 1,
  },
  roadmapContainer: {
    position: 'relative',
    minHeight: 200 * 100 + 300, // Height for all 200 nodes + extra space
    paddingBottom: 150,
  },
  roadmapPath: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0, // Behind the nodes
  },
  roadmapNode: {
    width: 80,
    height: 80,
    zIndex: 1, // Above the path
  },
  lessonCircle: {
    ...Effects3D.badge,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Word Count Based Circle States
  activeCircle: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    borderBottomColor: Colors.errorDark,
  },
  partialCircle: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
    borderBottomColor: Colors.primaryDark,
  },
  completedCircle: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
    borderBottomColor: Colors.successDark,
  },
  missedCircle: {
    backgroundColor: '#D1D5DB',
    borderColor: '#D1D5DB',
    borderBottomColor: '#9CA3AF',
  },
  lockedCircle: {
    backgroundColor: '#D1D5DB',
    borderColor: '#D1D5DB',
    borderBottomColor: '#9CA3AF',
  },
  lessonNumber: {
    fontSize: 31,
    fontWeight: 'bold',
  },
  // Text colors for different states
  activeText: {
    color: Colors.white,
  },
  partialText: {
    color: Colors.textBody,
  },
  completedText: {
    color: Colors.white,
  },
  missedText: {
    color: Colors.textLight,
  },
  lockedText: {
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    ...Effects3D.card,
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.xl,
    maxHeight: '80%', // Prevent modal from being too tall
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.headerSmall,
    textAlign: 'left',
    flex: 1,
  },
  modalTitleCentered: {
    ...Typography.headerSmall,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  contextSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  contextInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  closeButton: {
    padding: 4,
  },
  input: {
    ...Effects3D.input,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  modalButton: {
    ...Effects3D.button,
    flex: 1,
    borderRadius: BorderRadius.small,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  submitButton: {
    ...Effects3D.buttonPrimary,
  },
  cancelButton: {
    ...Effects3D.buttonDanger,
  },
  submitButtonText: {
    ...Typography.buttonMedium,
  },
  cancelButtonText: {
    ...Typography.buttonMedium,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    width: '100%',
  },
  deleteButton: {
    backgroundColor: '#FFF5F5',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#FF4444',
  },
  optionsCancelButton: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
    borderBottomColor: '#9CA3AF',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  optionsCancelButtonText: {
    ...Typography.buttonMedium,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    width: '100%',
  },
  levelOptionSelected: {
    backgroundColor: '#FFF8F0',
  },
  levelOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  levelOptionTextSelected: {
    color: Colors.primary,
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
  },
  levelDescriptionSelected: {
    color: Colors.primaryDark,
  },
  embeddedPopup: {
    position: 'absolute',
    zIndex: 2, // Relative to the elevated node container
  },
  popupCloseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500, // Between active node (1000) and inactive nodes (1)
    elevation: 500, // Android elevation
  },
  popupArrow: {
    position: 'absolute',
    bottom: -12,
    left: 90, // Center of popup (200px width / 2 - 10px arrow width / 2)
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.white,
    borderStyle: 'solid',
    // Add border to make it more visible
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  nodePopupContent: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    minWidth: 200,
    maxWidth: 240,
  },
  nodePopupTitle: {
    ...Typography.titleMedium,
    marginBottom: Spacing.xs,
  },
  nodePopupSubtitle: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'none',
  },
  popupAddWordsBtn: {
    ...Effects3D.button,
    ...Effects3D.buttonPrimary,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  popupAddWordsBtnText: {
    ...Typography.buttonMedium,
    fontSize: 14,
  },
  popupReviewBtn: {
    ...Effects3D.button,
    ...Effects3D.buttonSuccess,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  popupReviewBtnText: {
    ...Typography.buttonMedium,
    fontSize: 14,
  },
  popupAddContextBtn: {
    ...Effects3D.button,
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderBottomColor: Colors.borderDark,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  popupAddContextBtnText: {
    ...Typography.buttonMedium,
    color: Colors.textBody,
    fontSize: 14,
  },
});