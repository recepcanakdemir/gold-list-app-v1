import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Defs, Marker, Polygon } from 'react-native-svg';
import { Colors, Typography, Effects3D, Spacing, BorderRadius } from '../styles/theme';

interface GoldlistSchemaProps {
  size?: number;
}

export default function GoldlistSchema({ size = 280 }: GoldlistSchemaProps) {
  // Box animations
  const boxA = useRef(new Animated.Value(0)).current;
  const boxB = useRef(new Animated.Value(0)).current;
  const boxC = useRef(new Animated.Value(0)).current;
  const boxD = useRef(new Animated.Value(0)).current;

  // Arrow animations
  const arrowAB = useRef(new Animated.Value(0)).current;
  const arrowBC = useRef(new Animated.Value(0)).current;
  const arrowCD = useRef(new Animated.Value(0)).current;

  // Gold box pulse animation
  const goldPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const runAnimation = () => {
      // Reset all values
      [boxA, boxB, boxC, boxD, arrowAB, arrowBC, arrowCD].forEach(anim => anim.setValue(0));
      goldPulse.setValue(1);

      Animated.sequence([
        // 1. Fade In Box A
        Animated.timing(boxA, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        
        // 2. Draw Arrow A to B
        Animated.timing(arrowAB, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        
        // 3. Fade In Box B
        Animated.timing(boxB, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        
        // 4. Draw Arrow B to C
        Animated.timing(arrowBC, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        
        // 5. Fade In Box C
        Animated.timing(boxC, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        
        // 6. Draw Arrow C to D
        Animated.timing(arrowCD, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        
        // 7. Fade In Box D with pulse
        Animated.parallel([
          Animated.timing(boxD, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(goldPulse, {
                toValue: 1.1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(goldPulse, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
            { iterations: 2 }
          ),
        ]),
        
        // Wait before restarting
        Animated.delay(1200),
      ]).start(() => {
        // Restart animation
        setTimeout(runAnimation, 600);
      });
    };

    runAnimation();

    return () => {
      [boxA, boxB, boxC, boxD, arrowAB, arrowBC, arrowCD, goldPulse].forEach(anim => {
        anim.stopAnimation();
      });
    };
  }, [size]);

  const boxSize = size * 0.42;
  const spacing = size * 0.04;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Box A - Headlist (Top-Left) */}
      <Animated.View
        style={[
          styles.box,
          styles.boxA,
          {
            width: boxSize,
            height: boxSize,
            top: spacing,
            left: spacing,
            opacity: boxA,
            transform: [
              {
                scale: boxA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.boxTitle, { color: '#FFFFFF' }]}>Headlist</Text>
        <Text style={[styles.boxWords, { color: '#FFFFFF' }]}>20 Words</Text>
        <Text style={[styles.boxLabel, { color: '#FFCDD2' }]}>A</Text>
      </Animated.View>

      {/* Box B - 1st Distillation (Top-Right) */}
      <Animated.View
        style={[
          styles.box,
          styles.boxB,
          {
            width: boxSize,
            height: boxSize,
            top: spacing,
            right: spacing,
            opacity: boxB,
            transform: [
              {
                scale: boxB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.boxTitle, { color: '#FFFFFF' }]}>1st Distillation</Text>
        <Text style={[styles.boxWords, { color: '#FFFFFF' }]}>14 Words</Text>
        <Text style={[styles.boxLabel, { color: '#C8E6C9' }]}>B</Text>
      </Animated.View>

      {/* Box C - 2nd Distillation (Bottom-Right) */}
      <Animated.View
        style={[
          styles.box,
          styles.boxC,
          {
            width: boxSize,
            height: boxSize,
            bottom: spacing,
            right: spacing,
            opacity: boxC,
            transform: [
              {
                scale: boxC.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.boxTitle, { color: '#FFFFFF' }]}>2nd Distillation</Text>
        <Text style={[styles.boxWords, { color: '#FFFFFF' }]}>10 Words</Text>
        <Text style={[styles.boxLabel, { color: '#BBDEFB' }]}>C</Text>
      </Animated.View>

      {/* Box D - Gold (Bottom-Left) */}
      <Animated.View
        style={[
          styles.box,
          styles.boxD,
          {
            width: boxSize,
            height: boxSize,
            bottom: spacing,
            left: spacing,
            opacity: boxD,
            transform: [
              {
                scale: Animated.multiply(
                  boxD.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                  goldPulse
                ),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.boxTitle, { color: '#FFFFFF' }]}>Gold</Text>
        <Text style={[styles.boxWords, { color: '#FFFFFF' }]}>7 Words</Text>
        <Text style={[styles.boxLabel, { color: '#FFE0B2' }]}>D</Text>
        <Text style={styles.goldIcon}>🏆</Text>
      </Animated.View>

      {/* Arrows using SVG */}
      <View style={styles.svgContainer}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <Marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <Polygon
                points="0,0 10,3.5 0,7"
                fill="#9E9E9E"
              />
            </Marker>
          </Defs>
          
          {/* Arrow A to B */}
          <Animated.View style={{ opacity: arrowAB }}>
            <Path
              d={`M ${spacing + boxSize * 0.8} ${spacing + boxSize * 0.5} Q ${size * 0.5} ${spacing * 0.7} ${size - spacing - boxSize * 0.2} ${spacing + boxSize * 0.5}`}
              stroke="#9E9E9E"
              strokeWidth="3"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          </Animated.View>

          {/* Arrow B to C */}
          <Animated.View style={{ opacity: arrowBC }}>
            <Path
              d={`M ${size - spacing - boxSize * 0.5} ${spacing + boxSize * 0.8} Q ${size - spacing * 0.7} ${size * 0.5} ${size - spacing - boxSize * 0.5} ${size - spacing - boxSize * 0.2}`}
              stroke="#9E9E9E"
              strokeWidth="3"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          </Animated.View>

          {/* Arrow C to D */}
          <Animated.View style={{ opacity: arrowCD }}>
            <Path
              d={`M ${size - spacing - boxSize * 0.2} ${size - spacing - boxSize * 0.5} Q ${size * 0.5} ${size - spacing * 0.7} ${spacing + boxSize * 0.8} ${size - spacing - boxSize * 0.5}`}
              stroke="#9E9E9E"
              strokeWidth="3"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          </Animated.View>
        </Svg>
      </View>

      {/* Time Labels */}
      <View style={styles.timeLabels}>
        <Text style={styles.timeLabel}>2 weeks later...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  box: {
    ...Effects3D.card,
    position: 'absolute',
    borderRadius: BorderRadius.medium,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  boxA: {
    backgroundColor: '#FF5252',
    borderColor: '#D32F2F',
    borderBottomColor: '#B71C1C',
  },
  boxB: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
    borderBottomColor: '#2E7D32',
  },
  boxC: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
    borderBottomColor: '#1565C0',
  },
  boxD: {
    backgroundColor: '#FFA500',
    borderColor: '#F57C00',
    borderBottomColor: '#E65100',
  },
  boxTitle: {
    ...Typography.captionBold,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  boxWords: {
    ...Typography.titleMedium,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  boxLabel: {
    ...Typography.captionBold,
    fontSize: 18,
    fontWeight: '900',
    position: 'absolute',
    top: 4,
    left: 8,
  },
  goldIcon: {
    fontSize: 20,
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  timeLabels: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -8 }],
  },
  timeLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});