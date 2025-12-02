# Goldlist Vocabulary App - Teknik Dokümantasyon

## 🎯 Proje Genel Bakış

### Goldlist Method Nedir?
Goldlist Method, dil öğrenmede kullanılan özel bir kelime öğrenme tekniğidir. Temel prensibi:
- **14 günlük aralıklarla tekrar** sistemi
- **Bronze → Silver → Gold** aşamalı ilerleyiş
- **Doğal unutma** sürecini kullanarak kalıcı öğrenme
- **Sayfa tabanlı** organizasyon (her sayfa = 1 gün)

### Uygulama Amacı
Modern, performanslı ve kullanıcı dostu bir kelime öğrenme uygulaması geliştirmek. **"Zero-latency"** kullanıcı deneyimi ile native app hissi vermek.

### Temel Özellikler
- ✅ **Defter yönetimi** (oluşturma, düzenleme, silme)
- ✅ **Kelime ekleme sistemi** (optimistic updates ile)
- ✅ **İlerleme takip sistemi** (roadmap görünümü)
- ✅ **Zaman simülasyonu** (geliştirme ve test için)
- ✅ **Veri kaybı önleme** (smart summary pattern)
- ✅ **Kullanıcı yetkilendirmesi** (Supabase Auth)

---

## 🏗️ Teknik Mimari

### Frontend Stack
- **React Native** - Cross-platform mobile development
- **Expo Router** - File-based navigation system  
- **TypeScript** - Type safety ve developer experience
- **StyleSheet** - React Native'in built-in styling sistemi

### Backend & Database
- **Supabase** - PostgreSQL database + authentication + real-time
- **Row Level Security (RLS)** - Kullanıcı bazında veri güvenliği
- **Cascade Delete** - İlişkili verilerin otomatik silinmesi

### State Management
- **TanStack React Query** - Server state management
- **AsyncStorage** - Local persistence (Expo Go uyumlu)
- **Query Persist Client** - Offline data caching

### Navigasyon Sistemi
```
app/
├── (auth)/login.tsx          # Giriş ekranı
├── (tabs)/
│   ├── index.tsx            # Ana sayfa (defter listesi)
│   ├── dashboard.tsx        # Dashboard (gelecek özellikler)
│   └── settings.tsx         # Ayarlar
├── notebook/[id].tsx        # Defter detay (roadmap)
├── notebook/[id]/add.tsx    # Kelime ekleme + summary
└── _layout.tsx              # Ana layout (Stack navigation)
```

---

## 🗄️ Veritabanı Şeması

### 1. profiles tablosu
```sql
- id (UUID, PK) → auth.users referansı
- subscription_status (text) → 'active', 'inactive', 'trial', 'expired'
- has_ever_subscribed (boolean) → Gelecekteki premium özellikler için
- target_lang (text) → Öğrenilen dil
- daily_word_goal (integer) → Günlük kelime hedefi
- current_streak (integer) → Mevcut devam serileri
- last_activity_date (date) → Son aktivite tarihi
- created_at (timestamp)
```

### 2. notebooks tablosu  
```sql
- id (UUID, PK)
- user_id (UUID, FK) → profiles.id
- name (text) → Defter adı
- words_per_page_limit (integer) → Sayfa başı kelime limiti (10,15,20,25)
- is_active (boolean) → Soft delete için (artık hard delete)
- created_at (timestamp)
```

### 3. pages tablosu (Lazy Creation)
```sql
- id (UUID, PK) 
- notebook_id (UUID, FK) → notebooks.id ON DELETE CASCADE
- page_number (integer) → Sayfa numarası (1, 2, 3...)
- target_date (date) → Bu sayfa için hedef tarih
- title (text, nullable) → Opsiyonel sayfa başlığı
- created_at (timestamp)
- UNIQUE(notebook_id, page_number) → Aynı defterde sayfa duplicatını önler
```

### 4. words tablosu (Core Engine)
```sql
- id (UUID, PK)
- page_id (UUID, FK) → pages.id ON DELETE CASCADE
- term (text) → Öğrenilecek kelime/terim
- definition (text) → Tanım
- type (text, nullable) → 'noun', 'verb', 'adjective', 'adverb', 'other'
- example_sentence (text, nullable) → Örnek cümle
- example_translation (text, nullable) → Gelecek özellik
- next_review_date (date) → Sonraki tekrar tarihi
- stage (text) → 'bronze', 'silver', 'gold'
- round (integer) → 1-4 arası round sayısı
- status (text) → 'waiting', 'ready', 'learned', 'leech'
- created_at (timestamp)
```

### 5. daily_activity_log tablosu
```sql
- user_id (UUID, FK) → profiles.id
- date (date)
- PRIMARY KEY (user_id, date) → Günlük benzersiz aktivite kaydı
```

---

## ⚡ Özel Mimari Çözümler

