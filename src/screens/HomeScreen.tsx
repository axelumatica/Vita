import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../design/ThemeProvider';
import { useStore } from '../store/vita-store';

export function HomeScreen() {
  const { colors, radius, spacing, font, fontSize, lineHeight } = useTheme();
  const navigation = useNavigation<any>();
  const { vaultEntries, focusTaskId, setFocusTaskId } = useStore();

  const focusTask = focusTaskId ? vaultEntries.find(e => e.id === focusTaskId) : null;
  const recentEntries = [...vaultEntries]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 3);
  const openTaskCount = vaultEntries.filter(e => e.type === 'TASK' && !e.is_archived).length;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'ora';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' minuti fa';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ore fa';
    return new Date(ts).toLocaleDateString('it-IT');
  };

  const typeIcon: Record<string, string> = { TASK: '⚡', DIARY: '▤', VOICE: '🎙', NOTE: '📄' };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      {/* Sticky top chrome */}
      <View style={[styles.topChrome, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.chromeLabel, { color: colors.textDim, fontFamily: font.mono, fontSize: fontSize.monoSm }]}>
          LIOR: READY
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.chromeStatus, { color: colors.textDim, fontFamily: font.mono, fontSize: fontSize.monoSm }]}>
            LOCAL • LOCKED
          </Text>
        </View>
      </View>

      {/* Hero Bento Card (A+D hybrid: Lior Briefing + Quick Capture) */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.eyebrow, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm, letterSpacing: 0.1 }]}>
          LIOR / DOVE SIAMO RIMASTI
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text, fontFamily: font.display, fontSize: fontSize.h1, lineHeight: lineHeight.title, marginTop: 4, marginBottom: 4 }]}>
          {focusTask
            ? focusTask.title
            : openTaskCount > 0
            ? `${openTaskCount} task aperti per oggi.`
            : 'Nessun task. Parla con Lior.'}
        </Text>
        <Text style={[styles.heroBody, { color: colors.textDim, fontFamily: font.body, fontSize: fontSize.body, lineHeight: lineHeight.body }]}>
          {recentEntries.length > 0
            ? `Ultimo accesso: ${formatTime(recentEntries[0].created_at)}.`
            : 'Inizia una conversazione con Lior per catturare i tuoi pensieri.'}
        </Text>
        <View style={[styles.heroActions, { flexDirection: 'row', gap: 8, marginTop: 14 }]}>
          <TouchableOpacity
            style={[styles.heroBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
            onPress={() => navigation.navigate('LiorTab')}
          >
            <Text style={[styles.heroBtnText, { color: colors.text, fontFamily: font.body, fontWeight: '600', fontSize: 12 }]}>🎙 Voce</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
            onPress={() => navigation.navigate('TasksTab')}
          >
            <Text style={[styles.heroBtnText, { color: colors.text, fontFamily: font.body, fontWeight: '600', fontSize: 12 }]}>✎ Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
            onPress={() => navigation.navigate('DiaryTab')}
          >
            <Text style={[styles.heroBtnText, { color: colors.text, fontFamily: font.body, fontWeight: '600', fontSize: 12 }]}>▤ Diario</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Focus Card — from store */}
      <TouchableOpacity
        style={[styles.focusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('TasksTab')}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm, letterSpacing: 0.1 }]}>
              🎯 FOCUS DI OGGI · MAX 1
            </Text>
            {focusTask ? (
              <>
                <Text style={[styles.focusTitle, { color: colors.text, fontFamily: font.display, fontSize: fontSize.title, lineHeight: lineHeight.title, marginTop: 4 }]}>
                  {focusTask.title}
                </Text>
                <Text style={[styles.focusSub, { color: colors.textDim, fontFamily: font.body, fontSize: fontSize.bodySm, lineHeight: lineHeight.body, marginTop: 4 }]}>
                  └ {focusTask.content_raw.slice(0, 60)}{focusTask.content_raw.length > 60 ? '…' : ''}
                </Text>
              </>
            ) : (
              <Text style={[styles.focusTitle, { color: colors.textDim, fontFamily: font.body, fontSize: fontSize.body, marginTop: 4, fontStyle: 'italic' }]}>
                Nessun focus impostato. Scegli un task.
              </Text>
            )}
          </View>
          <View style={[styles.checkBox, { borderColor: colors.accent, borderRadius: radius.md / 2 }]}>
            {focusTask && <Text style={{ color: colors.accent, fontSize: 11, fontFamily: font.mono }}>✓</Text>}
          </View>
        </View>
        <View style={[styles.focusActions, { flexDirection: 'row', gap: 8, marginTop: spacing.md, justifyContent: 'center' }]}>
          <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.actionBtnText, { color: colors.textDim, fontFamily: font.body, fontSize: fontSize.bodySm, textAlign: 'center' }]}>🔬 Riduci</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.actionBtnText, { color: colors.textDim, fontFamily: font.body, fontSize: fontSize.bodySm, textAlign: 'center' }]}>⏱ 2 min</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* System Status */}
      <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.statusLabel, { color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.12 }]}>SISTEMA</Text>
        <Text style={[styles.statusValue, { color: colors.text, fontFamily: font.display, fontSize: 21, fontWeight: '700', letterSpacing: 0.02 }]}>🔒</Text>
        <Text style={[styles.statusMeta, { color: colors.textDim, fontFamily: font.mono, fontSize: 11 }]}>Vault crittografata · AI locale</Text>
      </View>

      {/* Smart Search */}
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('VaultTab')}
        activeOpacity={0.7}
      >
        <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 13 }}>⌕ Cerca la tua memoria locale…</Text>
      </TouchableOpacity>

      {/* Recent items — from store */}
      <Text style={[styles.sectionTitle, { color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.12, marginTop: spacing.lg, marginBottom: spacing.sm }]}>RECENTI</Text>
      {recentEntries.length > 0 ? (
        recentEntries.map((entry) => (
          <TouchableOpacity
            key={entry.id}
            style={[styles.recentRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={() => navigation.navigate('VaultTab')}
          >
            <Text style={[styles.recentText, { color: colors.textDim, fontFamily: font.body, fontSize: 13 }]}>
              {typeIcon[entry.type] || '📄'} {entry.title} · {formatTime(entry.created_at)}
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <TouchableOpacity style={[styles.recentRow, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={() => navigation.navigate('LiorTab')}>
          <Text style={[styles.recentText, { color: colors.textDim, fontFamily: font.body, fontSize: 13, fontStyle: 'italic' }]}>
            🎙 Inizia con Lior — premi qui
          </Text>
        </TouchableOpacity>
      )}

      {/* Demo: Add a sample task */}
      <View style={{ marginBottom: 100, marginTop: spacing.md, marginHorizontal: 16 }}>
        <TouchableOpacity
          style={[styles.demoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            const id = `v_${Date.now()}_demo`;
            useStore.getState().addVaultEntry({
              type: 'TASK',
              title: 'Test task — ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
              content_raw: 'Questo è un task di test. Lior può scomporlo in micro-passi.',
              is_archived: 0,
            });
          }}
        >
          <Text style={[styles.demoBtnText, { color: colors.textFaint, fontFamily: font.mono, fontSize: 11 }]}>+ Demo: aggiungi un task</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topChrome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  chromeLabel: { fontWeight: '500' },
  chromeStatus: { fontWeight: '500' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  heroCard: { margin: 16, padding: 18, borderWidth: 1, borderRadius: 24 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.08 },
  heroTitle: { letterSpacing: -0.01 },
  heroBody: {},
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  heroBtnText: { fontWeight: '600', fontSize: 12 },
  focusCard: { marginHorizontal: 16, marginTop: 10, padding: 18, borderWidth: 1, borderRadius: 24 },
  focusTitle: { letterSpacing: -0.005 },
  focusSub: {},
  focusActions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  actionBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  actionBtnText: { textAlign: 'center' },
  checkBox: { width: 28, height: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  statusCard: { marginHorizontal: 16, marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 16 },
  statusLabel: {},
  statusValue: {},
  statusMeta: { marginTop: 4 },
  searchBar: { marginHorizontal: 16, marginTop: 10, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderRadius: 16 },
  sectionTitle: { marginHorizontal: 16 },
  recentRow: { marginHorizontal: 16, marginBottom: 8, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderRadius: 14 },
  recentText: {},
  demoBtn: { padding: 14, borderWidth: 1, borderRadius: 14, borderStyle: 'dashed', alignItems: 'center' },
  demoBtnText: { textAlign: 'center' },
});