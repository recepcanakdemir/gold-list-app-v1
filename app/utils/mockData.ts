// Mock Data for App Store Screenshots
// Represents a "Power User" with 3 months of consistent usage

import { Profile, Notebook, Page, Word, DashboardStats, DailyWordCount, NotebookStageStats } from '../../lib/database-hooks';

// Mock Profile - High-performing user
export const mockProfile: Profile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  subscription_status: 'pro',
  has_ever_subscribed: true,
  target_lang: 'Spanish',
  daily_word_goal: 20,
  current_streak: 45,
  last_activity_date: new Date().toISOString(),
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 3 months ago
};

// Mock Notebooks - Multiple themed collections
export const mockNotebooks: Notebook[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Business Spanish',
    words_per_page_limit: 25,
    is_active: true,
    created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    target_language: 'Spanish',
    language_level: 'B2'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', 
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Daily Conversations',
    words_per_page_limit: 25,
    is_active: true,
    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    target_language: 'Spanish',
    language_level: 'B1'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    user_id: '550e8400-e29b-41d4-a716-446655440000', 
    name: 'Travel French',
    words_per_page_limit: 25,
    is_active: true,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    target_language: 'French',
    language_level: 'A2'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Academic Vocabulary',
    words_per_page_limit: 25,
    is_active: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    target_language: 'Spanish',
    language_level: 'C1'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'German Essentials',
    words_per_page_limit: 25,
    is_active: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago - recent
    target_language: 'German',
    language_level: 'A1'
  }
];

