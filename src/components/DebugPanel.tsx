/**
 * src/components/DebugPanel.tsx
 *
 * Development/debug panel for Vita. Shows store state, performance metrics,
 * and system information. Only visible when debug flag is enabled.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useVitaStore } from '../store/vita-store';
import { Icon } from '../design/Icon';

interface DebugPanelProps {
  /** Whether the debug panel is currently visible */
  visible: boolean;
  /** Callback to toggle visibility */
  onToggle: () => void;
}

/** Wrap StyleSheet.create so styles re-read colors when theme changes. */
function useThemedStyles() {
  const { colors } = useTheme();
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      padding: 20,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      padding: 8,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '600',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    resetText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '500',
    },
    section: {
      marginVertical: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    stateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.surface,
    },
    stateLabel: {
      color: colors.textDim,
      fontSize: 14,
      flex: 1,
    },
    stateValue: {
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
      textAlign: 'right',
      flex: 2,
    },
    perfRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    perfLabel: {
      color: colors.textFaint,
      fontSize: 13,
    },
    perfValue: {
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    infoLabel: {
      color: colors.textFaint,
      fontSize: 13,
    },
    infoValue: {
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
    },
  });
}

export function DebugPanel({ visible, onToggle }: DebugPanelProps) {
  if (!visible) return null;

  const s = useThemedStyles();
  const store = useVitaStore();

  // Get store state (excluding functions)
  const state = {
    themeMode: store.themeMode,
    lowStimulus: store.lowStimulus,
    emergencyMode: store.emergencyMode,
    openRouterApiKey: store.openRouterApiKey ? '[SET]' : '[NOT SET]',
    modelSelection: store.modelSelection,
    vaultEntriesCount: store.vaultEntries.length,
    taskStepsCount: store.taskSteps.length,
    focusTaskId: store.focusTaskId,
    winsThisWeek: store.winsThisWeek(),
    personaMode: store.personaMode,
    voiceGender: store.voiceGender,
    voiceProfileId: store.voiceProfileId,
    wasOnboarded: store.wasOnboarded,
    customPersonaUnlocked: store.customPersonaUnlocked,
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          accessibilityLabel="Chiudi pannello di debug"
          accessibilityRole="button"
          onPress={onToggle}
          style={s.closeBtn}
        >
          <Icon name="X" size={20} color="#7c8299" />
        </TouchableOpacity>
        <Text style={s.title}>Pannello di Debug</Text>
        <TouchableOpacity
          accessibilityLabel="Ripristina impostazioni predefinite"
          accessibilityRole="button"
          onPress={() => store.resetAll()}
          style={s.resetBtn}
        >
          <Icon name="RotateCcw" size={18} color="#F7F4EA" />
          <Text style={s.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Store state */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Stato dello Store</Text>
        {Object.entries(state).map(([key, value]) => (
          <View key={key} style={s.stateRow}>
            <Text style={s.stateLabel}>{key}</Text>
            <Text style={s.stateValue}>
              {typeof value === 'object'
                ? JSON.stringify(value, null, 2).slice(0, 100) + '...'
                : String(value)}
            </Text>
          </View>
        ))}
      </View>

      {/* Performance */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Performance</Text>
        <View style={s.perfRow}>
          <Text style={s.perfLabel}>Ultimo aggiornamento:</Text>
          <Text style={s.perfValue}>
            {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </View>

      {/* System info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Info di Sistema</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Versione:</Text>
          <Text style={s.infoValue}>0.1.0</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Piattaforma:</Text>
          <Text style={s.infoValue}>React Native</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Timestamp:</Text>
          <Text style={s.infoValue}>{Date.now()}</Text>
        </View>
      </View>
    </View>
  );
}