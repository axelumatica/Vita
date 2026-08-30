/**
 * src/screens/VaultScreen.tsx
 *
 * Vault — long-term archive of all stored entries.
 * Placeholder build: lists scratchpad entries as a flat feed.
 * Real version will filter by type (TASK/DIARY/VOICE/NOTE) and use vector
 * search once a proper vaultEntries[] is restored in the store.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useVitaStore } from '../store/vita-store';

type Filter = 'all' | 'task' | 'diary';

export function VaultScreen() {
  const scratchpad = useVitaStore((s) => s.scratchpad);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  // Placeholder filter logic: real version will read typed vault entries.
  const filtered = scratchpad
    .slice()
    .reverse()
    .filter((entry) => {
      if (query && !entry.text.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      // Treat as diary by default until proper typing exists.
      if (filter === 'task') return false;
      if (filter === 'diary') return true;
      return true;
    });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="🔍 Cerca…"
          placeholderTextColor="#7c8299"
        />
      </View>

      <View style={styles.pillRow}>
        {(['all', 'task', 'diary'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextOn]}>
              {f === 'all' ? 'Tutto' : f === 'task' ? '⚡ Task' : '📖 Diario'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {scratchpad.length === 0
                ? 'Il vault è vuoto.\nParla con Lior o scrivi nel Diario per iniziare.'
                : 'Nessun risultato per la tua ricerca.'}
            </Text>
          </View>
        ) : (
          filtered.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <Text style={styles.cardText}>{entry.text}</Text>
              <Text style={styles.cardMeta}>
                {new Date(entry.timestamp).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  search: {
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F7F4EA',
    fontSize: 14,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
  },
  pillOn: {
    backgroundColor: '#F7F4EA',
    borderColor: '#F7F4EA',
  },
  pillText: {
    color: '#C5BFB0',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextOn: {
    color: '#0B132B',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#7c8299',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#1C2541',
    borderWidth: 1,
    borderColor: '#2A385B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  cardText: {
    color: '#F7F4EA',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  cardMeta: {
    color: '#7c8299',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
