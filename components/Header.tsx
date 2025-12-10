import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Effects3D, CommonStyles } from '../styles/theme';

interface HeaderProps {
  title: string;
  showStreak?: boolean;
  streakValue?: number;
  streakStatus?: 'completed' | 'pending' | 'broken';
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  noPadding?: boolean; // For pages that already use SafeAreaView
  titleSize?: 'large' | 'medium' | 'small'; // Custom title size
}

export function Header({ 
  title, 
  showStreak = false, 
  streakValue = 0, 
  streakStatus = 'completed',
  rightElement, 
  leftElement,
  noPadding = false,
  titleSize = 'large'
}: HeaderProps) {
  const getStreakEmoji = () => {
    return streakStatus === 'broken' ? '💔' : '🔥';
  };

  const getStreakTextStyle = () => {
    const baseStyle = [styles.streakText];
    if (streakStatus === 'pending') {
      baseStyle.push(styles.pendingStreakText);
    } else if (streakStatus === 'broken') {
      baseStyle.push(styles.brokenStreakText);
    }
    return baseStyle;
  };

  const getTitleStyle = () => {
    switch (titleSize) {
      case 'medium':
        return Typography.headerMedium;
      case 'small':
        return Typography.headerSmall;
      default:
        return Typography.headerLarge;
    }
  };

  return (
    <View style={[styles.header, noPadding && styles.headerNoPadding]}>
      {leftElement && (
        <View style={styles.leftElement}>
          {leftElement}
        </View>
      )}
      
      <View style={styles.titleContainer}>
        <Text style={getTitleStyle()}>{title}</Text>
      </View>

      <View style={styles.rightElement}>
        {showStreak ? (
          <View style={styles.streakContainer}>
            <Text style={getStreakTextStyle()}>
              {getStreakEmoji()} {streakValue}
            </Text>
          </View>
        ) : (
          rightElement && rightElement
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    ...CommonStyles.header,
  },
  headerNoPadding: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  leftElement: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...Typography.headerLarge,
  },
  rightElement: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  streakContainer: {
    ...Effects3D.streakContainer,
  },
  streakText: {
    ...Typography.streakText,
  },
  brokenStreakText: { 
    color: Colors.textLight, 
    opacity: 0.7 
  },
  pendingStreakText: { 
    color: Colors.textLight, 
    opacity: 0.6 
  },
});