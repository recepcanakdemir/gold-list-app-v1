# GoldList App - Comprehensive Project Documentation

## 📱 Project Overview

**GoldList** is a sophisticated mobile vocabulary learning application built using the proven Goldlist Method for language acquisition. The app provides a systematic approach to learning vocabulary through spaced repetition and progressive stages of mastery.

### 🎯 Core Concept
The Goldlist Method is a language learning technique that uses:
- **Bronze Stage**: Initial word input and familiarization
- **Silver Stage**: First review after 2-week intervals  
- **Gold Stage**: Final mastery review after additional 2-week intervals
- **Progressive reduction**: Only 70% of words advance to each subsequent stage

### 🚀 Key Features
- **Local-first architecture** with instant responsiveness
- **Gamified learning** with streaks, progress tracking, and achievements
- **Multi-language support** with country flags and level indicators (A1-C2)
- **Smart review system** with automated scheduling
- **Freemium monetization** (300 words free, unlimited with Pro)
- **Cross-device synchronization** via Supabase backend

---

## 🛠 Technology Stack

### **Frontend Framework**
- **React Native** (0.81.5) with Expo SDK (54.0.26)
- **TypeScript** for type safety
- **Expo Router** (6.0.15) for file-based navigation

### **State Management**
- **React Query (TanStack)** (5.90.11) for server state
- **AsyncStorage** for local persistence 
- **MMKV** integration for performance

### **Backend & Database**
- **Supabase** (2.86.0) for authentication and PostgreSQL database
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live data sync

### **Authentication**
- Email/Password authentication
- Apple Sign-In integration
- Session persistence with auto-refresh
- Password reset with deep linking

### **Monetization & Analytics**
- **RevenueCat** (9.6.9) for subscription management
- **Expo Store Review** for App Store ratings
- **Expo Notifications** for engagement

### **UI/UX Libraries**
- **@expo/vector-icons** & **Ionicons** for iconography
- **react-native-svg** for custom graphics
- **Lottie React Native** for animations
- **react-native-country-flag** for language flags

---

## 🏗 Architecture Overview

### **Folder Structure**
```
GoldlistApp/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx             # Login/signup with Apple Auth
│   │   ├── forgot-password.tsx   # Password reset request
│   │   └── reset-password.tsx    # Password reset form
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home - Notebooks overview
│   │   ├── dashboard.tsx         # Analytics and progress
│   │   └── settings.tsx          # User settings and account
│   ├── notebook/[id]/            # Dynamic notebook routes
│   │   ├── [id].tsx              # Notebook detail (calendar view)
│   │   ├── add.tsx               # Add new words
│   │   └── review.tsx            # Review words
│   ├── onboarding.tsx            # First-time user setup
│   ├── paywall.tsx               # Subscription upgrade
│   └── create-notebook.tsx       # New notebook creation
├── lib/                          # Core business logic
│   ├── database-hooks.ts         # React Query hooks
│   ├── revenuecat.tsx           # Subscription management
│   ├── supabase.ts              # Database client
│   ├── time-provider.tsx        # Time simulation utilities
│   ├── notifications.ts         # Push notification setup
│   └── onboarding-context.tsx   # Onboarding state
├── components/                   # Reusable UI components
│   ├── Header.tsx               # App header with streaks
│   ├── HeaderProButton.tsx      # Pro upgrade button
│   ├── SettingsProBanner.tsx   # Settings upgrade banner
│   └── [animations]             # Lottie and animated components
├── styles/
│   └── theme.ts                 # Design system constants
└── assets/                      # Images, icons, Lottie files
```

