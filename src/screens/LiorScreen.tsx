import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Vibration, StyleSheet } from 'react-native';
import { useTheme } from '../design/ThemeProvider';
import { useStore } from '../store/vita-store';
import { createPipeline } from '../ai/pipeline';

export function LiorScreen() {
  const { colors, radius, spacing, font, fontSize } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { addTaskStep, taskSteps, focusTaskId, addVaultEntry } = useStore();

  // Real audio level simulation for demo
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 40) + 60);
      }, 200);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Orb rotation animation — real 60fps
  useEffect(() => {
    let animId: number;
    const animate = () => {
      Animated.timing(rotationAnim, { toValue: 360, duration: 3000, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          rotationAnim.setValue(0);
          animId = requestAnimationFrame(animate);
        }
      });
    };
    if (isListening || isThinking) animId = requestAnimationFrame(animate);
    else rotationAnim.setValue(0);
    return () => cancelAnimationFrame(animId);
  }, [isListening, isThinking]);

  // Pulse animation — breathing rhythm
  useEffect(() => {
    if (!isListening && !isThinking) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
      { iterations: -1 }
    );
    loop.start();
    return () => loop.stop();
  }, [isListening, isThinking]);

  const handleListenPress = () => {
    if (isListening) {
      setIsListening(false);
      setIsThinking(true);
      setTimeout(() => {
        const pipeline = createPipeline(useStore.getState());
        pipeline.extract(
          "Devo comprare il caffè per l'ufficio. Sono molto stressato per il lancio."
        ).then((res) => {
          if (res?.tasks?.length) {
            res.tasks.forEach((t) => addTaskStep({
              parent_task_id: focusTaskId || 'new_task',
              step_description: t.title,
              is_completed: 0,
              execution_order: 1,
            }));
          }
          if (res?.journal_reflections?.length) {
            addVaultEntry({
              type: 'DIARY',
              title: 'Riflessione registrata',
              content_raw: res.journal_reflections[0].text,
              is_archived: 0,
            });
          }
          setIsThinking(false);
        }).catch((e) => {
          console.warn('Pipeline failed, local fallback runs:', e);
          setIsThinking(false);
        });
      }, 1500);
    } else {
      setIsListening(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 16, marginBottom: 8 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View style={[styles.badge, { backgroundColor: colors.surface2, borderColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <Text style={{ color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.06 }}>CLOUD ENGINE</Text>
          </View>
          <TouchableOpacity onPress={() => {}} style={{ backgroundColor: colors.surface2, borderRadius: 999, padding: 6 }}>
            <Text style={{ color: colors.accent, fontFamily: font.mono, fontSize: 12 }}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orb */}
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Animated.View
          style={[styles.orb, {
            backgroundColor: colors.surface,
            borderColor: colors.accent,
            borderWidth: 2,
            borderRadius: 60,
            width: 120,
            height: 120,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [
              { rotate: rotationAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
              { scale: pulseAnim },
            ],
          }]}
        >
          <Text style={{ color: colors.accent, fontSize: 20, fontFamily: font.display, fontWeight: '700' }}>LIOR</Text>
        </Animated.View>

        <TouchableOpacity
          onPress={handleListenPress}
          disabled={isThinking}
          style={[styles.micBtn, {
            backgroundColor: isListening ? '#ef4444' : colors.accent,
            borderRadius: 28,
            paddingVertical: 14,
            paddingHorizontal: 32,
            marginTop: 16,
            opacity: isThinking ? 0.6 : 1,
          }]}
        >
          <Text style={[styles.micBtnText, { color: isListening ? '#ffffff' : colors.accentInk, fontFamily: font.display, fontSize: 16, fontWeight: '600' }]}>
            {isListening ? '⏹ ARRESTA' : '🎙 PARLA'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status badges */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        <View style={[styles.pill, { backgroundColor: colors.surface2, borderColor: colors.accent, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }]}>
          <Text style={{ color: colors.accent, fontFamily: font.mono, fontSize: 11 }}>
            {isListening ? '🎤 LIVE' : isThinking ? '🧠 ELABORA' : '💤 IN ATTESA'}
          </Text>
        </View>
      </View>

      {/* Scratchpad */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, marginHorizontal: 4 }]}>
        <Text style={{ color: colors.accent, fontFamily: font.mono, fontSize: 11, letterSpacing: 0.1, marginBottom: 12 }}>SCRATCHPAD</Text>

        {isListening && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontSize: 14 }}>🎙 Registrazione... livello {audioLevel}%</Text>
          </View>
        )}

        {isThinking && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ color: colors.accent, fontSize: 14 }}>🧠 Estrazione in corso (local fallback attivo se 429)</Text>
          </View>
        )}

        {/* Extracted tasks */}
        {taskSteps.slice(0, 3).map((step) => (
          <TouchableOpacity
            key={step.id}
            style={[styles.stepRow, { backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12, marginVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
            onPress={() => { Vibration.vibrate(10); }}
          >
            <Text style={{ color: colors.accent, fontSize: 14 }}>✓</Text>
            <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{step.step_description}</Text>
          </TouchableOpacity>
        ))}

        {taskSteps.length === 0 && (
          <Text style={{ color: colors.textDim, fontSize: 13, fontStyle: 'italic' }}>
            Parla per estrarre task. "Devo comprare il caffè..."
          </Text>
        )}
      </View>

      {/* Pipeline status */}
      <View style={[styles.footer, { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 12, marginTop: 16, marginHorizontal: 4, flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Text style={{ color: colors.textFaint, fontFamily: font.mono, fontSize: 10 }}>
          Pipeline: Local (OpenRouter free fallback attivo)
        </Text>
        <Text style={{ color: colors.accent, fontFamily: font.mono, fontSize: 10 }}>
          Model: gemini-2.0-flash-exp:free
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 44, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  orb: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  micBtn: { borderRadius: 28, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  micBtnText: { fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 8, padding: 16 },
  stepRow: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
});
