import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Effects3D, Spacing, BorderRadius } from '../styles/theme';
import { supabase } from '../lib/supabase';
import { useOnboarding } from '../lib/onboarding-context';
import LottieAnimation from '../components/LottieAnimation';
import AnimatedWordEntry from '../components/AnimatedWordEntry';
import AnimatedReviewCards from '../components/AnimatedReviewCards';
import GoldlistSchema from '../components/GoldlistSchema';
import GoldlistMonthView from '../components/GoldlistMonthView';

// Import Lottie animations
const LanguageTranslatorAnimation = require('../assets/lottie/Language Translator.json');
const BrainAnimation = require('../assets/lottie/Brain.json');
const LazySleepingAnimation = require('../assets/lottie/LazyDoge Sleeping.json');
const FlirtingDogAnimation = require('../assets/lottie/Flirting Dog.json');
const CalendarAnimation = require('../assets/lottie/Calender.json');

const { width: screenWidth } = Dimensions.get('window');

// Generate unique session ID
const generateSessionId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Onboarding state interface
interface OnboardingState {
  currentStep: number;
  
  // Critical fields (will become separate columns)
  targetLang: string;
  level: string; // CEFR: A1, A2, B1, B2, C1, C2
  
  // Preference fields (will go in JSONB)
  dailyTime: string;
  motivation: string;
  trafficSource: string;
  goldlistExperience: string;
  memoryAssessment: string;
  learningChallenge: string;
  
  sessionId: string;
}

// Popular languages (top 5 shown initially)
const POPULAR_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
];

// All languages (comprehensive list from create-notebook.tsx)
const ALL_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

// CEFR Language levels
const LEVELS = [
  { code: 'A1', name: 'A1 - Beginner', description: 'Can understand basic phrases', icon: '🌱' },
  { code: 'A2', name: 'A2 - Elementary', description: 'Can communicate in simple tasks', icon: '🌿' },
  { code: 'B1', name: 'B1 - Intermediate', description: 'Can handle most everyday situations', icon: '🌳' },
  { code: 'B2', name: 'B2 - Upper Intermediate', description: 'Can express ideas fluently', icon: '🌲' },
  { code: 'C1', name: 'C1 - Advanced', description: 'Can use language effectively', icon: '🏔️' },
  { code: 'C2', name: 'C2 - Proficient', description: 'Can understand virtually everything', icon: '⭐' },
];

// Daily time commitment (extended options, no word counts)
const DAILY_TIMES = [
  { code: '5min', name: '5 minutes', description: 'Quick daily practice', icon: '⚡' },
  { code: '10min', name: '10 minutes', description: 'Short focused sessions', icon: '🎯' },
  { code: '15min', name: '15 minutes', description: 'Balanced approach', icon: '⚖️' },
  { code: '20min', name: '20 minutes', description: 'Solid commitment', icon: '💪' },
  { code: '30min', name: '30 minutes', description: 'Dedicated study time', icon: '🔥' },
  { code: '45min', name: '45 minutes', description: 'Deep learning sessions', icon: '🚀' },
];

const MOTIVATIONS = [
  { code: 'travel', name: 'Travel', description: 'Explore the world', icon: '✈️' },
  { code: 'career', name: 'Career', description: 'Professional growth', icon: '💼' },
  { code: 'culture', name: 'Culture', description: 'Cultural connection', icon: '🎭' },
  { code: 'brain', name: 'Brain Training', description: 'Mental exercise', icon: '🧠' },
  { code: 'love', name: 'Finding Love', description: 'Connect with someone special', icon: '💕' },
];

// Traffic sources
const TRAFFIC_SOURCES = [
  { code: 'app_store', name: 'App Store', description: 'Found in app store', iconName: 'apple', brandColor: '#000000' },
  { code: 'friend', name: 'Friend', description: 'Recommended by friend', iconName: 'user', brandColor: '#4CAF50' },
  { code: 'youtube', name: 'YouTube', description: 'Saw on YouTube', iconName: 'youtube-play', brandColor: '#FF0000' },
  { code: 'instagram', name: 'Instagram', description: 'Discovered on Instagram', iconName: 'instagram', brandColor: '#E1306C' },
  { code: 'tiktok', name: 'TikTok', description: 'Saw on TikTok', iconName: 'music', brandColor: '#000000' },
  { code: 'x', name: 'X (Twitter)', description: 'Found on X platform', iconName: 'twitter', brandColor: '#1DA1F2' },
  { code: 'reddit', name: 'Reddit', description: 'Saw on Reddit', iconName: 'reddit-alien', brandColor: '#FF4500' },
  { code: 'other', name: 'Other', description: 'Other source', iconName: 'question-circle', brandColor: '#808080' },
];

