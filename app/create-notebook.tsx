import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { useCreateNotebook } from '../lib/database-hooks';

// Language data with country codes for flags
const LANGUAGES = [
  { code: 'es', name: 'Spanish', countryCode: 'ES' },
  { code: 'fr', name: 'French', countryCode: 'FR' },
  { code: 'de', name: 'German', countryCode: 'DE' },
  { code: 'it', name: 'Italian', countryCode: 'IT' },
  { code: 'pt', name: 'Portuguese', countryCode: 'PT' },
  { code: 'ru', name: 'Russian', countryCode: 'RU' },
  { code: 'zh', name: 'Chinese', countryCode: 'CN' },
  { code: 'ja', name: 'Japanese', countryCode: 'JP' },
  { code: 'ko', name: 'Korean', countryCode: 'KR' },
  { code: 'ar', name: 'Arabic', countryCode: 'SA' },
  { code: 'nl', name: 'Dutch', countryCode: 'NL' },
  { code: 'sv', name: 'Swedish', countryCode: 'SE' },
  { code: 'no', name: 'Norwegian', countryCode: 'NO' },
  { code: 'pl', name: 'Polish', countryCode: 'PL' },
  { code: 'tr', name: 'Turkish', countryCode: 'TR' },
  { code: 'hi', name: 'Hindi', countryCode: 'IN' },
];

// Language levels
const LANGUAGE_LEVELS = [
  { code: 'A1', label: 'A1 - Beginner', description: 'Can understand basic phrases' },
  { code: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple tasks' },
  { code: 'B1', label: 'B1 - Intermediate', description: 'Can handle most everyday situations' },
  { code: 'B2', label: 'B2 - Upper Intermediate', description: 'Can express ideas fluently' },
  { code: 'C1', label: 'C1 - Advanced', description: 'Can use language effectively' },
  { code: 'C2', label: 'C2 - Proficient', description: 'Can understand virtually everything' },
];

// Daily goal options
const DAILY_GOALS = [5, 10, 15, 20];

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (language: typeof LANGUAGES[0]) => void;
  selectedLanguage: typeof LANGUAGES[0];
}

function LanguagePickerModal({ visible, onClose, onSelect, selectedLanguage }: LanguagePickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Language</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.pickerItem,
                  selectedLanguage.code === language.code && styles.pickerItemSelected
                ]}
                onPress={() => {
                  onSelect(language);
                  onClose();
                }}
              >
                <CountryFlag isoCode={language.countryCode} size={20} style={styles.flagIcon} />
                <Text style={[
                  styles.pickerItemText,
                  selectedLanguage.code === language.code && styles.pickerItemTextSelected
                ]}>
                  {language.name}
                </Text>
                {selectedLanguage.code === language.code && (
                  <Ionicons name="checkmark" size={20} color="#FFA500" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface LevelPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (level: typeof LANGUAGE_LEVELS[0]) => void;
  selectedLevel: typeof LANGUAGE_LEVELS[0];
}

function LevelPickerModal({ visible, onClose, onSelect, selectedLevel }: LevelPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Your Level</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {LANGUAGE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.code}
                style={[
                  styles.pickerItem,
                  selectedLevel.code === level.code && styles.pickerItemSelected
                ]}
                onPress={() => {
                  onSelect(level);
                  onClose();
                }}
              >
                <View style={styles.levelInfo}>
                  <Text style={[
                    styles.pickerItemText,
                    selectedLevel.code === level.code && styles.pickerItemTextSelected
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function CreateNotebookScreen() {
  const router = useRouter();
  const createNotebook = useCreateNotebook();
  
  const [notebookName, setNotebookName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]); // Spanish by default
  const [selectedLevel, setSelectedLevel] = useState(LANGUAGE_LEVELS[1]); // A2 by default
  const [selectedDailyGoal, setSelectedDailyGoal] = useState(10);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNotebook = async () => {
    if (!notebookName.trim()) {
      Alert.alert('Error', 'Please enter a notebook name');
      return;
    }

    setIsCreating(true);
    try {
      await createNotebook.mutateAsync({
        name: notebookName.trim(),
        target_language: selectedLanguage.name,
        language_level: selectedLevel.code,
        words_per_page_limit: selectedDailyGoal, // Map daily goal UI to existing database field
      });
      
      router.back(); // Go back to home screen
    } catch (error) {
      console.error('Create notebook error details:', {
        error,
        errorMessage: (error as any)?.message,
        errorStack: (error as any)?.stack,
        formData: {
          name: notebookName.trim(),
          target_language: selectedLanguage.name,
          language_level: selectedLevel.code,
          words_per_page_limit: selectedDailyGoal,
        }
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to create notebook: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Notebook</Text>
        <TouchableOpacity 
          onPress={handleCreateNotebook} 
          style={[styles.createButton, !notebookName.trim() && styles.createButtonDisabled]}
          disabled={!notebookName.trim() || isCreating}
        >
          <Text style={[styles.createButtonText, !notebookName.trim() && styles.createButtonTextDisabled]}>
            {isCreating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notebook Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notebook Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter notebook name"
            value={notebookName}
            onChangeText={setNotebookName}
            autoFocus
            maxLength={50}
          />
        </View>

        {/* Target Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Language</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLanguagePicker(true)}
          >
            <View style={styles.dropdownContent}>
              <CountryFlag isoCode={selectedLanguage.countryCode} size={20} style={styles.flagIcon} />
              <Text style={styles.dropdownText}>{selectedLanguage.name}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Language Level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Level in Target Language</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLevelPicker(true)}
          >
            <View style={styles.dropdownContent}>
              <Text style={styles.dropdownText}>{selectedLevel.label}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Daily Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Daily Goal</Text>
          <Text style={styles.sectionSubtitle}>How many words do you want to add daily?</Text>
          <View style={styles.goalSelector}>
            {DAILY_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.goalOption,
                  selectedDailyGoal === goal && styles.goalOptionSelected
                ]}
                onPress={() => setSelectedDailyGoal(goal)}
              >
                <Text style={[
                  styles.goalOptionText,
                  selectedDailyGoal === goal && styles.goalOptionTextSelected
                ]}>
                  {goal}
                </Text>
                <Text style={[
                  styles.goalOptionLabel,
                  selectedDailyGoal === goal && styles.goalOptionLabelSelected
                ]}>
                  words
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Language Picker Modal */}
      <LanguagePickerModal
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={setSelectedLanguage}
        selectedLanguage={selectedLanguage}
      />

      {/* Level Picker Modal */}
      <LevelPickerModal
        visible={showLevelPicker}
        onClose={() => setShowLevelPicker(false)}
        onSelect={setSelectedLevel}
        selectedLevel={selectedLevel}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFA500',
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 32,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  flagIcon: {
    borderRadius: 2,
    marginRight: 8,
  },
  goalSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  goalOptionSelected: {
    borderColor: '#FFA500',
    backgroundColor: '#FFF8F0',
  },
  goalOptionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  goalOptionTextSelected: {
    color: '#FFA500',
  },
  goalOptionLabel: {
    fontSize: 14,
    color: '#666',
  },
  goalOptionLabelSelected: {
    color: '#FFA500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#FFF8F0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  pickerItemTextSelected: {
    color: '#FFA500',
    fontWeight: '600',
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  levelDescriptionSelected: {
    color: '#CC8400',
  },
});