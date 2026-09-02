/**
 * src/screens/VaultScreen.tsx
 *
 * Vault — long-term archive of all stored entries.
 * Reads from vaultEntries[], filters by type, searches by content/title.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useVitaStore } from '../store/vita-store';
import { useTheme } from '../design/ThemeProvider';
import { Icon } from '../design/Icon';
import { clusterEntries } from '../ai';
import type { VaultEntryType, ProjectCluster } from '../store/vita-store';

type Filter = 'all' | VaultEntryType;

const FILTER_LABELS: Record<Filter, { icon: string; label: string }> = {
  all: { icon: 'Archive', label: 'Tutto' },
  TASK: { icon: 'Zap', label: 'Task' },
  DIARY: { icon: 'BookOpen', label: 'Diario' },
  VOICE: { icon: 'Mic', label: 'Voce' },
  NOTE: { icon: 'Lightbulb', label: 'Note' },
};

/** Wrap StyleSheet.create so styles re-read colors when theme changes. */
function useThemedStyles() {
  const { colors, radius } = useTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    searchRow: { paddingHorizontal: 16, paddingTop: 12 },
    search: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
    },
    pillRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexWrap: 'wrap',
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    pillText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
    pillTextOn: { color: colors.accentInk },
    content: { paddingHorizontal: 16, paddingBottom: 100 },
    empty: { paddingVertical: 60, alignItems: 'center' },
    emptyText: { color: colors.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    cardType: { fontSize: 16 },
    lowConfBadge: {
      marginLeft: 6,
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
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    cardContent: { color: colors.textDim, fontSize: 13, lineHeight: 19, marginBottom: 8 },
    tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    tag: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    tagText: { color: colors.textFaint, fontSize: 11, fontFamily: 'monospace' },
    cardMeta: { color: colors.textFaint, fontSize: 11, fontFamily: 'monospace' },
  });
}

