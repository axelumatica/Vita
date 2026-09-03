/**
 * src/components/EmergencyOverlay.tsx
 *
 * Emergency mode overlay that simplifies the UI for high-stress situations.
 * Reduces visual clutter, provides one-tap core actions, and offers soft haptic feedback.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useVitaStore } from '../store/vita-store';
import { Icon } from '../design/Icon';

interface EmergencyOverlayProps {
  visible: boolean;
}

/** Wrap StyleSheet.create so styles re-read colors when theme changes. */
function useThemedStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(11, 19, 43, 0.95)', // Dark overlay with slight transparency
    },
    content: {
      padding: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      width: 280,
      alignItems: 'center',
    },
    orbContainer: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.surface2,
      borderRadius: 50,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 12,
      textAlign: 'center',
    },
    hint: {
      color: colors.textDim,
      fontSize: 14,
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 20,
    },
    actions: {
      width: '100%',
      gap: 12,
      marginBottom: 20,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
    },
    actionText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    exitBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
    },
    exitText: {
      color: colors.textFaint,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export function EmergencyOverlay({ visible }: EmergencyOverlayProps) {
  if (!visible) return null;

  const s = useThemedStyles();
  const { colors } = useTheme();
  const setEmergencyMode = useVitaStore((s) => s.setEmergencyMode);
  const recordWin = useVitaStore((s) => s.recordWin);

  const handleMicroAction = (action: string) => {
    // Record the micro-action as a win
    recordWin('step', action);
    // Exit emergency mode after completing action
    setEmergencyMode(false);
  };

  return (
    <View style={s.container}>
      <View style={s.content}>
        <View style={s.orbContainer}>
          <Icon name="Wind" size={48} color={colors.accent} />
        </View>

        <Text style={s.title}>Modalità Emergenza</Text>
        <Text style={s.hint}>
          Scegli una sola micro-azione per i prossimi 2 minuti:
        </Text>

        <View style={s.actions}>
          <TouchableOpacity
            accessibilityLabel="Bevi un bicchiere d'acqua"
            accessibilityRole="button"
            style={s.actionBtn}
            onPress={() => handleMicroAction('Bevi acqua')}
          >
            <Icon name="Droplet" size={20} color={colors.text} />
            <Text style={s.actionText}>Acqua</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Apri una finestra per aria fresca"
            accessibilityRole="button"
            style={s.actionBtn}
            onPress={() => handleMicroAction('Aria fresca')}
          >
            <Icon name="Wind" size={20} color={colors.text} />
            <Text style={s.actionText}>Aria</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Sdraiati e respira profondamente"
            accessibilityRole="button"
            style={s.actionBtn}
            onPress={() => handleMicroAction('Respira profondamente')}
          >
            <Icon name="Hand" size={20} color={colors.text} />
            <Text style={s.actionText}>Respira</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Contatta qualcuno di fiducia"
            accessibilityRole="button"
            style={s.actionBtn}
            onPress={() => handleMicroAction('Chiama qualcuno')}
          >
            <Icon name="Phone" size={20} color={colors.text} />
            <Text style={s.actionText}>Chiama</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityLabel="Esci dalla modalità emergenza"
          accessibilityRole="button"
          style={s.exitBtn}
          onPress={() => setEmergencyMode(false)}
        >
          <Text style={s.exitText}>Esci</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}