// Mock Pages for notebooks
export const mockPages: Page[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    notebook_id: '550e8400-e29b-41d4-a716-446655440001',
    page_number: 1,
    target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Comunicaci\u00f3n Empresarial',
    created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    notebook_id: '550e8400-e29b-41d4-a716-446655440002', 
    page_number: 1,
    target_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Expresiones Cotidianas',
    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    notebook_id: '550e8400-e29b-41d4-a716-446655440003',
    page_number: 1,
    target_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Vocabulaire de Voyage',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    notebook_id: '550e8400-e29b-41d4-a716-446655440005', // German Essentials
    page_number: 1,
    target_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Grundlagen des Deutschen',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock Words - Realistic English-Spanish/French vocabulary
export const mockWords: Word[] = [
  // Business Spanish (notebook-1, page-1)
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'emprendedor',
    definition: 'entrepreneur',
    type: 'noun',
    example_sentence: 'El emprendedor lanzó una startup exitosa.',
    example_translation: 'The entrepreneur launched a successful startup.',
    next_review_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'learned',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440021',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'responsabilidad',
    definition: 'accountability',
    type: 'noun',
    example_sentence: 'La responsabilidad es crucial en la gestión.',
    example_translation: 'Accountability is crucial in management.',
    next_review_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440022',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'aprovechar',
    definition: 'leverage, to take advantage of',
    type: 'noun/verb',
    example_sentence: 'Necesitamos aprovechar nuestros recursos eficazmente.',
    example_translation: 'We need to leverage our resources effectively.',
    next_review_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440023',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'paradigma',
    definition: 'paradigm, model',
    type: 'noun',
    example_sentence: 'El nuevo paradigma revolucionó la industria.',
    example_translation: 'The new paradigm revolutionized the industry.',
    next_review_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'learned',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  
  // Daily Conversations (notebook-2, page-2)
  {
    id: '550e8400-e29b-41d4-a716-446655440024',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'casualidad',
    definition: 'serendipity, happy coincidence',
    type: 'noun',
    example_sentence: 'Encontrar este café fue pura casualidad.',
    example_translation: 'Finding this cafe was pure serendipity.',
    next_review_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440025',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'resistencia',
    definition: 'resilience, ability to recover',
    type: 'noun',
    example_sentence: 'Su resistencia la ayudó a superar los desafíos.',
    example_translation: 'Her resilience helped her overcome challenges.',
    next_review_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'learned',
    created_at: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440026',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'ambiguo',
    definition: 'ambiguous, unclear',
    type: 'adjective',
    example_sentence: 'El mensaje era ambiguo y confuso.',
    example_translation: 'The message was ambiguous and confusing.',
    next_review_date: new Date().toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440027',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'elocuente',
    definition: 'eloquent, articulate',
    type: 'adjective',
    example_sentence: 'Dio un discurso elocuente en la conferencia.',
    example_translation: 'She gave an eloquent speech at the conference.',
    next_review_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },

  // Additional vocabulary to reach impressive totals
  {
    id: '550e8400-e29b-41d4-a716-446655440028',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'adquisición',
    definition: 'procurement, purchasing',
    type: 'noun',
    example_sentence: 'El proceso de adquisición tomó varias semanas.',
    example_translation: 'The procurement process took several weeks.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 4,
    status: 'learned',
    created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440029',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'efímero',
    definition: 'ephemeral, temporary',
    type: 'adjective',
    example_sentence: 'La belleza del atardecer era efímera.',
    example_translation: 'The beauty of the sunset was ephemeral.',
    next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'learned',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },

  // German Essentials (notebook-5, page-1) - PARTIAL PAGE (15/25 words) for "Add Word" stage
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Hallo',
    definition: 'hello',
    type: 'interjection',
    example_sentence: '**Hallo**, wie geht es dir?',
    example_translation: 'Hello, how are you?',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'danke',
    definition: 'thank you',
    type: 'interjection',
    example_sentence: '**Danke** für deine Hilfe.',
    example_translation: 'Thank you for your help.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440102',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'bitte',
    definition: 'please, you\'re welcome',
    type: 'adverb/interjection',
    example_sentence: 'Kannst du mir **bitte** helfen?',
    example_translation: 'Can you please help me?',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440103',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Wasser',
    definition: 'water',
    type: 'noun',
    example_sentence: 'Ich trinke **Wasser**.',
    example_translation: 'I drink water.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440104',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Haus',
    definition: 'house',
    type: 'noun',
    example_sentence: 'Das **Haus** ist groß.',
    example_translation: 'The house is big.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440105',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Auto',
    definition: 'car',
    type: 'noun',
    example_sentence: 'Mein **Auto** ist rot.',
    example_translation: 'My car is red.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440106',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Buch',
    definition: 'book',
    type: 'noun',
    example_sentence: 'Ich lese ein **Buch**.',
    example_translation: 'I am reading a book.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440107',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Zeit',
    definition: 'time',
    type: 'noun',
    example_sentence: 'Ich habe keine **Zeit**.',
    example_translation: 'I have no time.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440108',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Freund',
    definition: 'friend (male)',
    type: 'noun',
    example_sentence: 'Er ist mein **Freund**.',
    example_translation: 'He is my friend.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440109',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Musik',
    definition: 'music',
    type: 'noun',
    example_sentence: 'Ich höre **Musik**.',
    example_translation: 'I listen to music.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440110',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Essen',
    definition: 'food, meal',
    type: 'noun',
    example_sentence: 'Das **Essen** schmeckt gut.',
    example_translation: 'The food tastes good.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440111',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Schule',
    definition: 'school',
    type: 'noun',
    example_sentence: 'Die **Schule** beginnt um acht.',
    example_translation: 'School starts at eight.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440112',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Arbeit',
    definition: 'work, job',
    type: 'noun',
    example_sentence: 'Die **Arbeit** ist schwer.',
    example_translation: 'The work is difficult.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440113',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Familie',
    definition: 'family',
    type: 'noun',
    example_sentence: 'Meine **Familie** ist groß.',
    example_translation: 'My family is big.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440114',
    page_id: '550e8400-e29b-41d4-a716-446655440013',
    term: 'Wetter',
    definition: 'weather',
    type: 'noun',
    example_sentence: 'Das **Wetter** ist schön.',
    example_translation: 'The weather is nice.',
    next_review_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'waiting',
    created_at: new Date().toISOString() // Added today - newest word
  }
];

// Mock Dashboard Stats - High-performing metrics
export const mockDashboardStats: DashboardStats = {
  total_words: 420,
  words_added_period: 85,
  words_should_add: 140, // 7 days * 20 words/day
  words_added_percentage: 95,
  words_reviewed_period: 156,
  words_remembered_period: 122,
  mastery_rate_percentage: 78
};

// Mock Weekly Word Counts - Consistent high performance
export const mockWeeklyWordCounts: DailyWordCount[] = [
  { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), count: 18 },
  { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), count: 22 },
  { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), count: 15 },
  { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), count: 25 },
  { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), count: 20 },
  { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), count: 17 },
  { date: new Date(), count: 23 }
];

