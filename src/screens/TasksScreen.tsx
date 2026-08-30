/**
 * src/screens/TasksScreen.tsx
 *
 * Tasks funnel — placeholder build. Shows the focus task + accordion list.
 * Real breakdown engine + persistence comes when full state is restored.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useVitaStore } from '../store/vita-store';

export function TasksScreen() {
  const scratchpad = useVitaStore((s) => s.scratchpad);
  const [showBacklog, setShowBacklog] = useState(false);

  // For now, treat any scratchpad entry containing an action verb as a candidate task.
  // Real version will use the store's taskSteps[] + vaultEntries[] typed TASK.
  const candidateTasks = scratchpad.slice().reverse();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.focusCard}>
        <Text style={styles.eyebrow}>🎯 FOCUS UNICO</Text>
        {candidateTasks[0] ? (
          <Text style={styles.focusText}>{candidateTasks[0].text}</Text>
        ) : (
          <Text style={styles.empty}>Nessun task. Parla con Lior o scrivi nel Diario.</Text>
        )}
        {candidateTasks[0] && (
          <View style={styles.focusActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>🔬 Riduci</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>⏱ 2 min</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {candidateTasks[0] && (
        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>✓ Fatto</Text>
        </TouchableOpacity>
      )}

      <View style={styles.accordion}>
        <TouchableOpacity
          style={styles.accordionHead}
          onPress={() => setShowBacklog((v) => !v)}
        >
          <Text style={styles.accordionTitle}>
            {showBacklog ? '▾' : '▸'} ALTRO ({candidateTasks.length - 1})
          </Text>
        </TouchableOpacity>
        {showBacklog && candidateTasks.slice(1).map((entry) => (
          <View key={entry.id} style={styles.accordionBody}>
            <Text style={styles.accordionItem}>{entry.text}</Text>
          </View>
        ))}
      </View>

      {candidateTasks.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            I task appariranno qui quando Lior li estrarrà da una conversazione o un dump vocale.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  focusCard: {
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  eyebrow: {
    color: '#7c8299',
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  focusText: {
    color: '#F7F4EA',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  empty: {
    color: '#7c8299',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  focusActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#161d38',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    color: '#C5BFB0',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#F7F4EA',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: {
    color: '#0B132B',
    fontSize: 16,
    fontWeight: '700',
  },
  accordion: {
    backgroundColor: '#161d38',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 14,
    overflow: 'hidden',
  },
  accordionHead: {
    padding: 14,
  },
  accordionTitle: {
    color: '#C5BFB0',
    fontSize: 13,
    fontWeight: '600',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  accordionItem: {
    color: '#C5BFB0',
    fontSize: 13,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#2A385B',
  },
  hint: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  hintText: {
    color: '#7c8299',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
});
