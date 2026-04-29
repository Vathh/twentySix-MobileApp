import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SCORING_MODES } from '../../hooks/useMatchSettings';

const Settings = ({ scoringMode, setScoringMode, loaded = true }) => {
  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ładowanie…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      <View style={styles.section}>
        <Text style={styles.label}>Sposób wprowadzania punktów (501)</Text>
        <Text style={styles.hint}>Wybierz, jak chcesz wpisywać wyniki rzutów</Text>
        <View style={styles.options}>
          <Pressable
            style={[
              styles.option,
              scoringMode === SCORING_MODES.SUM && styles.optionSelected,
            ]}
            onPress={() => setScoringMode(SCORING_MODES.SUM)}
          >
            <Text style={[styles.optionText, scoringMode === SCORING_MODES.SUM && styles.optionTextSelected]}>
              Suma trzech rzutów
            </Text>
            <Text style={styles.optionDesc}>Wpisz łączny wynik serii (np. 60, 180)</Text>
          </Pressable>
          <Pressable
            style={[
              styles.option,
              scoringMode === SCORING_MODES.PER_DART && styles.optionSelected,
            ]}
            onPress={() => setScoringMode(SCORING_MODES.PER_DART)}
          >
            <Text style={[styles.optionText, scoringMode === SCORING_MODES.PER_DART && styles.optionTextSelected]}>
              Każdy rzut osobno
            </Text>
            <Text style={styles.optionDesc}>Klikaj wartość każdej lotki (1–20, bull, D, T)</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    padding: 16,
  },
  loadingText: {
    color: '#c5c5c5',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  options: {
    gap: 12,
  },
  option: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  optionSelected: {
    borderColor: '#F99417',
    backgroundColor: 'rgba(249,148,23,0.15)',
  },
  optionText: {
    color: '#c5c5c5',
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#F99417',
  },
  optionDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
});

export default Settings;

