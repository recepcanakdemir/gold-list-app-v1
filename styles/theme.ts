// Goldlist App - Shared Theme Constants
// Gamified 3D Design System

export const Colors = {
  // Primary Palette
  primary: '#FFA500',        // Orange
  primaryDark: '#D97706',    // Dark Orange (shadows)
  
  // Medal Colors
  gold: '#FFD700',
  goldDark: '#E6C200',
  silver: '#C0C0C0',
  silverDark: '#A0A0A0',
  bronze: '#CD7F32',
  bronzeDark: '#A05A2C',
  
  // Text Colors
  textPrimary: '#4B4B4B',    // Headers
  textSecondary: '#AFAFAF',  // Subtitles
  textBody: '#333',          // Body text
  textMuted: '#666',
  textLight: '#999',
  
  // Background Colors
  background: '#F7F7F7',
  white: '#FFFFFF',
  
  // Border Colors
  border: '#E5E5E5',
  borderDark: '#D1D5DB',
  
  // Status Colors
  success: '#4CAF50',
  successDark: '#388E3C',
  error: '#FF4444',
  errorDark: '#CC0000',
  warning: '#FFC107',
  info: '#2196F3',
  
  // Inactive/Loading
  inactive: '#F0F0F0',
  loading: '#CCC',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  xxlarge: 24,
  round: 50, // For circular elements
};

export const Typography = {
  // Headers
  headerLarge: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#4B4B4B', // Matches index page exactly
    letterSpacing: -0.5,
  },
  headerMedium: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSmall: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
  },
  
  // Titles
  titleLarge: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  
  // Subtitles
  subtitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  subtitleSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  
  // Body Text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.textBody,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textBody,
  },
  
  // Button Text
  buttonLarge: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.white,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  buttonMedium: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.white,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  
  // Small Text
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  captionBold: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  
  // Streak text (matches index page)
  streakText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4B4B4B',
  },
};

// 3D Effect Mixins
export const Effects3D = {
  // Card with 3D effect
  card: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
    borderBottomColor: Colors.borderDark,
  },
  
  // Button with 3D effect
  button: {
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  
  // Primary button (orange theme)
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomColor: Colors.primaryDark,
  },
  
  // Success button (green theme)
  buttonSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
    borderBottomColor: Colors.successDark,
  },
  
  // Error/Danger button (red theme)
  buttonDanger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    borderBottomColor: Colors.errorDark,
  },
  
  // Small badge with 3D effect
  badge: {
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  
  // Input field with subtle 3D effect
  input: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 3,
    borderBottomColor: Colors.borderDark,
  },
  
  // Container with 3D effect
  container: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: Colors.borderDark,
  },
  
  // Streak container (matches index page exactly)
  streakContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
};

// Common Styles
export const CommonStyles = {
  // Page container
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Header style (matches index page exactly)
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  
  // Content container
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  
  // Section spacing
  section: {
    marginBottom: Spacing.xxl,
  },
  
  // Card wrapper (for 3D shadow space)
  cardWrapper: {
    marginBottom: Spacing.sm,
  },
};

// Button Styles
export const ButtonStyles = {
  // Large primary button
  primaryLarge: {
    ...Effects3D.button,
    ...Effects3D.buttonPrimary,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    alignItems: 'center' as const,
  },
  
  // Medium primary button
  primaryMedium: {
    ...Effects3D.button,
    ...Effects3D.buttonPrimary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center' as const,
  },
  
  // Small primary button
  primarySmall: {
    ...Effects3D.button,
    ...Effects3D.buttonPrimary,
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center' as const,
  },
};