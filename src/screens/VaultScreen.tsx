import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useStore } from '../store/vita-store';

export function VaultScreen() {
  const { colors, radius, spacing, font, fontSize } = useTheme();
  const { vaultEntries } = useStore();
  const [filter, setFilter] = useState('All');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const filtered = vaultEntries.filter(entry => {
    if (filter === 'All') return true;
    if (filter === 'Ideas') return entry.type === 'NOTE' || entry.type === 'TASK';
    if (filter === 'Diary') return entry.type === 'DIARY';
    if (filter === 'Voice') return entry.type === 'VOICE';
    return true;
  });

  const handleCardPress = (id: string) => {
    setSelectedCard(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 12 }}>🗂 VAULT</Text>
        <TouchableOpacity>
          <Text style={{ color: colors.textDim, fontFamily: font.mono, fontSize: 10 }}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 12 }}>⌕</Text>
            <Text style={{ color: colors.textDim, fontFamily: font.body, fontSize: 13, flex: 1 }}>🔍 Cerca per significato…</Text>
            <TouchableOpacity>
              <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 12 }}>🎙</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 8 }}>
            {['All', 'Ideas', 'Diary', 'Voice'].map(chip => (
              <TouchableOpacity
                key={chip}
                onPress={() => setFilter(chip)}
                style={[styles.chip, { backgroundColor: filter === chip ? colors.accent : colors.surface2, borderColor: filter === chip ? 'transparent' : colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 }]}
              >
                <Text style={{ color: filter === chip ? colors.accentInk : colors.text, fontFamily: font.mono, fontSize: 11, fontWeight: chip === 'All' ? '600' : '400' }}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16, gap: spacing.sm, paddingBottom: 40 }}>
          {filtered.map(entry => (
            <TouchableOpacity
              key={entry.id}
              onPress={() => handleCardPress(entry.id)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: 16 }]}
            >
              <View style={{ flexDirection: 'column', gap: 4 }}>
                <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {entry.type === 'TASK' ? '⚡ TASK' : entry.type === 'DIARY' ? '📖 DIARY' : entry.type === 'VOICE' ? '🎙️ VOICE' : '📄 NOTE'}
                </Text>
                <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 16, fontWeight: '600' }}>{entry.title}</Text>
                <Text style={{ color: colors.textDim, fontFamily: font.body, fontSize: 13, lineHeight: 1.5 }}>
                  {entry.content_raw.length > 60 ? entry.content_raw.slice(0, 60) + '…' : entry.content_raw}
                </Text>
                {entry.type === 'VOICE' && (
                  <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 10 }}>
                    (( {Math.floor((entry.created_at % 86400000) / 1000)}s ))
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedCard && (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedCard(null)}>
            <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 12 }}>✕</Text>
          </TouchableOpacity>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {vaultEntries.find(e => e.id === selectedCard) && (
              <View style={{ padding: 20 }}>
                <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
                  {vaultEntries.find(e => e.id === selectedCard)?.title}
                </Text>
                <Text style={{ color: colors.textDim, fontFamily: font.body, fontSize: 15, lineHeight: 1.6 }}>
                  {vaultEntries.find(e => e.id === selectedCard)?.content_raw}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCard(null)} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <Text style={{ color: colors.accent, fontFamily: font.mono, fontSize: 12 }}>✕ Chiudi</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { borderWidth: 1 },
  chip: { borderWidth: 1 },
  card: { marginBottom: 12 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    borderTopWidth: 1,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});