import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Effects3D, Spacing, BorderRadius } from '../styles/theme';

interface GoldlistMonthViewProps {
  size?: number;
}

export default function GoldlistMonthView({ size = 280 }: GoldlistMonthViewProps) {
  const renderDay = (day: number) => {
    const isValidDay = day >= 1 && day <= 30;
    
    if (!isValidDay) {
      return <View key={day} style={styles.emptyDay} />;
    }

    // Determine activities for each day
    const hasAddWords = day >= 1; // Always adding words
    const hasFirstReview = day >= 15; // First review starts day 15
    const hasSecondReview = day >= 29; // Second review starts day 29

    return (
      <View key={day} style={[styles.dayBox, isValidDay && styles.activeDayBox]}>
        <Text style={styles.dayNumber}>{day}</Text>
        <View style={styles.activityContainer}>
          {hasAddWords && <Text style={styles.activityDot}>🟠</Text>}
          {hasFirstReview && <Text style={styles.activityDot}>🔴</Text>}
          {hasSecondReview && <Text style={styles.activityDot}>⭐️</Text>}
        </View>
      </View>
    );
  };

  const renderWeek = (startDay: number, weekIndex: number) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = startDay + i;
      days.push(renderDay(day));
    }

    return (
      <View key={weekIndex} style={styles.weekRow}>
        {days}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: size }]}>
      {/* Month Grid */}
      <View style={styles.calendarGrid}>
        {/* Week Headers */}
        <View style={styles.weekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, index) => (
            <View key={index} style={styles.headerDay}>
              <Text style={styles.headerText}>{letter}</Text>
            </View>
          ))}
        </View>
        
        {/* Week 1: Days 1-7 */}
        {renderWeek(1, 1)}
        
        {/* Week 2: Days 8-14 */}
        {renderWeek(8, 2)}
        
        {/* Week 3: Days 15-21 */}
        {renderWeek(15, 3)}
        
        {/* Week 4: Days 22-28 */}
        {renderWeek(22, 4)}
        
        {/* Week 5: Days 29-30 (+ empty days) */}
        {renderWeek(29, 5)}
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Your Daily Activities:</Text>
        
        <View style={styles.legendItem}>
          <Text style={styles.legendDot}>🟠</Text>
          <Text style={styles.legendText}>Add New Words</Text>
        </View>
        
        <View style={styles.legendItem}>
          <Text style={styles.legendDot}>🔴</Text>
          <Text style={styles.legendText}>Distill (1st Review)</Text>
        </View>
        
        <View style={styles.legendItem}>
          <Text style={styles.legendDot}>⭐️</Text>
          <Text style={styles.legendText}>Distill Again (2nd Review)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  calendarGrid: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  headerDay: {
    width: 40,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    fontSize: 10,
  },
  dayBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.small,
    backgroundColor: Colors.inactive,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeDayBox: {
    ...Effects3D.card,
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderBottomColor: Colors.borderDark,
    borderBottomWidth: 2,
  },
  emptyDay: {
    width: 40,
    height: 40,
  },
  dayNumber: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textPrimary,
    fontWeight: '600',
    position: 'absolute',
    top: 3,
    left: 5,
  },
  activityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  activityDot: {
    fontSize: 8,
    marginHorizontal: 0.5,
  },
  legendContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '90%',
  },
  legendTitle: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontSize: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    width: '100%',
  },
  legendDot: {
    fontSize: 12,
    marginRight: Spacing.sm,
    width: 16,
    textAlign: 'center',
  },
  legendText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
});