export function VaultScreen() {
  const s = useThemedStyles();
  const vaultEntries = useVitaStore((s) => s.vaultEntries);
  const projectClusters = useVitaStore((s) => s.projectClusters);
  const addProjectCluster = useVitaStore((s) => s.addProjectCluster);
  const removeProjectCluster = useVitaStore((s) => s.removeProjectCluster);
  const updateEntry = useVitaStore((s) => s.updateEntry);
  const apiKey = useVitaStore((s) => s.openRouterApiKey);
  const [filter, setFilter] = useState<Filter>('all');
  const [clusterFilter, setClusterFilter] = useState<ProjectCluster | null>(null);
  const [query, setQuery] = useState('');
  const [isClustering, setIsClustering] = useState(false);

  const handleRunClustering = useCallback(async () => {
    if (!apiKey) {
      Alert.alert('Chiave API assente', 'Configura la chiave OpenRouter per usare il clustering.');
      return;
    }
    const active = vaultEntries.filter((e) => !e.isArchived);
    if (active.length < 3) {
      Alert.alert('poche entry', 'Aggiungi almeno 3 entry per attivare il clustering.');
      return;
    }
    setIsClustering(true);
    try {
      const labels = active.map((e) => e.title || e.content.slice(0, 80));
      const results = await clusterEntries(labels, apiKey);
      let created = 0;
      for (const r of results) {
        if (r.confidenceScore >= 0.75) {
          const cluster = addProjectCluster(r.clusterName, r.confidenceScore);
          // Seed-assign the sample entry to this cluster by text match
          const matchIdx = active.findIndex(
            (e) => e.title.includes(r.sample) || r.sample.includes(e.title?.slice(0, 15)),
          );
          if (matchIdx >= 0) {
            updateEntry(active[matchIdx].id, { projectClusterId: cluster.id });
          }
          created++;
        }
      }
      if (created === 0) {
        Alert.alert('Nessun cluster trovato', 'Prova ad aggiungere più entry con temi simili.');
      } else {
        Alert.alert('Fatto', `${created} cluster creati.`);
      }
    } catch (err) {
      Alert.alert('Errore clustering', (err as Error).message);
    } finally {
      setIsClustering(false);
    }
  }, [apiKey, vaultEntries, addProjectCluster, updateEntry]);

  const visible = vaultEntries
    .filter((e) => !e.isArchived)
    .filter((e) => (filter === 'all' ? true : e.type === filter))
    .filter((e) => {
      if (clusterFilter) return e.projectClusterId === clusterFilter.id;
      return true;
    })
    .filter((e) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

  const counts: Partial<Record<VaultEntryType, number>> = {};
  for (const e of vaultEntries.filter((e) => !e.isArchived)) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Cerca per concetto o significato…"
          placeholderTextColor="#7c8299"
        />
      </View>

      <View style={s.pillRow}>
        {(['all', 'TASK', 'DIARY', 'NOTE'] as Filter[]).map((f) => {
          const count = f === 'all'
            ? vaultEntries.filter((e) => !e.isArchived).length
            : counts[f as VaultEntryType] ?? 0;
          return (
            <TouchableOpacity
              key={f}
              style={[s.pill, filter === f && s.pillOn]}
              onPress={() => setFilter(f)}
            >
              <Icon
                name={FILTER_LABELS[f].icon as any}
                size={14}
                color={filter === f ? '#F7F4EA' : '#C5BFB0'}
              />
              <Text style={[s.pillText, filter === f && s.pillTextOn, { marginLeft: 4 }]}>
                {FILTER_LABELS[f].label} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cluster pills + clustering button */}
      <View style={s.pillRow}>
        {projectClusters.length > 0 && (
          <TouchableOpacity
            style={[s.pill, !clusterFilter && s.pillOn]}
            onPress={() => setClusterFilter(null)}
          >
            <Text style={[s.pillText, !clusterFilter && s.pillTextOn]}>
              Tutti
            </Text>
          </TouchableOpacity>
        )}
        {projectClusters.map((cluster) => {
          const isActive = clusterFilter?.id === cluster.id;
          return (
            <TouchableOpacity
              key={cluster.id}
              style={[s.pill, isActive && s.pillOn]}
              onPress={() => setClusterFilter(isActive ? null : cluster)}
              onLongPress={() => {
                Alert.alert(
                  'Rimuovi cluster',
                  `Rimuovere "${cluster.clusterName}"?`,
                  [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Rimuovi',
                      style: 'destructive',
                      onPress: () => {
                        removeProjectCluster(cluster.id);
                        if (clusterFilter?.id === cluster.id) setClusterFilter(null);
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={[s.pillText, isActive && s.pillTextOn]}>
                {cluster.clusterName}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[s.pill, isClustering && s.pillOn]}
          onPress={handleRunClustering}
          disabled={isClustering}
        >
          <Text style={[s.pillText, isClustering && s.pillTextOn]}>
            {isClustering ? 'Caricamento...' : 'Raggruppa'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {visible.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>
              {vaultEntries.filter((e) => !e.isArchived).length === 0
                ? 'Il vault è vuoto.\nTocca "Conferma" in Lior per salvare il primo pensiero.'
                : 'Nessun risultato per la tua ricerca.'}
            </Text>
          </View>
        ) : (
          visible.map((entry) => (
            <View key={entry.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardType}>
                  <Icon name={entry.type === 'TASK' ? 'Zap' : entry.type === 'DIARY' ? 'BookOpen' : 'Lightbulb'} size={14} color="#C5BFB0" />
                </Text>
                {entry.isLowConfidence && (
                  <Text style={s.lowConfBadge}>?</Text>
                )}
              </View>
              <Text style={s.cardTitle}>{entry.title}</Text>
              {entry.projectClusterId && (() => {
                const cluster = projectClusters.find(c => c.id === entry.projectClusterId);
                return cluster ? (
                  <Text style={s.cardMeta}>{cluster.clusterName}</Text>
                ) : null;
              })()}
              <Text style={s.cardContent} numberOfLines={3}>
                {entry.content}
              </Text>
              {entry.tags.length > 0 && (
                <View style={s.tagRow}>
                  {entry.tags.map((tag) => (
                    <View key={tag} style={s.tag}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={s.cardMeta}>
                {new Date(entry.createdAt).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
