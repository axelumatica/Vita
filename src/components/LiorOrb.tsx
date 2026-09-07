// src/components/LiorOrb.tsx
//
// Animated orb for Lior's presence. Uses Reanimated 3 for 60fps morphing animations.
// States: idle, listening, thinking, speaking, overload, softLanding.
//
// Animation design from vita-wireframe.html and preview.html:
//   - Idle: breathing 3.2s cycle (0.2Hz) with scale 1.045
//   - Listening: expand to 1.15x, contour reacts to mic
//   - Thinking: faster morph 1.6s cycle
//   - Speaking: rhythmic pulsation synced to TTS
//   - Overload: slowest breathing, deep glow
//   - SoftLanding: slowest pulse, minimal movement
//
// Gradient colors from src/design/tokens.ts:
//   Dark (Night Vault): cream highlight → warm cream → soft gold edge
//   Light (Day Canvas): inverted using Deep Midnight Blue accent

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Svg,
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../design/ThemeProvider';
import { Fonts } from '../design/tokens';
import { useVitaStore } from '../store/vita-store';

type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'overload'
  | 'softLanding'
  | 'emergency';

interface LiorOrbProps {
  state: OrbState;
  caption?: string;
  size?: number; // diameter in pixels
}

export function LiorOrb({ state, caption, size = 155 }: LiorOrbProps) {
  const { colors, mode } = useTheme();
  const lowStimulus = useVitaStore((s) => s.lowStimulus);

  // Theme-aware gradient stops for the orb.
  // Dark (Night Vault): cream highlight → warm cream → soft gold edge
  // Light (Day Canvas): inverted using Deep Midnight Blue accent
  const orbGradStops =
    mode === 'dark'
      ? [
          { offset: '0%', stopColor: '#fffef9' },
          { offset: '45%', stopColor: colors.accent },
          { offset: '100%', stopColor: '#b9a97a' },
        ]
      : [
          { offset: '0%', stopColor: colors.accent },
          { offset: '45%', stopColor: colors.accentInk },
          { offset: '100%', stopColor: '#d6cebe' },
        ];

  // Shared values for animation
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.25);

  React.useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(glowOpacity);

    // Reduced motion: freeze everything
    if (lowStimulus) {
      scale.value = 1;
      glowOpacity.value = 0.15;
      return;
    }

    const config: Record<OrbState, { duration: number; targetScale: number; targetGlow: number }> = {
      idle: { duration: 3200, targetScale: 1.045, targetGlow: 0.25 },
      listening: { duration: 2400, targetScale: 1.15, targetGlow: 0.35 },
      thinking: { duration: 1600, targetScale: 1.05, targetGlow: 0.30 },
      speaking: { duration: 800, targetScale: 1.03, targetGlow: 0.28 },
      overload: { duration: 9000, targetScale: 1.01, targetGlow: 0.40 },
      softLanding: { duration: 12000, targetScale: 1.005, targetGlow: 0.20 },
      emergency: { duration: 6000, targetScale: 1.005, targetGlow: 0.45 },
    };

    const c = config[state] ?? config.idle;

    scale.value = withRepeat(
      withSequence(
        withTiming(c.targetScale, { duration: c.duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: c.duration / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(c.targetGlow, { duration: c.duration / 2 }),
        withTiming(0.15, { duration: c.duration / 2 }),
      ),
      -1,
      false,
    );
  }, [state, lowStimulus]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.orbWrap, { width: size * 1.6, height: size * 1.6 }]}>
        {/* Outer glow — soft halo, behind the orb */}
        <Animated.View
          style={[
            styles.glow,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
              backgroundColor: colors.accent,
              top: (size * 1.6 - size * 1.5) / 2,
              left: (size * 1.6 - size * 1.5) / 2,
            },
            glowStyle,
          ]}
        />

        <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="orbGrad" cx="32%" cy="28%" r="60%">
                {orbGradStops.map((stop) => (
                  <Stop
                    key={stop.offset}
                    offset={stop.offset}
                    stopColor={stop.stopColor}
                  />
                ))}
              </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbGrad)" />
          </Svg>
        </Animated.View>
      </View>

      {/* Caption */}
      {caption && (
        <View style={styles.caption}>
          <Text style={[styles.captionText, { color: colors.textDim }]}>
            {caption}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orb: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  caption: {
    marginTop: 12,
    alignItems: 'center',
  },
  captionText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    letterSpacing: 0.4,
  },
});
