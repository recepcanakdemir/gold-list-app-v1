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
import { Colors, Spacing, BorderRadius, Typography, Effects3D, CommonStyles, ButtonStyles } from '../styles/theme';
import { Header } from '../components/Header';

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
const DAILY_GOALS = [10, 15, 20, 25];

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
      <Header 
        title="Create Notebook"
        noPadding={true}
        titleSize="medium"
        leftElement={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        }
        rightElement={
          <TouchableOpacity 
            onPress={handleCreateNotebook} 
            style={[styles.createButton, !notebookName.trim() && styles.createButtonDisabled]}
            disabled={!notebookName.trim() || isCreating}
          >
            <Text style={[styles.createButtonText, !notebookName.trim() && styles.createButtonTextDisabled]}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        }
      />

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
    ...CommonStyles.page,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  createButton: {
    ...ButtonStyles.primarySmall,
  },
  createButtonDisabled: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
    borderBottomColor: Colors.border,
  },
  createButtonText: {
    ...Typography.buttonMedium,
    fontSize: 16,
  },
  createButtonTextDisabled: {
    color: Colors.textLight,
  },
  content: {
    ...CommonStyles.content,
  },
  section: {
    ...CommonStyles.section,
  },
  sectionLabel: {
    ...Typography.titleLarge,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.subtitleSmall,
    marginBottom: Spacing.lg,
  },
  textInput: {
    ...Effects3D.input,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: 16,
    color: Colors.textBody,
  },
  dropdown: {
    ...Effects3D.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    ...Typography.body,
    marginLeft: Spacing.sm,
  },
  flagIcon: {
    borderRadius: BorderRadius.small / 2,
    marginRight: Spacing.sm,
  },
  goalSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  goalOption: {
    ...Effects3D.container,
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
  },
  goalOptionSelected: {
    ...Effects3D.buttonPrimary,
    backgroundColor: '#FFF8F0',
  },
  goalOptionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textBody,
    marginBottom: Spacing.xs,
  },
  goalOptionTextSelected: {
    color: Colors.primary,
  },
  goalOptionLabel: {
    ...Typography.subtitleSmall,
  },
  goalOptionLabelSelected: {
    color: Colors.primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    ...Effects3D.card,
    borderTopLeftRadius: BorderRadius.xlarge,
    borderTopRightRadius: BorderRadius.xlarge,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    ...Effects3D.container,
    borderRadius: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 3,
  },
  pickerTitle: {
    ...Typography.titleLarge,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: '#FFF8F0',
  },
  pickerItemText: {
    ...Typography.body,
    flex: 1,
    marginLeft: Spacing.md,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  levelInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  levelDescription: {
    ...Typography.subtitleSmall,
    marginTop: 2,
  },
  levelDescriptionSelected: {
    color: Colors.primaryDark,
  },
});