// Mock Activity Log - 3 months of consistent activity
export const generateMockActivityLog = (daysBack: number = 365): Date[] => {
  const activities: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < Math.min(daysBack, 90); i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Higher probability of activity on recent days
    // Skip some weekend days to make it realistic
    const dayOfWeek = date.getDay();
    const recentDays = i < 45;
    
    let activityProbability = 0.85; // Base high activity
    if (dayOfWeek === 0 || dayOfWeek === 6) activityProbability *= 0.7; // Lower weekend activity
    if (!recentDays) activityProbability *= 0.6; // Lower activity in early days
    
    if (Math.random() < activityProbability) {
      activities.push(new Date(date));
    }
  }
  
  return activities.reverse(); // Return chronological order
};

// Mock Notebook Stats - Aligned with word count data
export const mockNotebookStats = {
  '550e8400-e29b-41d4-a716-446655440001': { // Business Spanish - 180 total words (25+24+25+23+22+25+21+15)
    total_words: 180,
    words_added_period: 25,
    words_should_add: 35,
    words_added_percentage: 95,
    words_reviewed_period: 45,
    words_remembered_period: 38,
    mastery_rate_percentage: 84
  },
  '550e8400-e29b-41d4-a716-446655440002': { // Daily Conversations - 168 total words (25+25+24+22+23+20+11+18)
    total_words: 168,
    words_added_period: 35,
    words_should_add: 35,
    words_added_percentage: 100,
    words_reviewed_period: 52,
    words_remembered_period: 37,
    mastery_rate_percentage: 71
  },
  '550e8400-e29b-41d4-a716-446655440003': { // Travel French - 90 total words (25+22+18+15+10)
    total_words: 90,
    words_added_period: 25,
    words_should_add: 35,
    words_added_percentage: 89,
    words_reviewed_period: 28,
    words_remembered_period: 24,
    mastery_rate_percentage: 86
  },
  '550e8400-e29b-41d4-a716-446655440004': { // Academic Vocabulary - 35 total words (15+12+8)
    total_words: 35,
    words_added_period: 15,
    words_should_add: 35,
    words_added_percentage: 43,
    words_reviewed_period: 12,
    words_remembered_period: 8,
    mastery_rate_percentage: 67
  }
};

// Mock Notebook Stage Stats - Aligned with total word counts
export const mockNotebookStageStats: { [key: string]: NotebookStageStats } = {
  '550e8400-e29b-41d4-a716-446655440001': { // 180 total words
    bronze: 54,  // 30%
    silver: 72,  // 40% 
    gold: 54     // 30%
  },
  '550e8400-e29b-41d4-a716-446655440002': { // 168 total words
    bronze: 50,  // 30%
    silver: 67,  // 40%
    gold: 51     // 30%
  },
  '550e8400-e29b-41d4-a716-446655440003': { // 90 total words
    bronze: 27,  // 30%
    silver: 36,  // 40%
    gold: 27     // 30%
  },
  '550e8400-e29b-41d4-a716-446655440004': { // 35 total words (inactive notebook)
    bronze: 15,  // 43%
    silver: 12,  // 34%
    gold: 8      // 23%
  }
};