### 1. Strictly Lazy Architecture
**Problem**: Database'de boş sayfalar birikmesinin önlenmesi.

**Çözüm**: 
```typescript
// Sayfa sadece ilk kelime eklendiğinde oluşturulur
if (!existingPage) {
  const { data: newPage } = await supabase.from('pages').insert({
    notebook_id, page_number, target_date, title: `Lesson ${page_number}`
  })
}
```

**Faydaları**:
- ✅ Database'de gereksiz empty record'lar yok
- ✅ Performance optimizasyonu
- ✅ Clean data structure

### 2. Ghost Page Logic  
**Problem**: UI'da eksik günlerin gösterilmesi.

**Çözüm**:
```typescript
// Client-side hesaplama ile eksik günler oluşturulur
const daysPassed = daysBetween(new Date(notebook.created_at), currentTime);
const ghostPages = Array.from({length: Math.min(daysPassed + 1, 200)}, (_, i) => ({
  pageNumber: i + 1,
  isGhost: !existingPageNumbers.includes(i + 1),
  // ... diğer hesaplamalar
}));
```

**Faydaları**:
- ✅ Real-time responsiveness
- ✅ Database'e gereksiz kayıt oluşturulmaz
- ✅ Dinamik hesaplama

### 3. Developer Time System
**Problem**: Geliştirme sırasında 14 günlük aralıkları test etmek.

**Çözüm**:
```typescript
// TimeProvider ile simülasyon
const [timeOffset, setTimeOffset] = useState(0);
const currentTime = new Date(Date.now() + timeOffset);

const addDay = () => {
  const newOffset = timeOffset + (24 * 60 * 60 * 1000);
  saveTimeOffset(newOffset);
}
```

**Kullanım**:
- "+1 Day" butonu ile zamanı ilerletme
- `next_review_date` hesaplama developer time kullanıyor
- Production'da gerçek zaman, development'ta simülasyon

### 4. Smart Summary Pattern
**Problem**: Hızlı navigasyonda React Query mutation'ların cancel olması → veri kaybı.

**Çözüm**:
```typescript
// Single-file view switching
const [viewMode, setViewMode] = useState<'input' | 'summary'>('input');
const [sessionWords, setSessionWords] = useState<WordData[]>([]);

// Safety lock
const isMutating = useIsMutating();
// Navigate away sadece isMutating === 0 olduğunda
```

**Faydaları**:
- ✅ Component unmount edilmez → mutation queue korunur
- ✅ Kullanıcı eklenen kelimeleri görür
- ✅ %100 veri güvenliği

### 5. Snapshot Logic (Progress Tracking)
**Problem**: Progress bar double-counting (1→3 jump).

**Çözüm**:
```typescript
// Initial DB count freeze edilir
const [initialDbCount, setInitialDbCount] = useState<number | null>(null);
const hasSnapshotTaken = useRef(false);

// Calculation: (frozen initial count) + (session words)
const currentTotal = (initialDbCount || 0) + sessionWords.length;
```

**Faydaları**:
- ✅ Doğru progress tracking
- ✅ Session boyunca tutarlılık
- ✅ Background mutation'lar progress'i etkilemez

---

## 💻 Temel Özellikler ve Implementation

### 1. Authentication System
```typescript
// Supabase Auth integration
const { data: { session } } = await supabase.auth.getSession();
// RLS policies kullanıcı bazında data filtering sağlar
```

### 2. Notebook Management
- **Create**: Word limit seçimi (10,15,20,25) ile
- **Update**: İsim değişikliği
- **Delete**: Hard delete (CASCADE ile tüm ilişkili veriler silinir)

### 3. Word Addition Flow
```
1. Input Mode: Term + Definition + Type + Example
2. Next Button: sessionWords'e ekleme + background save
3. Done Button: Summary Mode'a geçiş
4. Summary Mode: Eklenen kelimeler + Safety Lock
5. Close Button: Tüm save'ler complete olduktan sonra aktif
```