### **Design System**
The app uses a comprehensive design system with:
- **Color palette**: Orange primary (#FFA500), Gold accents (#FFD700)
- **Typography hierarchy**: 8 different text styles with consistent weights
- **Spacing system**: 8-point grid (4px, 8px, 12px, 16px, 20px, 24px, 32px)
- **3D Effects**: Shadows, borders, and elevation for gamified feel
- **Responsive design**: Adapts to different screen sizes

---

## 🗄 Database Schema

### **Core Tables**

#### **profiles**
- `id` (uuid, PK) - References auth.users
- `subscription_status` (text) - 'active', 'inactive', 'canceled'
- `has_ever_subscribed` (boolean) - Subscription history
- `target_lang` (text) - Primary learning language
- `daily_word_goal` (int) - User's daily target (default: 20)
- `current_streak` (int) - Consecutive activity days
- `last_activity_date` (date) - Last interaction date
- `created_at` (timestamp)

#### **notebooks**
- `id` (uuid, PK)
- `user_id` (uuid, FK) - Owner reference
- `name` (text) - Notebook title
- `target_language` (text) - Language being learned
- `source_language` (text) - User's native language  
- `level` (text) - A1, A2, B1, B2, C1, C2
- `words_per_page_limit` (int) - Default: 20
- `is_active` (boolean) - Soft delete flag
- `created_at` (timestamp)

#### **pages**
- `id` (uuid, PK)
- `notebook_id` (uuid, FK)
- `page_number` (int) - Sequential numbering
- `target_date` (date) - Scheduled completion date
- `title` (text, nullable) - Optional page label
- `created_at` (timestamp)

#### **words**
- `id` (uuid, PK)
- `page_id` (uuid, FK)
- `term` (text) - Foreign language word
- `definition` (text) - Translation/meaning
- `type` (text, nullable) - Noun, verb, adjective, etc.
- `example_sentence` (text, nullable) - Usage example
- `example_translation` (text, nullable) - Example translation
- `next_review_date` (date) - When to review next
- `stage` (text) - 'bronze', 'silver', 'gold'
- `round` (int) - Review round (1-4)
- `status` (text) - 'waiting', 'ready', 'learned', 'leech'

#### **daily_activity_log**
- `user_id` (uuid, FK)
- `date` (date)
- Unique constraint on (user_id, date) for heatmap tracking

---

## 🔄 User Flow & Navigation

### **Authentication Flow**
1. **App Launch** → Check existing session
2. **First Time** → Onboarding → Create account
3. **Returning User** → Auto-login → Dashboard
4. **Forgot Password** → Email → Deep link → Reset form

### **Main App Flow**
1. **Home Tab** → View notebooks → Select notebook
2. **Notebook Detail** → Calendar view → Select page/date
3. **Add Words** → Input vocabulary → Save to database
4. **Review Mode** → Spaced repetition → Update progress
5. **Dashboard** → View statistics → Track streaks

### **Subscription Flow**
1. **Free User** → Hits 300 word limit → Paywall
2. **Pro Upgrade** → RevenueCat → Unlock unlimited words
3. **Settings Banner** → Upgrade promotion → Paywall

### **Core User Journey**
```
Login → Home (Notebooks) → Select/Create Notebook → 
Add Words (Bronze) → Wait 14 days → Review (Silver) → 
Wait 14 days → Review (Gold) → Mastery Complete
```

---

## ⚙️ Key Features Deep Dive

### **Goldlist Method Implementation**
- **Stage Progression**: Bronze → Silver → Gold over 4-week cycles
- **Filtering System**: Only 70% of words advance per stage
- **Ghost Pages**: Client-side calculation for missing days
- **Smart Scheduling**: Automatic review date calculation

### **Performance Optimizations**
- **Zero-latency UI**: Optimistic updates with React Query
- **Local-first**: AsyncStorage caching with Supabase sync
- **FlatList rendering**: Virtualized lists for large datasets
- **Memoized calculations**: useMemo for expensive operations

### **Freemium Model**
- **Free Tier**: 300 words maximum
- **Pro Features**: Unlimited words, advanced analytics
- **Upgrade Touchpoints**: Header button, settings banner, limit reached

### **Demo Mode**
- **Apple Review Account**: `apple_review@goldlist.app`
- **Mock Data**: Pre-populated notebooks and progress
- **Special Logic**: Bypasses normal limitations for review process

---

## 🔧 Development Environment

### **Setup Requirements**
```bash
# Install dependencies
npm install

# Start development server
npm run start

# Run on specific platforms
npm run ios
npm run android
npm run web
```

### **Environment Variables**
- **Supabase URL & API Key**: Database connection
- **RevenueCat API Keys**: iOS/Android subscription keys
- **Expo Project ID**: For EAS builds

### **Development Tools**
- **Expo Go**: For testing on device
- **Flipper**: For debugging (React Native)
- **Supabase Dashboard**: Database management
- **RevenueCat Dashboard**: Subscription analytics

---

## 🧪 Testing Strategy

### **Demo Mode Testing**
- Use `apple_review@goldlist.app` for Apple Review
- Mock data automatically loaded for demo account
- Pro features unlocked for demonstration

### **Development Flags**
```typescript
const FORCE_PRO_IN_DEV = false  // Test Pro features locally
const IS_EXPO_GO = Constants.appOwnership === 'expo'  // Expo Go detection
```

### **Session Testing**
- Developer menu for instant logout
- Cache clearing functionality
- Session isolation between users

---

## 🚀 Deployment & Distribution

### **Build Configuration**
- **iOS Bundle ID**: `com.recepsienen.goldlist-method`
- **Android Package**: `com.recepsienen.goldlist_method`
- **App Name**: "Gold List"
- **Scheme**: `goldlist://` for deep linking

### **Store Preparation**
- **App Store Connect**: iOS distribution
- **Google Play Console**: Android distribution
- **RevenueCat**: Subscription products setup
- **Assets**: Icons, screenshots, store descriptions

---

## 📈 Analytics & Monitoring

### **User Engagement Tracking**
- Daily streak monitoring
- Word addition frequency
- Review completion rates
- Session duration analysis

### **Business Metrics**
- Free-to-Pro conversion rates
- Monthly recurring revenue (MRR)
- User retention rates
- Feature usage analytics

---

## 🔮 Future Roadmap

### **Planned Features**
1. **Social Features**: Friend streaks, leaderboards
2. **AI Integration**: Smart word suggestions, difficulty assessment
3. **Export Functionality**: PDF exports, backup options
4. **Advanced Analytics**: Learning curve analysis, weak point identification
5. **Tablet Optimization**: iPad-specific UI improvements

### **Technical Improvements**
1. **Offline Mode**: Full offline functionality
2. **Performance**: Further optimization for large datasets
3. **Accessibility**: Screen reader support, voice navigation
4. **Security**: Enhanced data encryption

---

## 🤝 Contributing Guidelines

### **Code Standards**
- **TypeScript**: Strict typing required
- **React Query**: For all server state management
- **AsyncStorage**: Never use react-native-mmkv (Expo Go incompatible)
- **FlatList**: For all potentially long lists
- **Expo Router**: File-based routing only

### **Development Workflow**
1. **Feature Branch**: Create from main
2. **Development**: Use TypeScript strictly
3. **Testing**: Test on both iOS and Android
4. **Review**: Code review before merge
5. **Deployment**: EAS build for distribution

---

*This documentation serves as the complete guide to understanding, developing, and maintaining the GoldList vocabulary learning application.*