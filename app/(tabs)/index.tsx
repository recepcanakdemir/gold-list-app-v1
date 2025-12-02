import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Modal, 
  Alert, 
  FlatList,
  TextInput,
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useNotebooks, useProfile, useCreateNotebook, useNotebookStats, useNotebookButtonState } from '../../lib/database-hooks';
import { useCurrentTime, daysBetween } from '../../lib/time-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotebookCardProps {
  notebook: {
    id: string;
    name: string;
    created_at: string;
    user_id: string;
    words_per_page_limit: number;
    is_active: boolean;
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
    <TouchableOpacity style={styles.notebookCard} onPress={onPress}>
      <View style={styles.notebookHeader}>
        <View style={styles.progressCircles}>
          <View style={[styles.circle, styles.bronzeCircle]}>
            <Text style={styles.circleText}>0</Text>
          </View>
          <View style={[styles.circle, styles.silverCircle]}>
            <Ionicons name="lock-closed" size={16} color="#666" />
          </View>
          <View style={[styles.circle, styles.goldCircle]}>
            <Ionicons name="lock-closed" size={16} color="#666" />
          </View>
        </View>
        <Text style={styles.flagEmoji}>🇪🇸</Text>
      </View>
      
      <Text style={styles.notebookTitle}>{notebook.name}</Text>
      <Text style={styles.notebookStats}>
        {stats ? `${stats.total} total • ${stats.mastered} mastered` : "Loading..."}
      </Text>
      
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
    </TouchableOpacity>
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
  const [showCreateNotebook, setShowCreateNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [selectedWordLimit, setSelectedWordLimit] = useState(20);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const { width: screenWidth } = Dimensions.get('window');
  
  const router = useRouter();
  const { currentTime, addDay, resetToNow, isSimulated } = useCurrentTime();
  const { data: notebooks, isLoading } = useNotebooks();
  const { data: profile } = useProfile();
  const createNotebook = useCreateNotebook();

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

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) {
      Alert.alert('Error', 'Please enter a notebook name');
      return;
    }

    try {
      await createNotebook.mutateAsync({ 
        name: newNotebookName.trim(),
        words_per_page_limit: selectedWordLimit
      });
      setNewNotebookName('');
      setSelectedWordLimit(20); // Reset to default
      setShowCreateNotebook(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create notebook');
    }
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
            <Text style={styles.streakText}>🔥 {profile?.current_streak || 0}</Text>
          </View>
        </View>
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
          <Text style={styles.streakText}>🔥 {profile?.current_streak || 0}</Text>
        </View>
      </View>

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
        <EmptyNotebooks onCreateNotebook={() => setShowCreateNotebook(true)} />
      )}

      {/* FAB - Only show if there are notebooks already */}
      {notebooks && notebooks.length > 0 && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setShowCreateNotebook(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Create Notebook Modal */}
      <Modal
        visible={showCreateNotebook}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateNotebook(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Notebook</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter notebook name"
              value={newNotebookName}
              onChangeText={setNewNotebookName}
              autoFocus
            />
            
            <Text style={styles.sectionLabel}>Words per page:</Text>
            <View style={styles.wordLimitSelector}>
              {[10, 15, 20, 25].map(limit => (
                <TouchableOpacity
                  key={limit}
                  style={[
                    styles.limitOption,
                    selectedWordLimit === limit && styles.limitOptionActive
                  ]}
                  onPress={() => setSelectedWordLimit(limit)}
                >
                  <Text style={[
                    styles.limitText,
                    selectedWordLimit === limit && styles.limitTextActive
                  ]}>
                    {limit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleCreateNotebook}
                disabled={!newNotebookName.trim()}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateNotebook(false);
                  setNewNotebookName('');
                  setSelectedWordLimit(20); // Reset to default
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircles: {
    flexDirection: 'row',
    gap: 8,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bronzeCircle: {
    backgroundColor: '#CD7F32',
  },
  silverCircle: {
    backgroundColor: '#C0C0C0',
  },
  goldCircle: {
    backgroundColor: '#FFD700',
  },
  circleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  flagEmoji: {
    fontSize: 32,
  },
  notebookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notebookStats: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  // Base action button style
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  submitButton: {
    backgroundColor: '#FFA500',
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginLeft: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  wordLimitSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  limitOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  limitOptionActive: {
    backgroundColor: '#FFA500',
  },
  limitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  limitTextActive: {
    color: 'white',
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
});