### 4. Roadmap System
- **200 node limit** (Goldlist Method standardı)
- **Zigzag pattern** (geliştirilme aşamasında)
- **Color coding**: 
  - 🔴 Kırmızı: Bugünkün dersi (kelime yok)
  - 🟡 Sarı: Kısmi dolu (kelime var ama limit altında)
  - 🟢 Yeşil: Tamamlanmış (word limit'e ulaşılmış)
  - ⚪ Gri: Gelecek dersler / kaçırılan günler

### 5. Progress Tracking
- Real-time word count
- Session-based progress bar
- Streak tracking (gelecek özellik)

---

## 🚀 Performance Optimizasyonları

### 1. Query Optimizations
```typescript
// Efficient word count tracking
export function useWordsCountByPage(notebookId: string) {
  return useQuery({
    queryKey: ['wordsCount', notebookId],
    queryFn: async () => {
      // Sadece word ID'leri ve page number'ları çekiliyor
      const { data } = await supabase.from('words').select(`
        id, pages!inner(page_number, notebook_id)
      `).eq('pages.notebook_id', notebookId);
      
      // Client-side aggregation
      return data.reduce((acc, word) => {
        const pageNumber = word.pages.page_number;
        acc[pageNumber] = (acc[pageNumber] || 0) + 1;
        return acc;
      }, {});
    }
  })
}
```

### 2. Optimistic Updates
```typescript
// Immediate UI update, background database save
setSessionWords(prev => [...prev, currentWord]); // Instant
createWordOptimistic.mutate(wordData); // Background
```

### 3. Efficient Rendering
- `FlatList` kullanımı (büyük listeler için)
- `useMemo` ile expensive calculations
- Minimal re-render optimizasyonları

---

## ⚠️ Teknik Kısıtlamalar ve Limitler

### 1. Expo Go Constraints
- ❌ `react-native-mmkv` desteklenmiyor → AsyncStorage kullanıldı
- ❌ Native modules limitleri
- ✅ OTA updates desteği

### 2. Database Limits
- **200 page limit** per notebook (Goldlist Method standardı)
- **Page başına word limit**: Kullanıcı ayarlayabiliyor (10-25)
- **RLS performance**: Büyük veri setlerinde dikkat gerekli

### 3. Performance Considerations
```typescript
// Ghost page hesaplaması - 200 node'a optimize edilmiş
const maxPages = Math.min(daysPassed + 1, 200);
```

### 4. Offline Capabilities
- React Query cache ile temel offline support
- AsyncStorage persistence
- ❌ Full offline CRUD henüz yok (gelecek özellik)

---

## 🐛 Çözülen Önemli Bug'lar

### 1. Double Header Issue
**Problem**: Tab navigator + Stack navigator çift header oluşturuyordu.
**Çözüm**: `headerShown: false` + custom header'lar.

### 2. Navigation Stacking
**Problem**: Screen'ler infinitely stack oluyordu.
**Çözüm**: `router.push('/')` → `router.back()` değişikliği.

### 3. Progress Bar Jump (Word 1→3)
**Problem**: İlk kelime eklenirken progress 1→3 atlıyordu.
**Çözüm**: Snapshot logic + useRef lock ile initial count freeze.

### 4. Data Loss Bug
**Problem**: Hızlı navigation ile mutation'lar cancel oluyordu.
**Çözüm**: Smart Summary Pattern ile component unmount önleme.

### 5. Time Inconsistency
**Problem**: `next_review_date` gerçek tarih kullanıyordu, developer time değil.
**Çözüm**: `currentTime` parameter ekleme ve `addDays` helper kullanımı.

---

## 📁 Dosya Yapısı ve Sorumluluklar

### `/app` - UI Components
```
(auth)/login.tsx      → Authentication screen
(tabs)/index.tsx      → Notebook list + creation
notebook/[id].tsx     → Roadmap + navigation
notebook/[id]/add.tsx → Word input + summary
```

### `/lib` - Core Logic
```
supabase.ts          → Database client configuration  
query-client.tsx     → TanStack Query setup + persistence
time-provider.tsx    → Developer time simulation system
database-hooks.ts    → Custom hooks + mutations
```

### Database Files
```
01_initial_schema.sql → PostgreSQL schema + RLS policies
```

---

## 🎯 Gelecek Özellikler (Roadmap)

### Phase 2
- [ ] Review system implementation
- [ ] Spaced repetition algorithm
- [ ] Word statistics ve analytics
- [ ] Dark mode
- [ ] Import/Export functionality

### Phase 3  
- [ ] RevenueCat integration (premium features)
- [ ] Apple Sign In
- [ ] Advanced notifications
- [ ] Sync across devices
- [ ] Voice recording (pronunciation)

### Phase 4
- [ ] Web version
- [ ] Collaborative notebooks
- [ ] Advanced language support
- [ ] AI-powered suggestions

---

## 📖 Goldlist Method Implementation Status

### ✅ Implemented
- Day-by-day progression (1 page = 1 day)
- Word limit per page (customizable)
- 14-day review interval setup
- Bronze stage initialization
- Target date calculation

### 🚧 In Progress  
- Stage progression (Bronze → Silver → Gold)
- Review algorithm
- Status tracking (waiting/ready/learned/leech)

### 📋 Planned
- Round management (1-4)
- Intelligent review scheduling
- Learning analytics
- Success rate tracking

---

## 🔧 Development Commands

```bash
# Geliştirme sunucusu
npm start

# Platform specific
npm run ios
npm run android
npm run web

# Database migration
# Supabase dashboard'tan 01_initial_schema.sql çalıştırın
```

---

**Son güncellenme**: Aralık 2024  
**Versiyon**: 1.0.0  
**Geliştirici**: React Native + Supabase Stack  
**Durum**: Core features tamamlandı, review system development aşamasında