// Mock Overdue Words - 54 words balanced across all notebooks and all stages for comprehensive screenshots
export const mockOverdueWords: Word[] = [
  // ===================================================================================
  // BUSINESS SPANISH NOTEBOOK - Page ID: 550e8400-e29b-41d4-a716-446655440010
  // Mix of Bronze, Silver, Gold words for complete stage demonstration
  // ===================================================================================
  
  // BRONZE WORDS (6 total - 2 from each round 1,2,3)
  {
    id: '550e8400-e29b-41d4-a716-446655440030',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'negociación',
    definition: 'negotiation',
    type: 'noun',
    example_sentence: 'La **negociación** duró horas.',
    example_translation: 'The negotiation lasted for hours.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440031',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'reunión',
    definition: 'meeting',
    type: 'noun',
    example_sentence: 'Tenemos una **reunión** importante.',
    example_translation: 'We have an important meeting.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440032',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'presupuesto',
    definition: 'budget',
    type: 'noun',
    example_sentence: 'Necesitamos revisar el **presupuesto**.',
    example_translation: 'We need to review the budget.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440033',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'inversión',
    definition: 'investment',
    type: 'noun',
    example_sentence: 'La **inversión** fue muy rentable.',
    example_translation: 'The investment was very profitable.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440034',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'comercializar',
    definition: 'to market, to commercialize',
    type: 'verb',
    example_sentence: 'Vamos a **comercializar** el producto.',
    example_translation: 'We are going to market the product.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440035',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'competencia',
    definition: 'competition',
    type: 'noun',
    example_sentence: 'La **competencia** es muy fuerte.',
    example_translation: 'The competition is very strong.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString()
  },

  // SILVER WORDS (6 total - 2 from each round 1,2,3)
  {
    id: '550e8400-e29b-41d4-a716-446655440036',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'estrategia',
    definition: 'strategy',
    type: 'noun',
    example_sentence: 'Nuestra **estrategia** de mercado es innovadora.',
    example_translation: 'Our market strategy is innovative.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440037',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'liderazgo',
    definition: 'leadership',
    type: 'noun',
    example_sentence: 'Su **liderazgo** inspira al equipo.',
    example_translation: 'His leadership inspires the team.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440038',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'sostenibilidad',
    definition: 'sustainability',
    type: 'noun',
    example_sentence: 'La **sostenibilidad** es prioritaria.',
    example_translation: 'Sustainability is a priority.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440039',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'eficiencia',
    definition: 'efficiency',
    type: 'noun',
    example_sentence: 'Mejoramos la **eficiencia** operativa.',
    example_translation: 'We improved operational efficiency.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440040',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'transformación',
    definition: 'transformation',
    type: 'noun',
    example_sentence: 'La **transformación** digital avanza.',
    example_translation: 'Digital transformation is advancing.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440041',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'optimización',
    definition: 'optimization',
    type: 'noun',
    example_sentence: 'La **optimización** de procesos es clave.',
    example_translation: 'Process optimization is key.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },

  // GOLD WORDS (6 total - 2 from each round 1,2,3)
  {
    id: '550e8400-e29b-41d4-a716-446655440042',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'sinergia',
    definition: 'synergy',
    type: 'noun',
    example_sentence: 'La **sinergia** entre departamentos es excelente.',
    example_translation: 'The synergy between departments is excellent.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 68 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440043',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'paradigma',
    definition: 'paradigm, model',
    type: 'noun',
    example_sentence: 'El nuevo **paradigma** revolucionó la industria.',
    example_translation: 'The new paradigm revolutionized the industry.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440044',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'convergencia',
    definition: 'convergence',
    type: 'noun',
    example_sentence: 'La **convergencia** tecnológica facilita la integración.',
    example_translation: 'Technological convergence facilitates integration.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 72 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440045',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'hegemonía',
    definition: 'hegemony, dominance',
    type: 'noun',
    example_sentence: 'Su **hegemonía** en el mercado es evidente.',
    example_translation: 'Their hegemony in the market is evident.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440046',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'prospectiva',
    definition: 'foresight, forecasting',
    type: 'noun',
    example_sentence: 'La **prospectiva** estratégica orienta las decisiones.',
    example_translation: 'Strategic foresight guides decisions.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 78 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440047',
    page_id: '550e8400-e29b-41d4-a716-446655440010',
    term: 'disruptivo',
    definition: 'disruptive',
    type: 'adjective',
    example_sentence: 'Su enfoque **disruptivo** cambió la industria.',
    example_translation: 'Their disruptive approach changed the industry.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
  },

  // ===================================================================================
  // DAILY CONVERSATIONS NOTEBOOK - Page ID: 550e8400-e29b-41d4-a716-446655440011
  // Mix of Bronze, Silver, Gold words for complete stage demonstration
  // ===================================================================================

  // BRONZE WORDS (6 total)
  {
    id: '550e8400-e29b-41d4-a716-446655440048',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'casualidad',
    definition: 'coincidence',
    type: 'noun',
    example_sentence: 'Qué **casualidad** encontrarte aquí.',
    example_translation: 'What a coincidence to find you here.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440049',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'madrugada',
    definition: 'early morning, dawn',
    type: 'noun',
    example_sentence: 'Me levanto de **madrugada** para correr.',
    example_translation: 'I get up at dawn to run.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440050',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'antojo',
    definition: 'craving, whim',
    type: 'noun',
    example_sentence: 'Tengo **antojo** de chocolate.',
    example_translation: 'I have a craving for chocolate.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440051',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'murmullo',
    definition: 'murmur, whisper',
    type: 'noun',
    example_sentence: 'Se escucha un **murmullo** en el café.',
    example_translation: 'You can hear a murmur in the café.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440052',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'chismoso',
    definition: 'gossipy, nosy',
    type: 'adjective',
    example_sentence: 'Mi vecino es muy **chismoso**.',
    example_translation: 'My neighbor is very gossipy.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440053',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'desvelado',
    definition: 'sleep-deprived',
    type: 'adjective',
    example_sentence: 'Estoy **desvelado** por estudiar tarde.',
    example_translation: 'I\'m sleep-deprived from studying late.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString()
  },

  // SILVER WORDS (6 total)
  {
    id: '550e8400-e29b-41d4-a716-446655440054',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'nostalgia',
    definition: 'nostalgia',
    type: 'noun',
    example_sentence: 'Siento **nostalgia** por mi infancia.',
    example_translation: 'I feel nostalgia for my childhood.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440055',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'melancolía',
    definition: 'melancholy',
    type: 'noun',
    example_sentence: 'La lluvia me da **melancolía**.',
    example_translation: 'Rain makes me feel melancholy.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440056',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'serenidad',
    definition: 'serenity',
    type: 'noun',
    example_sentence: 'Busco **serenidad** en momentos difíciles.',
    example_translation: 'I seek serenity in difficult moments.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440057',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'espontaneidad',
    definition: 'spontaneity',
    type: 'noun',
    example_sentence: 'Me gusta la **espontaneidad** en las conversaciones.',
    example_translation: 'I like spontaneity in conversations.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440058',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'complicidad',
    definition: 'complicity, intimacy',
    type: 'noun',
    example_sentence: 'Hay **complicidad** entre nosotros.',
    example_translation: 'There\'s complicity between us.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440059',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'vulnerabilidad',
    definition: 'vulnerability',
    type: 'noun',
    example_sentence: 'Mostrar **vulnerabilidad** requiere valor.',
    example_translation: 'Showing vulnerability requires courage.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },

  // GOLD WORDS (6 total)
  {
    id: '550e8400-e29b-41d4-a716-446655440060',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'introspección',
    definition: 'introspection',
    type: 'noun',
    example_sentence: 'La **introspección** me ayuda a conocerme.',
    example_translation: 'Introspection helps me know myself.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 68 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440061',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'efímero',
    definition: 'ephemeral, temporary',
    type: 'adjective',
    example_sentence: 'La felicidad puede ser **efímera**.',
    example_translation: 'Happiness can be ephemeral.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440062',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'sutileza',
    definition: 'subtlety',
    type: 'noun',
    example_sentence: 'Habló con gran **sutileza** sobre el tema.',
    example_translation: 'He spoke with great subtlety about the topic.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 72 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440063',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'perspicacia',
    definition: 'insight, perceptiveness',
    type: 'noun',
    example_sentence: 'Su **perspicacia** es notable.',
    example_translation: 'His insight is remarkable.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440064',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'idiosincrasia',
    definition: 'idiosyncrasy, peculiarity',
    type: 'noun',
    example_sentence: 'Cada cultura tiene su **idiosincrasia**.',
    example_translation: 'Each culture has its idiosyncrasy.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 78 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440065',
    page_id: '550e8400-e29b-41d4-a716-446655440011',
    term: 'epifanía',
    definition: 'epiphany, sudden realization',
    type: 'noun',
    example_sentence: 'Tuve una **epifanía** durante la meditación.',
    example_translation: 'I had an epiphany during meditation.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
  },

  // ===================================================================================
  // TRAVEL FRENCH NOTEBOOK - Page ID: 550e8400-e29b-41d4-a716-446655440012
  // Mix of Bronze, Silver, Gold words for complete stage demonstration
  // ===================================================================================

  // BRONZE WORDS (6 total)
  {
    id: '550e8400-e29b-41d4-a716-446655440066',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'dépaysement',
    definition: 'disorientation, culture shock',
    type: 'noun',
    example_sentence: 'J\'ai ressenti un **dépaysement** en arrivant.',
    example_translation: 'I felt disorientation when I arrived.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440067',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'flâneur',
    definition: 'stroller, wanderer',
    type: 'noun',
    example_sentence: 'Je suis un **flâneur** dans les rues de Paris.',
    example_translation: 'I am a wanderer in the streets of Paris.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440068',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'émerveillement',
    definition: 'wonder, amazement',
    type: 'noun',
    example_sentence: 'L\' **émerveillement** devant la tour Eiffel.',
    example_translation: 'Wonder at seeing the Eiffel Tower.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440069',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'savourer',
    definition: 'to savor, to enjoy',
    type: 'verb',
    example_sentence: 'Je veux **savourer** chaque moment.',
    example_translation: 'I want to savor every moment.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440070',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'authentique',
    definition: 'authentic',
    type: 'adjective',
    example_sentence: 'Ce restaurant est vraiment **authentique**.',
    example_translation: 'This restaurant is truly authentic.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440071',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'pittoresque',
    definition: 'picturesque',
    type: 'adjective',
    example_sentence: 'Ce village est très **pittoresque**.',
    example_translation: 'This village is very picturesque.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'bronze',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString()
  },

  // SILVER WORDS (6 total)
  {
    id: '550e8400-e29b-41d4-a716-446655440072',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'patrimoine',
    definition: 'heritage, patrimony',
    type: 'noun',
    example_sentence: 'Le **patrimoine** culturel est précieux.',
    example_translation: 'Cultural heritage is precious.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440073',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'enchantement',
    definition: 'enchantment',
    type: 'noun',
    example_sentence: 'Ce lieu est rempli d\' **enchantement**.',
    example_translation: 'This place is filled with enchantment.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440074',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'sérénité',
    definition: 'serenity',
    type: 'noun',
    example_sentence: 'J\'ai trouvé la **sérénité** dans ce jardin.',
    example_translation: 'I found serenity in this garden.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440075',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'nostalgie',
    definition: 'nostalgia',
    type: 'noun',
    example_sentence: 'Une douce **nostalgie** m\'envahit.',
    example_translation: 'A sweet nostalgia comes over me.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440076',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'élégance',
    definition: 'elegance',
    type: 'noun',
    example_sentence: 'L\' **élégance** française est légendaire.',
    example_translation: 'French elegance is legendary.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440077',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'raffinement',
    definition: 'refinement',
    type: 'noun',
    example_sentence: 'Le **raffinement** de la cuisine française.',
    example_translation: 'The refinement of French cuisine.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'silver',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },

  // GOLD WORDS (6 total)
  {
    id: '550e8400-e29b-41d4-a716-446655440078',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'quintessence',
    definition: 'quintessence, essence',
    type: 'noun',
    example_sentence: 'C\'est la **quintessence** de l\'art français.',
    example_translation: 'It\'s the quintessence of French art.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 68 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440079',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'sophistication',
    definition: 'sophistication',
    type: 'noun',
    example_sentence: 'La **sophistication** de cette architecture.',
    example_translation: 'The sophistication of this architecture.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 1,
    status: 'ready',
    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440080',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'transcendance',
    definition: 'transcendence',
    type: 'noun',
    example_sentence: 'La **transcendance** de cette expérience.',
    example_translation: 'The transcendence of this experience.',
    next_review_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 72 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440081',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'épanouissement',
    definition: 'fulfillment, blossoming',
    type: 'noun',
    example_sentence: 'Voyager favorise l\' **épanouissement** personnel.',
    example_translation: 'Travel promotes personal fulfillment.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 2,
    status: 'ready',
    created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440082',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'perspicacité',
    definition: 'perspicacity, keen insight',
    type: 'noun',
    example_sentence: 'Sa **perspicacité** culturelle m\'impressionne.',
    example_translation: 'His cultural perspicacity impresses me.',
    next_review_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 78 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440083',
    page_id: '550e8400-e29b-41d4-a716-446655440012',
    term: 'sublimation',
    definition: 'sublimation',
    type: 'noun',
    example_sentence: 'L\'art est une forme de **sublimation**.',
    example_translation: 'Art is a form of sublimation.',
    next_review_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    stage: 'gold',
    round: 3,
    status: 'ready',
    created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock Words Count by Page (for Roadmap visualization)
export const mockWordsCountByPage: { [notebookId: string]: { [pageNumber: number]: number } } = {
  '550e8400-e29b-41d4-a716-446655440001': { // Business Spanish
    1: 25, 2: 24, 3: 25, 4: 23, 5: 22, 6: 25, 7: 21, 8: 15
  },
  '550e8400-e29b-41d4-a716-446655440002': { // Daily Conversations (partial page for "Add" state)
    1: 25, 2: 25, 3: 24, 4: 22, 5: 23, 6: 20, 7: 11, 8: 18  // Current page has 18/25 words
  },
  '550e8400-e29b-41d4-a716-446655440003': { // Travel French
    1: 25, 2: 22, 3: 18, 4: 15, 5: 10
  },
  '550e8400-e29b-41d4-a716-446655440004': { // Academic Vocabulary (inactive)
    1: 15, 2: 12, 3: 8
  },
  '550e8400-e29b-41d4-a716-446655440005': { // German Essentials (in "Add word" stage)
    1: 15  // Partial page - only 15/25 words added so far
  }
};

// Mock total word count
export const mockTotalWordCount = 420;