/**
 * src/screens/TasksScreen.tsx
 *
 * Tasks funnel — One-Thing focus method.
 * Reads from vaultEntries (type=TASK), focusTaskId, taskSteps[].
 * The "Fatto" button archives the focus task and clears focus.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Vibration } from 'react-native';
import { useVitaStore } from '../store/vita-store';
import { breakdownTask } from '../ai';
import { useTheme } from '../design/ThemeProvider';
import { Icon } from '../design/Icon';
import * as Haptics from 'expo-haptics';

/** Wrap StyleSheet.create so styles re-read colors when theme changes. */
function useThemedStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 100 },
    focusCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 14,
    },
    eyebrow: {
      color: colors.textFaint,
      fontSize: 11,
      fontFamily: 'monospace',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    focusText: { color: colors.text, fontSize: 18, fontWeight: '600', lineHeight: 24 },
    empty: { color: colors.textFaint, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    steps: { marginTop: 14 },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 10,
    },
    stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
    stepText: { color: colors.textDim, fontSize: 13, flex: 1 },
    stepTextDone: { textDecorationLine: 'line-through', color: colors.textFaint },
    focusActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 10,
      alignItems: 'center',
    },
    actionBtnDisabled: { opacity: 0.6 },
    actionText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    errorText: { color: colors.amber, fontSize: 12, marginTop: 8 },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    primaryBtnText: { color: colors.accentInk, fontSize: 16, fontWeight: '700' },
    accordion: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    accordionHead: { padding: 14 },
    accordionTitle: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
    backlogItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    backlogDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      marginRight: 10,
    },
    backlogDotActive: { backgroundColor: colors.amber },
    backlogText: { color: colors.textDim, fontSize: 13, flex: 1 },
    lowConfBadge: {
      backgroundColor: colors.amber,
      color: colors.accentInk,
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
    hintText: { color: colors.textFaint, fontSize: 12, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
    timerDisplay: { alignItems: 'center', marginTop: 16 },
    timerText: { color: colors.text, fontSize: 48, fontWeight: '300', fontFamily: 'monospace', letterSpacing: 2 },
    timerTextDone: { color: colors.amber },
    timerDoneText: { color: colors.amber, fontSize: 13, marginTop: 4, fontWeight: '600' },
    timerActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    startTimerBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    startTimerText: { color: colors.accentInk, fontSize: 15, fontWeight: '700' },
    addTimeBtn: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    addTimeText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  });
}

