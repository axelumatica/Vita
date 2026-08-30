import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/vita-store';

export function DiaryScreen() {
  const { colors, radius, spacing, font, fontSize, lineHeight } = useTheme();
  const navigation = useNavigation<any>();
  const { addVaultEntry } = useStore();
  const [draft, setDraft] = useState('');

  const handleSave = () => {
    const text = draft.trim() || 'Pensiero di oggi — registrato via Lior';
    addVaultEntry({ type: 'DIARY', title: text.slice(0, 30), content_raw: text, is_archived: 0 });
    setDraft('');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={[styles.topTitle, { color: colors.text, fontFamily: font.display, fontSize: fontSize.h2, letterSpacing: -0.02 }]}>📖 DIARIO</Text>
        <Text style={[styles.topSubtitle, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm }]}>Scrivi prima di organizzare.</Text>
      </View>

      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, marginHorizontal: 16, marginTop: 10, padding: 18, borderWidth: 1 }]}>
        <Text style={[styles.eyebrow, { color: colors.accent, fontFamily: font.mono, fontSize: fontSize.monoSm, letterSpacing: 0.1 }]}>🎙 TI ASCOLTO</Text>
        <Text style={[styles.heroTitle, { color: colors.text, fontFamily: font.display, fontSize: fontSize.h1, lineHeight: lineHeight.title, marginVertical: 4 }]}>Scrivi senza pensare alla forma.</Text>
        <Text style={[styles.heroDesc, { color: colors.textDim, fontFamily: font.body, fontSize: fontSize.body, lineHeight: lineHeight.body }]}>
          Una voce non giudicante. Registra, esprimi, poi lascia che Lior organizzi silenziosamente.
        </Text>
        <View style={[styles.heroActions, { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }]}>
          <TouchableOpacity onPress={() => navigation.navigate('LiorTab')} style={[styles.heroBtn, { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }]}>
            <Text style={[styles.heroBtnText, { color: colors.accentInk, fontFamily: font.display, fontSize: fontSize.body, fontWeight: '600' }]}>✎ Scrivi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('LiorTab')} style={[styles.heroBtn, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1 }]}>
            <Text style={[styles.heroBtnText, { color: colors.text, fontFamily: font.display, fontSize: fontSize.body, fontWeight: '600' }]}>🎙 Parla</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, marginHorizontal: 16, marginTop: spacing.md, padding: 18, borderWidth: 1 }]}>
        <Text style={[styles.entryMeta, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm, letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 4 }]}>OGGI · {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={[styles.entryBody, { color: colors.text, fontFamily: font.body, fontSize: fontSize.body, lineHeight: lineHeight.body, fontStyle: 'italic', minHeight: 80 }]}>
          {draft || '"Sono ansioso per il lancio di Vita, ho paura di aver dimenticato qualcosa..."'}
        </Text>
      </View>

      {/* Tags + Add-to-focus — real actions */}
      <View style={{ paddingHorizontal: 16, marginTop: spacing.md }}>
        <View style={[styles.tagsRow, { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }]}>
          <Text style={[styles.tag, { backgroundColor: colors.accent, color: colors.accentInk, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontFamily: font.mono, fontSize: 10 }]}>#Sovraccarico</Text>
          <Text style={[styles.tag, { backgroundColor: colors.amber, color: colors.accentInk, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontFamily: font.mono, fontSize: 10 }]}>🔋 Bassa energia</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToFocus, { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 10, alignItems: 'center', marginTop: spacing.md }]}
          onPress={handleSave}
        >
          <Text style={[styles.addToFocusText, { color: colors.accent, fontFamily: font.mono, fontSize: fontSize.monoSm, letterSpacing: 0.04 }]}>⚡ Salva nel Vault → + Aggiungi al Focus</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase', marginHorizontal: 16, marginTop: spacing.xl, marginBottom: spacing.md }]}>ENTRATE PRECEDENTI</Text>
      <TouchableOpacity style={[styles.prevRow, { backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: radius.md, marginHorizontal: 16, marginBottom: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1 }]} onPress={() => navigation.navigate('VaultTab')}>
        <Text style={[styles.prevTitle, { color: colors.textDim, fontFamily: font.display, fontSize: 15, fontWeight: '600', lineHeight: 1.3 }]}>Idea per la gestione degli haptics...</Text>
        <Text style={[styles.prevMeta, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm, marginTop: 2 }]}>Ieri · 18:15</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.prevRow, { backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: radius.md, marginHorizontal: 16, marginBottom: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1 }]} onPress={() => navigation.navigate('VaultTab')}>
        <Text style={[styles.prevTitle, { color: colors.textDim, fontFamily: font.display, fontSize: 15, fontWeight: '600', lineHeight: 1.3 }]}>Riflessione su sovraccarico sensoriale</Text>
        <Text style={[styles.prevMeta, { color: colors.textFaint, fontFamily: font.mono, fontSize: fontSize.monoSm, marginTop: 2 }]}>24 Agosto</Text>
      </TouchableOpacity>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { borderBottomWidth: 1 },
  topTitle: {},
  topSubtitle: {},
  heroCard: { borderWidth: 1 },
  eyebrow: {},
  heroTitle: {},
  heroDesc: {},
  heroActions: {},
  heroBtn: {},
  heroBtnText: {},
  entryCard: { borderWidth: 1 },
  entryMeta: {},
  entryBody: {},
  tagsRow: {},
  tag: {},
  addToFocus: {},
  addToFocusText: {},
  sectionTitle: {},
  prevRow: { borderWidth: 1 },
  prevTitle: {},
  prevMeta: {},
});