/**
 * src/components/VoiceVisualizer.tsx
 *
 * Simple audio waveform visualizer for voice recording feedback.
 * Shows animated bars that react to microphone input volume.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useVitaStore } from '../store/vita-store';

interface VoiceVisualizerProps {
  /** Current volume level (0-1) from speech recognition */
  volume: number;
  /** Whether we're currently recording/listening */
  isListening: boolean;
}

const BAR_COUNT = 5;

export function VoiceVisualizer({ volume, isListening }: VoiceVisualizerProps) {
  const { colors } = useTheme();
  const lowStimulus = useVitaStore((s) => s.lowStimulus);
  const [barHeights, setBarHeights] = useState<number[]>(Array(BAR_COUNT).fill(0.2));
  const [barColors, setBarColors] = useState<string[]>(
    Array(BAR_COUNT).fill(colors.textFaint),
  );

  useEffect(() => {
    if (!isListening) {
      setBarHeights(Array(BAR_COUNT).fill(0.2));
      setBarColors(Array(BAR_COUNT).fill(colors.textFaint));
      return;
    }

    const newHeights: number[] = [];
    const newColors: string[] = [];

    for (let i = 0; i < BAR_COUNT; i++) {
      const phase = (i * Math.PI) / BAR_COUNT;
      const wave = Math.abs(Math.sin(volume * 10 + phase));
      const height = 0.2 + wave * 0.6;
      const intensity = 0.3 + wave * 0.7;

      newHeights.push(height);
      if (lowStimulus) {
        newColors.push(colors.textFaint);
      } else {
        const hex = Math.round(intensity * 255)
          .toString(16)
          .padStart(2, '0');
        newColors.push(colors.accent + hex);
      }
    }

    setBarHeights(newHeights);
    setBarColors(newColors);
  }, [volume, isListening, colors, lowStimulus]);

  return (
    <View style={styles.container}>
      {barHeights.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: `${height * 100}%`,
              backgroundColor: barColors[index],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 40,
    marginVertical: 8,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
});