export function TasksScreen() {
  const s = useThemedStyles();
  const allTasks = useVitaStore((s) => s.vaultEntries.filter((e) => e.type === 'TASK' && !e.isArchived));
  const focusTaskId = useVitaStore((s) => s.focusTaskId);
  const setFocusTask = useVitaStore((s) => s.setFocusTask);
  const archiveEntry = useVitaStore((s) => s.archiveEntry);
  const addTaskSteps = useVitaStore((s) => s.addTaskSteps);
  const taskSteps = useVitaStore((s) => s.taskSteps);
  const openRouterApiKey = useVitaStore((s) => s.openRouterApiKey);
  const modelSelection = useVitaStore((s) => s.modelSelection);
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
      const steps = await breakdownTask(focusTask.title, openRouterApiKey, modelSelection?.breakdown);
      addTaskSteps(focusTask.id, steps);
      // Reset timer when breakdown completes
      resetTimer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setBreakdownError(msg);
      Alert.alert('Errore breakdown', msg);
    } finally {
      setIsBreakingDown(false);
    }
  }, [focusTask, openRouterApiKey, modelSelection, addTaskSteps]);

  // ── 2-min timer state ─────────────────────────────────────────────
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(120); // 2 min in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function resetTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerSecondsLeft(120);
    setTimerCompleted(false);
    setIsTimerRunning(false);
  }

  function startTimer() {
    if (isTimerRunning) return;
    setTimerSecondsLeft(120);
    setTimerCompleted(false);
    setIsTimerRunning(true);

    timerRef.current = setInterval(async () => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          // Timer complete
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsTimerRunning(false);
          setTimerCompleted(true);
          triggerCompletionFeedback();
          return 0;
        }
        // Haptic tick every 30 seconds
        if (prev % 30 === 0 && prev < 120) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        return prev - 1;
      });
    }, 1000);
  }

  function addTwoMinutes() {
    setTimerSecondsLeft((prev) => prev + 120);
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      timerRef.current = setInterval(async () => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setIsTimerRunning(false);
            setTimerCompleted(true);
            triggerCompletionFeedback();
            return 0;
          }
          if (prev % 30 === 0 && prev < 120) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  async function triggerCompletionFeedback() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore
    }
    try {
      Vibration.vibrate([0, 200, 100, 200]);
    } catch {
      // Ignore
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartTimer = useCallback(() => {
    if (!focusTask) return;
    startTimer();
  }, [focusTask]);

  const handleResetTimer = useCallback(() => {
    resetTimer();
  }, []);

  const handleAddTwoMin = useCallback(() => {
    addTwoMinutes();
  }, []);

  const completedSteps = focusSteps.filter((s) => s.isCompleted).length;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* ── Focus card ─────────────────────────────────────── */}
      <View style={s.focusCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="Target" size={13} color="#C5BFB0" />
          <Text style={s.eyebrow}>FOCUS UNICO</Text>
        </View>
        {focusTask ? (
          <>
            <Text style={s.focusText}>{focusTask.title}</Text>
            {focusSteps.length > 0 && (
              <View style={s.steps}>
                {focusSteps.map((step) => (
                  <TouchableOpacity
                    key={step.id}
                    style={s.stepRow}
                    onPress={() => handleToggleStep(step.id)}
                  >
                    <View style={[s.stepDot, step.isCompleted && s.stepDotDone]} />
                    <Text style={[s.stepText, step.isCompleted && s.stepTextDone]}>
                      {step.step}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={s.focusActions}>
              <TouchableOpacity
                style={[s.actionBtn, isBreakingDown && s.actionBtnDisabled]}
                onPress={handleBreakdown}
                disabled={isBreakingDown}
              >
                <Text style={s.actionText}>{isBreakingDown ? '...' : 'Riduci'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={handleResetTimer}>
                <Icon name="RotateCcw" size={14} color="#6B7280" />
                <Text style={[s.actionText, { marginLeft: 4 }]}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Timer display */}
            {isTimerRunning || timerCompleted ? (
              <View style={s.timerDisplay}>
                <Text style={[s.timerText, timerCompleted && s.timerTextDone]}>
                  {`${Math.floor(timerSecondsLeft / 60)}:${String(timerSecondsLeft % 60).padStart(2, '0')}`}
                </Text>
                {timerCompleted && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="Clock" size={14} color="#F59E0B" />
                    <Text style={[s.timerDoneText, { marginLeft: 4 }]}>Tempo scaduto!</Text>
                  </View>
                )}
                <View style={s.timerActions}>
                  <TouchableOpacity style={s.addTimeBtn} onPress={handleAddTwoMin}>
                    <Text style={s.addTimeText}>+ 2 min</Text>
                  </TouchableOpacity>
                  {timerCompleted && (
                    <TouchableOpacity style={s.addTimeBtn} onPress={handleResetTimer}>
                      <Text style={s.addTimeText}>Reset</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity style={s.startTimerBtn} onPress={handleStartTimer}>
                <Icon name="Play" size={16} color="#0B132B" />
                <Text style={[s.startTimerText, { marginLeft: 6 }]}>Avvia timer 2 min</Text>
              </TouchableOpacity>
            )}
            {breakdownError && <Text style={s.errorText}>{breakdownError}</Text>}
          </>
        ) : (
          <Text style={s.empty}>
            Nessun task in focus.{'\n'}Selezionane uno dal backlog o parla con Lior.
          </Text>
        )}
      </View>

      {/* ── Done button ────────────────────────────────────── */}
      {focusTask && (
        <TouchableOpacity style={s.primaryBtn} onPress={handleDone}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="Check" size={16} color="#0B132B" />
              <Text style={s.primaryBtnText}>
                Fatto{completedSteps > 0 ? ` (${completedSteps}/${focusSteps.length} micro-step)` : ''}
              </Text>
            </View>
        </TouchableOpacity>
      )}

      {/* ── Backlog accordion ───────────────────────────────── */}
      {allTasks.length > 0 && (
        <View style={s.accordion}>
          <TouchableOpacity
            style={s.accordionHead}
            onPress={() => setShowBacklog((v) => !v)}
          >
            <Text style={s.accordionTitle}>
              <Icon name={showBacklog ? 'ChevronDown' : 'ChevronRight'} size={14} color="#C5BFB0" />
              <Text style={{ marginLeft: 4 }}>BACKLOG ({backlog.length})</Text>
            </Text>
          </TouchableOpacity>
          {showBacklog && backlog.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={s.backlogItem}
              onPress={() => handleSetFocus(task.id)}
            >
              <View style={[s.backlogDot, task.id === focusTaskId && s.backlogDotActive]} />
              <Text style={s.backlogText}>{task.title}</Text>
              {task.isLowConfidence && <Text style={s.lowConfBadge}>?</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {allTasks.length === 0 && (
        <View style={s.hint}>
          <Text style={s.hintText}>
            I task appariranno qui quando Lior li estrarrà e tu li confermerai.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
