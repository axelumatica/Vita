/**
 * src/screens/TasksScreen.tsx
 *
 * Tasks funnel — One-Thing focus method.
 * Reads from vaultEntries (type=TASK), focusTaskId, taskSteps[].
 * The "Fatto" button archives the focus task and clears focus.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useVitaStore } from '../store/vita-store';
import { breakdownTask } from '../ai';

export function TasksScreen() {
  const allTasks = useVitaStore((s) => s.vaultEntries.filter((e) => e.type === 'TASK' && !e.isArchived));
  const focusTaskId = useVitaStore((s) => s.focusTaskId);
  const setFocusTask = useVitaStore((s) => s.setFocusTask);
  const archiveEntry = useVitaStore((s) => s.archiveEntry);
  const addTaskSteps = useVitaStore((s) => s.addTaskSteps);
  const taskSteps = useVitaStore((s) => s.taskSteps);
  const openRouterApiKey = useVitaStore((s) => s.openRouterApiKey);
  const toggleTaskStep = useVitaStore((s) => s.toggleTaskStep);
  const [showBacklog, setShowBacklog] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  const focusTask = focusTaskId ? allTasks.find((t) => t.id === focusTaskId) : null;
  const focusSteps = focusTaskId
    ? taskSteps.filter((s) => s.parentTaskId === focusTaskId).sort((a, b) => a.order - b.order)
    : [];
  const backlog = allTasks.filter((t) => t.id !== focusTaskId);

  function handleDone() {
    if (!focusTask) return;
    archiveEntry(focusTask.id);
    setFocusTask(null);
  }

  function handleSetFocus(taskId: string) {
    setFocusTask(taskId);
  }

  function handleToggleStep(stepId: string) {
    toggleTaskStep(stepId);
  }

  const handleBreakdown = useCallback(async () => {
    if (!focusTask || !openRouterApiKey) return;
    setIsBreakingDown(true);
    setBreakdownError(null);
    try {
      const steps = await breakdownTask(focusTask.title, openRouterApiKey);
      addTaskSteps(focusTask.id, steps);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setBreakdownError(msg);
      Alert.alert('Errore breakdown', msg);
    } finally {
      setIsBreakingDown(false);
    }
  }, [focusTask, openRouterApiKey, addTaskSteps]);

  const handleStartTimer = useCallback(() => {
    if (!focusTask) return;
    // Future: wire expo-av timer or 2-min countdown
    Alert.alert('Timer 2 min', `Avvio timer per: "${focusTask.title}"\n(Integrazione timer da completare)`);
  }, [focusTask]);

  const completedSteps = focusSteps.filter((s) => s.isCompleted).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Focus card ─────────────────────────────────────── */}
      <View style={styles.focusCard}>
        <Text style={styles.eyebrow}>🎯 FOCUS UNICO</Text>
        {focusTask ? (
          <>
            <Text style={styles.focusText}>{focusTask.title}</Text>
            {focusSteps.length > 0 && (
              <View style={styles.steps}>
                {focusSteps.map((step) => (
                  <TouchableOpacity
                    key={step.id}
                    style={styles.stepRow}
                    onPress={() => handleToggleStep(step.id)}
                  >
                    <View style={[styles.stepDot, step.isCompleted && styles.stepDotDone]} />
                    <Text style={[styles.stepText, step.isCompleted && styles.stepTextDone]}>
                      {step.step}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.focusActions}>
              <TouchableOpacity
                style={[styles.actionBtn, isBreakingDown && styles.actionBtnDisabled]}
                onPress={handleBreakdown}
                disabled={isBreakingDown}
              >
                <Text style={styles.actionText}>{isBreakingDown ? '...' : '🔬 Riduci'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleStartTimer}>
                <Text style={styles.actionText}>⏱ 2 min</Text>
              </TouchableOpacity>
            </View>
            {breakdownError && (
              <Text style={styles.errorText}>{breakdownError}</Text>
            )}
          </>
        ) : (
          <Text style={styles.empty}>
            Nessun task in focus.{'\n'}Selezionane uno dal backlog o parla con Lior.
          </Text>
        )}
      </View>

      {/* ── Done button ────────────────────────────────────── */}
      {focusTask && (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleDone}>
          <Text style={styles.primaryBtnText}>
            ✓ Fatto{completedSteps > 0 ? ` (${completedSteps}/${focusSteps.length} micro-step)` : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Backlog accordion ───────────────────────────────── */}
      {allTasks.length > 0 && (
        <View style={styles.accordion}>
          <TouchableOpacity
            style={styles.accordionHead}
            onPress={() => setShowBacklog((v) => !v)}
          >
            <Text style={styles.accordionTitle}>
              {showBacklog ? '▾' : '▸'} BACKLOG ({backlog.length})
            </Text>
          </TouchableOpacity>
          {showBacklog && backlog.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.backlogItem}
              onPress={() => handleSetFocus(task.id)}
            >
              <View style={[styles.backlogDot, task.id === focusTaskId && styles.backlogDotActive]} />
              <Text style={styles.backlogText}>{task.title}</Text>
              {task.isLowConfidence && <Text style={styles.lowConfBadge}>?</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {allTasks.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            I task appariranno qui quando Lior li estrarrà e tu li confermerai.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  content: { padding: 16, paddingBottom: 100 },
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
  focusText: { color: '#F7F4EA', fontSize: 18, fontWeight: '600', lineHeight: 24 },
  empty: { color: '#7c8299', fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
  steps: { marginTop: 14, gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2A385B',
    marginRight: 10,
  },
  stepDotDone: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  stepText: { color: '#C5BFB0', fontSize: 13, flex: 1 },
  stepTextDone: { textDecorationLine: 'line-through', color: '#7c8299' },
  focusActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#161d38',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: '#C5BFB0', fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#F7F4EA',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: { color: '#0B132B', fontSize: 16, fontWeight: '700' },
  accordion: {
    backgroundColor: '#161d38',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 14,
    overflow: 'hidden',
  },
  accordionHead: { padding: 14 },
  accordionTitle: { color: '#C5BFB0', fontSize: 13, fontWeight: '600' },
  backlogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A385B',
  },
  backlogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A385B',
    marginRight: 10,
  },
  backlogDotActive: { backgroundColor: '#F59E0B' },
  backlogText: { color: '#C5BFB0', fontSize: 13, flex: 1 },
  lowConfBadge: {
    backgroundColor: '#F59E0B',
    color: '#0B132B',
    fontSize: 10,
    fontWeight: '700',
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
  },
  hint: { marginTop: 20, paddingHorizontal: 4 },
  hintText: { color: '#7c8299', fontSize: 12, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#F59E0B',
    fontSize: 12,
    marginTop: 8,
  },
});
