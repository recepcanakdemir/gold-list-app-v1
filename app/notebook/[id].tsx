import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
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
  useProfile
} from '../../lib/database-hooks';
import { useCurrentTime, formatDate, addDays, daysBetween } from '../../lib/time-provider';

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
  onNodePress: (item: RoadmapItem, index: number, event: any) => void;
}

function LessonNode({ item, index, onNodePress }: LessonNodeProps) {
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
  
  // Natural flowing zigzag pattern - each node maps to exact column position
  const getNodePosition = (index: number) => {
    const cycle = index % 12;
    switch (cycle) {
      case 0: return 'position3';  // 00100 - Node 1 in column 3
      case 1: return 'position4';  // 00010 - Node 2 in column 4  
      case 2: return 'position5';  // 00001 - Node 3 in column 5
      case 3: return 'position4';  // 00010 - Node 4 in column 4
      case 4: return 'position3';  // 00100 - Node 5 in column 3
      case 5: return 'position2';  // 01000 - Node 6 in column 2
      case 6: return 'position1';  // 10000 - Node 7 in column 1
      case 7: return 'position2';  // 01000 - Node 8 in column 2
      case 8: return 'position3';  // 00100 - Node 9 in column 3
      case 9: return 'position4';  // 00010 - Node 10 in column 4
      case 10: return 'position5'; // 00001 - Node 11 in column 5
      case 11: return 'position4'; // 00010 - Node 12 in column 4
      default: return 'position3';
    }
  };
  
  const position = getNodePosition(index);
  const positionStyle = position === 'position1' ? styles.nodePosition1 : 
                       position === 'position2' ? styles.nodePosition2 :
                       position === 'position3' ? styles.nodePosition3 :
                       position === 'position4' ? styles.nodePosition4 : styles.nodePosition5;

  return (
    <View style={[styles.roadmapNode, positionStyle]}>
      <TouchableOpacity 
        style={[styles.lessonCircle, getCircleStyle()]}
        onPress={(event) => onNodePress(item, index, event)}
        disabled={item.isLocked} // Allow clicks on all nodes except future locked ones
      >
        <Text style={[styles.lessonNumber, getTextStyle()]}>
          {item.page_number}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NotebookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentTime } = useCurrentTime();
  
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditTitleModal, setShowEditTitleModal] = useState(false);
  const [showNodePopup, setShowNodePopup] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RoadmapItem | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [editedTitle, setEditedTitle] = useState('');
  
  const { data: notebook, isLoading: notebookLoading } = useNotebook(id as string);
  const { data: pageNumbers, isLoading: pageNumbersLoading } = usePageNumbers(id as string);
  const { data: wordsCount } = useWordsCountByPage(id as string);
  const { data: reviewWords } = useReviewWords(id as string, currentTime);
  const { data: profile } = useProfile();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();
  
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

  const handleNodePress = (item: RoadmapItem, index: number, event: any) => {
    // Allow clicks on active nodes and all past nodes (block only future locked nodes)
    if (item.isLocked) return;
    
    // Measure the touch position
    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      // Determine node position using same logic as component
      const getNodePosition = (index: number) => {
        const cycle = index % 12;
        switch (cycle) {
          case 0: return 'position3';
          case 1: return 'position4';
          case 2: return 'position5';
          case 3: return 'position4';
          case 4: return 'position3';
          case 5: return 'position2';
          case 6: return 'position1';
          case 7: return 'position2';
          case 8: return 'position3';
          case 9: return 'position4';
          case 10: return 'position5';
          case 11: return 'position4';
          default: return 'position3';
        }
      };
      
      const position = getNodePosition(index);
      let popupX: number;
      
      if (position === 'position3') {
        popupX = pageX + width + 20; // Show to right of center node
      } else if (position === 'position1' || position === 'position2') {
        popupX = pageX + width + 20; // Show to right of left nodes
      } else { // position4 or position5
        popupX = pageX - 187; // Show to left of right nodes (167 + 20 margin)
      }
      
      const popupY = pageY - 50; // Center popup vertically with node
      
      setPopupPosition({ x: popupX, y: popupY });
      setSelectedNode(item);
      setShowNodePopup(true);
    });
  };

  const handleAddWords = () => {
    setShowNodePopup(false);
    if (selectedNode) {
      router.push(`/notebook/${id}/add?page=${selectedNode.page_number}`);
    }
  };

  const handleReviewWords = () => {
    setShowNodePopup(false);
    router.push(`/notebook/${id}/review`);
  };

  const handleAddContext = () => {
    setShowNodePopup(false);
    Alert.alert('Add Context', 'Context addition feature coming soon!');
  };

  const handleOptionsMenu = () => {
    setShowOptionsModal(true);
  };

  const handleEditTitle = () => {
    setEditedTitle(notebook?.name || '');
    setShowOptionsModal(false);
    setShowEditTitleModal(true);
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


  const renderRoadmapItem = ({ item, index }: { item: RoadmapItem; index: number }) => (
    <LessonNode 
      item={item} 
      index={index}
      onNodePress={handleNodePress}
    />
  );

  if (notebookLoading || pageNumbersLoading) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.flagEmoji}>🇪🇸</Text>
          <Text style={styles.headerTitle}>{notebook.name}</Text>
        </View>
        <View style={styles.streakContainer}>
          <Text style={[
            styles.streakText, 
            streakStatus === 'pending' && styles.pendingStreakText,
            streakStatus === 'broken' && styles.brokenStreakText
          ]}>
            {streakStatus === 'broken' ? '💔' : '🔥'} {displayStreak}
          </Text>
        </View>
        <TouchableOpacity onPress={handleOptionsMenu}>
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Visual Debug Display for Time Simulation */}
      <View style={{ padding: 10, backgroundColor: '#f0f8ff', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
          📅 Sim Date: {currentTime.toDateString()}
        </Text>
      </View>

      {/* Roadmap */}
      <FlatList
        data={roadmapItems}
        renderItem={renderRoadmapItem}
        keyExtractor={(item) => `lesson-${item.page_number}`}
        contentContainerStyle={styles.roadmapContainer}
        showsVerticalScrollIndicator={false}
      />


      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notebook Options</Text>
            
            <TouchableOpacity style={styles.optionButton} onPress={handleEditTitle}>
              <Ionicons name="pencil" size={20} color="#333" />
              <Text style={styles.optionButtonText}>Edit Title</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.optionButton, styles.deleteButton]} onPress={handleDeleteNotebook}>
              <Ionicons name="trash" size={20} color="#FF4444" />
              <Text style={[styles.optionButtonText, styles.deleteButtonText]}>Delete Notebook</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton, { marginTop: 16 }]} 
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
            <Text style={styles.modalTitle}>Edit Notebook Title</Text>
            
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

      {/* Node Popup */}
      <Modal
        visible={showNodePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNodePopup(false)}
      >
        <TouchableOpacity 
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setShowNodePopup(false)}
        >
          <View style={[styles.nodePopupContainer, { left: popupPosition.x, top: popupPosition.y }]}>
            <View style={styles.nodePopupContent}>
              <Text style={styles.nodePopupTitle}>
                Lesson {selectedNode?.page_number}
              </Text>
              <Text style={styles.nodePopupSubtitle}>
                {(() => {
                  if (!selectedNode || !notebook) return "";
                  
                  // Calculate current active day (same logic as roadmap generation)
                  const notebookCreatedDate = new Date(notebook.created_at);
                  const currentDate = new Date(currentTime);
                  const daysSinceCreation = daysBetween(notebookCreatedDate, currentDate);
                  const currentActiveDay = daysSinceCreation + 1;
                  
                  const isCurrentDay = selectedNode.page_number === currentActiveDay;
                  const hasWords = selectedNode.wordCount && selectedNode.wordCount > 0;
                  const reachedLimit = selectedNode.wordCount >= selectedNode.wordLimit;
                  
                  if (isCurrentDay) {
                    // Current day logic
                    if (reachedLimit) {
                      return "Words are waiting for review date";
                    } else {
                      return hasWords 
                        ? `Add ${selectedNode.wordLimit - selectedNode.wordCount} more words`
                        : `Add ${selectedNode.wordLimit || 20} words`;
                    }
                  } else {
                    // Past day logic  
                    if (hasWords) {
                      return "Words are waiting for review date";
                    } else {
                      return "No words added - skipped day";
                    }
                  }
                })()}
              </Text>
              
              {/* Show action buttons only for current day nodes that haven't reached limit */}
              {(() => {
                if (!selectedNode || !notebook) return false;
                
                const notebookCreatedDate = new Date(notebook.created_at);
                const currentDate = new Date(currentTime);
                const daysSinceCreation = daysBetween(notebookCreatedDate, currentDate);
                const currentActiveDay = daysSinceCreation + 1;
                
                const isCurrentDay = selectedNode.page_number === currentActiveDay;
                const reachedLimit = selectedNode.wordCount >= selectedNode.wordLimit;
                
                return isCurrentDay && !reachedLimit;
              })() && (
                <>
                  {/* Show Review button if there are due words, otherwise Add Words */}
                  {reviewWords && reviewWords.length > 0 ? (
                    <TouchableOpacity style={styles.popupReviewBtn} onPress={handleReviewWords}>
                      <Ionicons name="refresh" size={16} color="white" style={{ marginRight: 8 }} />
                      <Text style={styles.popupReviewBtnText}>
                        Review ({reviewWords.length} due)
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.popupAddWordsBtn} onPress={handleAddWords}>
                      <Text style={styles.popupAddWordsBtnText}>Add Words</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity style={styles.popupAddContextBtn} onPress={handleAddContext}>
                    <Text style={styles.popupAddContextBtnText}>Add Context</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
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
  flagEmoji: {
    fontSize: 20,
  },
  roadmapContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 150,
    alignItems: 'center',
  },
  roadmapNode: {
    marginBottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  nodePosition1: {
    alignItems: 'flex-start',
    paddingLeft: 10,  // Column 1 - Far left edge (10000)
  },
  nodePosition2: {
    alignItems: 'flex-start',  
    paddingLeft: '20%',  // Column 2 - Left side (01000)
  },
  nodePosition3: {
    alignItems: 'center',  // Column 3 - Perfect center (00100)
  },
  nodePosition4: {
    alignItems: 'flex-end',
    paddingRight: '20%',  // Column 4 - Right side (00010)
  },
  nodePosition5: {
    alignItems: 'flex-end',
    paddingRight: 10,  // Column 5 - Far right edge (00001)
  },
  lessonCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Word Count Based Circle States
  activeCircle: {
    backgroundColor: '#FF4444', // Red - Today's lesson, no words yet
  },
  partialCircle: {
    backgroundColor: '#FFD700', // Yellow - Some words, under limit
  },
  completedCircle: {
    backgroundColor: '#4CAF50', // Green - Reached word limit
  },
  missedCircle: {
    backgroundColor: '#E0E0E0', // Gray - Missed day, no words
  },
  lockedCircle: {
    backgroundColor: '#E0E0E0', // Gray - Future lesson
  },
  lessonNumber: {
    fontSize: 31,
    fontWeight: 'bold',
  },
  // Text colors for different states
  activeText: {
    color: 'white', // White text on red background
  },
  partialText: {
    color: '#333', // Dark text on yellow background
  },
  completedText: {
    color: 'white', // White text on green background
  },
  missedText: {
    color: '#999', // Gray text on gray background
  },
  lockedText: {
    color: '#999', // Gray text on gray background
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    minHeight: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#FFA500',
  },
  cancelButton: {
    backgroundColor: '#FF4444',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  popupOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  nodePopupContainer: {
    position: 'absolute',
  },
  nodePopupContent: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 167,
  },
  nodePopupTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  nodePopupSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 14,
  },
  popupAddWordsBtn: {
    backgroundColor: '#FFA500',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 7,
    marginBottom: 6,
    alignItems: 'center',
  },
  popupAddWordsBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  popupReviewBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 7,
    marginBottom: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  popupReviewBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  popupAddContextBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  popupAddContextBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
  },
});