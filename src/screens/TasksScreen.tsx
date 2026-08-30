import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useStore } from '../store/vita-store';

export function TasksScreen() {
  const { colors, radius, spacing, font, fontSize } = useTheme();
  const { vaultEntries, focusTaskId, setFocusTaskId, addTaskStep, updateTaskStep, archiveVaultEntry, taskSteps } = useStore();
  const [expandedBacklog, setExpandedBacklog] = useState(false);

  const focusTask = focusTaskId ? vaultEntries.find(e => e.id === focusTaskId) : null;
  const focusSteps = taskSteps.filter(s => s.parent_task_id === focusTaskId).sort((a, b) => a.execution_order - b.execution_order);
  const nextStep = focusSteps.find(s => s.is_completed === 0);
  const completedCount = focusSteps.filter(s => s.is_completed === 1).length;

  const allTasks = vaultEntries.filter(e => e.type === 'TASK' && !e.is_archived && e.id !== focusTaskId);

  const handleToggleStep = (stepId: string) => {
    const step = focusSteps.find(s => s.id === stepId);
    if (step) updateTaskStep(stepId, { is_completed: step.is_completed ? 0 : 1 });
  };

  const handleCompleteFocus = () => {
    focusSteps.forEach(s => updateTaskStep(s.id, { is_completed: 1 }));
    setFocusTaskId(null);
  };

  const handlePass = () => {
    if (focusTaskId) archiveVaultEntry(focusTaskId);
    setFocusTaskId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.topLabel, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm }]}>⚡ ACTIVITY</Text>
        {focusTaskId && (
          <TouchableOpacity onPress={handlePass}>
            <Text style={[styles.topLabel, { color: colors.textDim, fontFamily: font.mono, fontSize: 10 }]}>🧹 Pass to backlog</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
        {/* Focus Card */}
        <View style={[styles.focusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textFaint }]}>🎯 FOCUS OF THE DAY · MAX 1</Text>
          {focusTask ? (
            <>
              <Text style={[styles.headline, { color: colors.text }]}>{focusTask.title}</Text>
              {nextStep ? (
                <View style={styles.microRow}>
                  <TouchableOpacity onPress={() => handleToggleStep(nextStep.id)} style={[styles.checkbox, { borderColor: colors.text }]}>
                    {nextStep.is_completed === 1 && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={[styles.microText, { color: colors.textDim }]}>
                    └ {nextStep.step_description} <Text style={[styles.microHint, { color: colors.textFaint }]}>(active micro-step)</Text>
                  </Text>
                </View>
              ) : (
                <Text style={[styles.doneText, { color: colors.textDim }]}>All steps completed ✓</Text>
              )}
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.accent }]} onPress={handleCompleteFocus}>
                  <Text style={[styles.btnPrimaryText, { color: colors.accentInk }]}>✓ COMPLETATO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePass}>
                  <Text style={[styles.btnSecondaryText, { color: colors.textDim }]}>→ Passa</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.noFocus, { color: colors.textDim }]}>Seleziona un task dalla lista qui sotto.</Text>
          )}
        </View>

        {/* Next Steps */}
        <View style={[styles.section, { marginTop: spacing.md }]}>
          <TouchableOpacity onPress={() => setExpandedBacklog(!expandedBacklog)} style={[styles.accordionHeader, { borderColor: colors.border }]}>
            <Text style={[styles.accordionText, { color: colors.textDim }]}>
              {expandedBacklog ? '▴' : '▾'} PROSSIMI PASSI ({allTasks.length})
            </Text>
          </TouchableOpacity>
          {expandedBacklog && (
            <View style={[styles.accordionBody, { borderColor: colors.border }]}>
              {allTasks.slice(0, 5).map(task => (
                <TouchableOpacity key={task.id} style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setFocusTaskId(task.id)}>
                  <Text style={[styles.taskText, { color: colors.text }]}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Backlog */}
        <View style={[styles.section, { marginTop: spacing.md, marginBottom: spacing.lg }]}>
          <TouchableOpacity onPress={() => setExpandedBacklog(!expandedBacklog)} style={[styles.accordionHeader, { borderColor: colors.border }]}>
            <Text style={[styles.accordionText, { color: colors.textDim }]}>
              {expandedBacklog ? '▴' : '▸'} BACKLOG / ARCHIVIO
            </Text>
          </TouchableOpacity>
          {expandedBacklog && (
            <View style={[styles.accordionBody, { borderColor: colors.border, opacity: 0.78 }]}>
              {vaultEntries.filter(e => e.is_archived).slice(0, 5).map(task => (
                <Text key={task.id} style={[styles.archivedText, { color: colors.textDim }]}>{task.title}</Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topLabel: {},
  scroll: { flex: 1 },
  focusCard: { marginHorizontal: 16, marginTop: 16, padding: 18, borderRadius: 24, borderWidth: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase', marginBottom: 8 },
  headline: { fontSize: 16, fontWeight: '600', lineHeight: 1.3, marginBottom: 4 },
  microRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 12, color: '#0B132B' },
  microText: { flex: 1, fontSize: 14, lineHeight: 1.5 },
  microHint: { fontSize: 12 },
  doneText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btnPrimary: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  btnPrimaryText: { fontSize: 13.5, fontWeight: '600' },
  btnSecondary: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  btnSecondaryText: { fontSize: 13 },
  noFocus: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  section: {},
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  accordionText: { fontSize: 11 },
  accordionBody: { paddingVertical: 8, gap: 6, marginTop: 4 },
  taskItem: { padding: 14, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  taskText: { fontSize: 13, lineHeight: 1.5 },
  archivedText: { fontSize: 12.5, lineHeight: 1.5 },
});