// Gold List Method experience
const GOLDLIST_EXPERIENCE = [
  { code: 'familiar', name: 'Yes, I am familiar', description: 'I know the method well', icon: '💎' },
  { code: 'heard_of', name: 'I have heard of it', description: 'Sounds familiar', icon: '👂' },
  { code: 'new', name: 'No, this is new to me', description: 'First time hearing about it', icon: '🆕' },
];

// Memory assessment
const MEMORY_ASSESSMENT = [
  { code: 'excellent', name: 'Excellent', description: 'I remember things very well', icon: '🧠' },
  { code: 'good', name: 'Good', description: 'Generally good at remembering', icon: '👍' },
  { code: 'average', name: 'Average', description: 'Sometimes I remember, sometimes I don\'t', icon: '🤔' },
  { code: 'poor', name: 'Poor', description: 'I struggle with remembering things', icon: '😅' },
];

// Learning challenges
const LEARNING_CHALLENGES = [
  { code: 'remembering', name: 'Remembering words', description: 'I forget what I learn', icon: '🧠' },
  { code: 'motivation', name: 'Motivation', description: 'Staying motivated to study', icon: '💪' },
  { code: 'time', name: 'Time', description: 'Finding time to study', icon: '⏰' },
  { code: 'consistency', name: 'Consistency', description: 'Studying regularly', icon: '📅' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    
    // Critical fields
    targetLang: '',
    level: '',
    
    // Preference fields  
    dailyTime: '',
    motivation: '',
    trafficSource: '',
    goldlistExperience: '',
    memoryAssessment: '',
    learningChallenge: '',
    
    sessionId: generateSessionId(),
  });

  // Rate Us related state (moved from renderRateUs to fix hooks rule violation)
  const hasRateUsTriggered = useRef(false);
  const [isRating, setIsRating] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(4.76)).current; // (1/21) * 100
  
  // Analysis step animation values (for step 12)
  const analysisOpacity1 = useRef(new Animated.Value(0)).current;
  const analysisOpacity2 = useRef(new Animated.Value(0)).current;
  const analysisOpacity3 = useRef(new Animated.Value(0)).current;

  // Progress calculation
  const progress = (state.currentStep / 21) * 100;

  // Update state helper
  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Rate Us handler (moved from renderRateUs to fix hooks rule violation)
  const handleRateUs = async () => {
    if (isRating) return; // Prevent double calls
    
    setIsRating(true);
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      console.log('Review request failed:', error);
    } finally {
      setIsRating(false);
      transitionToNextStep(); // Use existing transition function
    }
  };

  // Handle analysis step animation (step 16)
  useEffect(() => {
    if (state.currentStep === 16) {
      // Reset animation values
      analysisOpacity1.setValue(0);
      analysisOpacity2.setValue(0);
      analysisOpacity3.setValue(0);

      // Animate in sequence
      Animated.timing(analysisOpacity1, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(analysisOpacity2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setTimeout(() => {
              Animated.timing(analysisOpacity3, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setTimeout(() => {
                  nextStep();
                }, 1000);
              });
            }, 500);
          });
        }, 500);
      });
    }
  }, [state.currentStep]);

  // Auto-trigger rate us when reaching step 20
  useEffect(() => {
    if (state.currentStep === 20 && !hasRateUsTriggered.current) {
      hasRateUsTriggered.current = true;
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        handleRateUs();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [state.currentStep]);

  // Smooth transition between steps
  const transitionToNextStep = () => {
    if (state.currentStep >= 21) return;

    // Fade out current step
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Update step
      const nextStepNumber = state.currentStep + 1;
      updateState({ currentStep: nextStepNumber });
      
      // Update progress bar
      Animated.timing(progressAnim, {
        toValue: (nextStepNumber / 20) * 100,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Fade in new step
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Navigation helpers
  const nextStep = transitionToNextStep;

  const goToPreviousStep = () => {
    if (state.currentStep <= 1) return;
    
    // Skip analysis step when going back
    const targetStep = state.currentStep === 17 ? 15 : state.currentStep - 1;
    
    // Fade out current step
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Update step and progress
      updateState({ currentStep: targetStep });
      
      Animated.timing(progressAnim, {
        toValue: (targetStep / 20) * 100,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Fade in new step
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const goToStep = (step: number) => {
    if (step < 1 || step > 20) return;

    // Fade out current step
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Update step and progress
      updateState({ currentStep: step });
      
      Animated.timing(progressAnim, {
        toValue: (step / 20) * 100,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Fade in new step
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Submit analytics data with JSONB preferences
  const submitAnalytics = async () => {
    try {
      // Prepare preferences object for JSONB column
      const preferences = {
        motivation: state.motivation,
        traffic_source: state.trafficSource,
        goldlist_experience: state.goldlistExperience,
        memory_assessment: state.memoryAssessment,
        learning_challenge: state.learningChallenge,
        daily_commitment_minutes: parseInt(state.dailyTime.replace('min', '')),
        survey_version: '2.0', // For tracking different onboarding versions
        completed_steps: 20
      };

      const { error } = await supabase
        .from('onboarding_analytics')
        .insert({
          session_id: state.sessionId,
          target_language: state.targetLang,
          level: state.level,
          daily_time: state.dailyTime,
          motivation: state.motivation, // Keep for backward compatibility
          traffic_source: state.trafficSource,
          goldlist_experience: state.goldlistExperience,
          memory_assessment: state.memoryAssessment,
          learning_challenge: state.learningChallenge,
          preferences: preferences, // JSONB column with all preference data
        });

      if (error) {
        console.error('Analytics submission error:', error);
      }
    } catch (error) {
      console.error('Analytics submission failed:', error);
    }
  };

  // Handle completion
  const handleCompleteOnboarding = async () => {
    try {
      await submitAnalytics();
      await completeOnboarding(); // Use context function - updates state immediately!
      
      // No delay needed - state is updated immediately
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Onboarding completion failed:', error);
      // Fallback navigation even if analytics fail
      await completeOnboarding(); // Still update context state
      router.replace('/(auth)/login');
    }
  };

  // Calculate daily plan (updated for new time options)
  const getDailyPlan = () => {
    const timeMap: Record<string, number> = {
      '5min': 8,
      '10min': 12,
      '15min': 20,
      '20min': 25,
      '30min': 35,
      '45min': 50,
    };
    return timeMap[state.dailyTime] || 20;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Back Button and Progress */}
      <View style={styles.header}>
        {state.currentStep > 1 && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={goToPreviousStep}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        
        {state.currentStep > 1 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    })
                  }
                ]}
              />
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressText}>{state.currentStep}/21</Text>
            </View>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContainer}>
        <Animated.View 
          style={[
            styles.contentContainer,
            { opacity: fadeAnim }
          ]}
        >
          {renderStepContent()}
        </Animated.View>
      </View>

      {/* Safe Area for bottom */}
      <View style={{ height: insets.bottom }} />
    </View>
  );

  // Render step content based on current step
  function renderStepContent() {
    switch (state.currentStep) {
      case 1:
        return renderWelcome();
      case 2:
        return renderProblem();
      case 3:
        return renderSolution();
      case 4:
        return renderRule1();
      case 5:
        return renderRule2();
      case 6:
        return renderRule3();
      case 7:
        return renderResult();
      case 8:
        return renderTrafficSource();
      case 9:
        return renderLanguageSelection();
      case 10:
        return renderLevelSelection();
      case 11:
        return renderTimeSelection();
      case 12:
        return renderMotivationSelection();
      case 13:
        return renderGoldlistExperience();
      case 14:
        return renderMemoryAssessment();
      case 15:
        return renderLearningChallenge();
      case 16:
        return renderAnalyzing();
      case 17:
        return renderGoal();
      case 18:
        return renderRoadmap();
      case 19:
        return renderNotifications();
      case 20:
        return renderRateUs();
      case 21:
        return renderFinal();
      default:
        return renderWelcome();
    }
  }

  // Step 1: Welcome
  function renderWelcome() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Welcome to Goldlist</Text>
          <Text style={styles.stepSubtitle}>
            The most relaxed way to learn a language.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <LottieAnimation 
            source={LanguageTranslatorAnimation}
            size={280}
            autoPlay={true}
            loop={true}
          />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Start Journey</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 2: Problem
  function renderProblem() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Stop Cramming</Text>
          <Text style={styles.stepSubtitle}>
            Short-term memory is a leaky bucket. Instant memorization fails.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <LottieAnimation 
            source={BrainAnimation}
            size={280}
            autoPlay={true}
            loop={true}
          />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 3: Solution
  function renderSolution() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Trust Your Brain</Text>
          <Text style={styles.stepSubtitle}>
            Let your subconscious mind do the work. No stress.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <LottieAnimation 
            source={LazySleepingAnimation}
            size={280}
            autoPlay={true}
            loop={true}
          />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Show Me How</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 4: Rule 1
  function renderRule1() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Just Write</Text>
          <Text style={styles.stepSubtitle}>
            Create a list of words. Read them once. Then close the notebook.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <AnimatedWordEntry />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Next Rule</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 5: Rule 2
  function renderRule2() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>The 14-Day Rule</Text>
          <Text style={styles.stepSubtitle}>
            Wait exactly 2 weeks. This filters out short-term memory.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <LottieAnimation source={CalendarAnimation} size={420} />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Next Rule</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 6: Rule 3
  function renderRule3() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Distill the Gold</Text>
          <Text style={styles.stepSubtitle}>
            After 2 weeks, test yourself. Keep only what you forgot.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <AnimatedReviewCards />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>See Results</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 7: Result
  function renderResult() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Long-Term Mastery</Text>
          <Text style={styles.stepSubtitle}>
            Only true knowledge remains. 30% becomes pure Gold.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <GoldlistSchema size={280} />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Let's Personalize</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 8: Traffic Source (NEW)
  function renderTrafficSource() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Where did you hear about us?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsGrid}>
            {TRAFFIC_SOURCES.map((source) => (
              <TouchableOpacity
                key={source.code}
                style={[
                  styles.optionCard,
                  state.trafficSource === source.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ trafficSource: source.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <FontAwesome 
                  name={source.iconName as any} 
                  size={32} 
                  color={source.brandColor} 
                />
                <Text style={styles.optionText}>{source.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 9: Language Selection (Enhanced with Search)
  function renderLanguageSelection() {
    const filteredLanguages = ALL_LANGUAGES.filter(lang => 
      lang.name.toLowerCase().includes(languageSearch.toLowerCase())
    );

    return (
      <View style={styles.stepContainer}>
        {/* Fixed title section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>What are you learning?</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages..."
              placeholderTextColor={Colors.textMuted}
              value={languageSearch}
              onChangeText={setLanguageSearch}
            />
          </View>
        </View>

        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsGrid}>
            {(languageSearch ? filteredLanguages : (showAllLanguages ? ALL_LANGUAGES : POPULAR_LANGUAGES)).map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionCard,
                  state.targetLang === lang.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ targetLang: lang.code });
                  setLanguageSearch(''); // Clear search after selection
                  setShowAllLanguages(false); // Reset to popular view
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{lang.flag}</Text>
                <Text style={styles.optionText}>{lang.name}</Text>
              </TouchableOpacity>
            ))}
            
            {!showAllLanguages && !languageSearch && (
              <TouchableOpacity
                style={styles.showMoreCard}
                onPress={() => setShowAllLanguages(true)}
              >
                <Text style={styles.showMoreEmoji}>🌍</Text>
                <Text style={styles.showMoreText}>More languages...</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {languageSearch && filteredLanguages.length === 0 && (
          <Text style={styles.noResultsText}>No languages found</Text>
        )}
      </View>
    );
  }

  // Step 10: Level Selection
  function renderLevelSelection() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>What is your level?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsColumn}>
            {LEVELS.map((level) => (
              <TouchableOpacity
                key={level.code}
                style={[
                  styles.levelCard,
                  state.level === level.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ level: level.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{level.icon}</Text>
                <View style={styles.levelCardText}>
                  <Text style={styles.optionText}>{level.name}</Text>
                  <Text style={styles.optionDescription}>{level.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 11: Time Selection
  function renderTimeSelection() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Daily commitment?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsColumn}>
            {DAILY_TIMES.map((time) => (
              <TouchableOpacity
                key={time.code}
                style={[
                  styles.levelCard,
                  state.dailyTime === time.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ dailyTime: time.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{time.icon}</Text>
                <View style={styles.levelCardText}>
                  <Text style={styles.optionText}>{time.name}</Text>
                  <Text style={styles.optionDescription}>{time.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 12: Motivation Selection
  function renderMotivationSelection() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Why are you learning?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsGrid}>
            {MOTIVATIONS.map((mot) => (
              <TouchableOpacity
                key={mot.code}
                style={[
                  styles.motivationCard,
                  state.motivation === mot.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ motivation: mot.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{mot.icon}</Text>
                <Text style={styles.optionText}>{mot.name}</Text>
                <Text style={styles.optionDescription}>{mot.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 13: Gold List Experience (NEW)
  function renderGoldlistExperience() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Have you used the Gold List Method before?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsColumn}>
            {GOLDLIST_EXPERIENCE.map((exp) => (
              <TouchableOpacity
                key={exp.code}
                style={[
                  styles.levelCard,
                  state.goldlistExperience === exp.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ goldlistExperience: exp.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{exp.icon}</Text>
                <View style={styles.levelCardText}>
                  <Text style={styles.optionText}>{exp.name}</Text>
                  <Text style={styles.optionDescription}>{exp.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 14: Memory Assessment (NEW)
  function renderMemoryAssessment() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>How is your long-term memory?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsColumn}>
            {MEMORY_ASSESSMENT.map((memory) => (
              <TouchableOpacity
                key={memory.code}
                style={[
                  styles.levelCard,
                  state.memoryAssessment === memory.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ memoryAssessment: memory.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{memory.icon}</Text>
                <View style={styles.levelCardText}>
                  <Text style={styles.optionText}>{memory.name}</Text>
                  <Text style={styles.optionDescription}>{memory.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 15: Learning Challenge (NEW)
  function renderLearningChallenge() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>What is your biggest challenge?</Text>
        </View>
        
        {/* Main Content - Scrollable Options */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.optionsColumn}>
            {LEARNING_CHALLENGES.map((challenge) => (
              <TouchableOpacity
                key={challenge.code}
                style={[
                  styles.levelCard,
                  state.learningChallenge === challenge.code && styles.optionCardSelected
                ]}
                onPress={() => {
                  updateState({ learningChallenge: challenge.code });
                  setTimeout(nextStep, 300);
                }}
              >
                <Text style={styles.optionEmoji}>{challenge.icon}</Text>
                <View style={styles.levelCardText}>
                  <Text style={styles.optionText}>{challenge.name}</Text>
                  <Text style={styles.optionDescription}>{challenge.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  // Step 16: Analyzing (Loading)
  function renderAnalyzing() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Animated.Text 
            style={[styles.stepTitle, { opacity: analysisOpacity2 }]}
          >
            Analyzing Profile...
          </Animated.Text>
          <Animated.Text 
            style={[styles.stepSubtitle, { opacity: analysisOpacity3 }]}
          >
            Calculating optimal intervals...
          </Animated.Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Animated.Text 
            style={[styles.stepIcon, { opacity: analysisOpacity1 }]}
          >
            🤖
          </Animated.Text>
        </View>
      </>
    );
  }

  // Step 17: Goal
  function renderGoal() {
    const dailyWords = getDailyPlan();
    
    // Get display names from selected data
    const getMotivationName = () => MOTIVATIONS.find(m => m.code === state.motivation)?.name || 'your learning goal';
    const getLevelName = () => LEVELS.find(l => l.code === state.level)?.name || 'your level';
    
    const motivationName = getMotivationName();
    const levelName = getLevelName();
    
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Your Daily Plan</Text>
          <Text style={styles.stepSubtitle}>
            To achieve your goal of {motivationName} at the {levelName} level, your {state.dailyTime} daily commitment perfectly matches this pace:
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.dailyPlanContainer}>
            <Text style={styles.stepIcon}>🎯</Text>
            <Text style={styles.dailyWordsText}>{dailyWords} words</Text>
            <Text style={styles.dailyWordsSubtext}>per day</Text>
          </View>
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Show Me Timeline</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 18: Roadmap
  function renderRoadmap() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Your First Month</Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <GoldlistMonthView size={340} />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={nextStep}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 19: Notifications
  function renderNotifications() {
    const handleEnableNotifications = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log('Notification permission status:', status);
        nextStep();
      } catch (error) {
        console.error('Failed to request notification permissions:', error);
        nextStep(); // Still proceed even if permission fails
      }
    };

    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Don't Break the Chain</Text>
          <Text style={styles.stepSubtitle}>
            We will remind you exactly when your 14-day cycle is ready.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.stepIcon}>🔔</Text>
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleEnableNotifications}
          >
            <Text style={styles.primaryButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={nextStep}
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 20: Rate Us
  function renderRateUs() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Support Our Mission</Text>
          <Text style={styles.stepSubtitle}>
            {isRating 
              ? "Opening review dialog..." 
              : "Help us reach more learners by leaving a quick rating."
            }
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.stepIcon}>⭐</Text>
          {isRating && (
            <ActivityIndicator 
              size="small" 
              color={Colors.primary} 
              style={{ marginTop: Spacing.md }} 
            />
          )}
        </View>
        
        {/* Bottom Buttons */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={[styles.primaryButton, isRating && styles.buttonDisabled]}
            onPress={handleRateUs}
            disabled={isRating}
          >
            <Text style={styles.primaryButtonText}>
              {isRating ? "Rating..." : "Rate Again"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={nextStep}
            disabled={isRating}
          >
            <Text style={styles.secondaryButtonText}>
              {isRating ? "Please wait..." : "Skip"}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Step 21: Final
  function renderFinal() {
    return (
      <>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepTitle}>Ready to begin?</Text>
          <Text style={styles.stepSubtitle}>
            Let's create your account and start your language learning journey.
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <LottieAnimation 
            source={FlirtingDogAnimation}
            size={280}
            autoPlay={true}
            loop={true}
          />
        </View>
        
        {/* Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleCompleteOnboarding}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.inactive,
    borderRadius: 3,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressTextContainer: {
    width: 50,
    alignItems: 'flex-end',
  },
  progressText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  titleSection: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  stepIcon: {
    fontSize: 64,
    marginBottom: Spacing.xxl,
  },
  dailyPlanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyWordsText: {
    ...Typography.headerLarge,
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  dailyWordsSubtext: {
    ...Typography.titleMedium,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  stepTitle: {
    ...Typography.headerLarge,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.textPrimary,
  },
  stepSubtitle: {
    ...Typography.titleMedium,
    textAlign: 'center',
    color: Colors.textMuted,
    marginBottom: Spacing.xxxl,
    lineHeight: 24,
    maxWidth: 280,
  },
  primaryButton: {
    ...Effects3D.button,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    minWidth: 200,
  },
  primaryButtonText: {
    ...Typography.buttonLarge,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  secondaryButtonText: {
    ...Typography.titleMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  noResultsText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  optionsColumn: {
    width: '100%',
    gap: Spacing.md,
  },
  optionCard: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: 'center',
    minWidth: 120,
    minHeight: 100,
    maxWidth: screenWidth * 0.28,
  },
  optionCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
  },
  levelCard: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelCardText: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  motivationCard: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: 'center',
    width: (screenWidth - Spacing.xl * 2 - Spacing.lg) / 2,
    minHeight: 120,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  optionText: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  optionDescription: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  timelineContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  timelineEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  timelineText: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  showMoreCard: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: 'center',
    minWidth: 140,
    minHeight: 100,
    borderStyle: 'dashed',
  },
  showMoreEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  showMoreText: {
    ...Typography.titleMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});