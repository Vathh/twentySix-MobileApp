import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Switch } from 'react-native';
import { SCORING_MODES } from '../../hooks/useGameSettings';
import { playClick } from '../../helpers/gameSounds/playGameSound';
import { colors } from '../../theme/colors';

const VOLUME_STEPS = [0.2, 0.4, 0.6, 0.8, 1];

const Settings = ({
  scoringMode,
  setScoringMode,
  soundsEnabled = true,
  setSoundsEnabled,
  soundVolume = 1,
  setSoundVolume,
  loaded = true,
  hideScoringMode = false,
}) => {
  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ładowanie…</Text>
      </View>
    );
  }

  const handleVolumeStep = (step) => {
    if (!soundsEnabled) {
      setSoundsEnabled?.(true);
    }
    setSoundVolume?.(step);
    playClick();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      {!hideScoringMode ? (
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
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Dźwięki gry</Text>
        <Text style={styles.hint}>Zapowiedzi rzutów i końca lega. Zostaje na kolejne mecze.</Text>
        <View style={styles.soundRow}>
          <Text style={styles.soundRowLabel}>
            {soundsEnabled ? 'Włączone' : 'Wyłączone'}
          </Text>
          <Switch
            value={soundsEnabled}
            onValueChange={(value) => setSoundsEnabled?.(value)}
            trackColor={{ false: colors.textVeryDim, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
        <Text style={[styles.volumeLabel, !soundsEnabled && styles.volumeLabelDisabled]}>
          Głośność · {Math.round(soundVolume * 100)}%
        </Text>
        <View style={styles.volumeRow}>
          {VOLUME_STEPS.map((step) => {
            const filled = soundVolume + 0.001 >= step;
            return (
              <Pressable
                key={step}
                style={[
                  styles.volumeStep,
                  filled && styles.volumeStepFilled,
                  !soundsEnabled && styles.volumeStepDisabled,
                ]}
                onPress={() => handleVolumeStep(step)}
              />
            );
          })}
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
    color: colors.textMuted,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    color: colors.textDim,
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
    borderColor: colors.border,
    backgroundColor: colors.scrimSoft,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.accent,
  },
  optionDesc: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.scrimSoft,
    marginBottom: 16,
  },
  soundRowLabel: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  volumeLabel: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 10,
  },
  volumeLabelDisabled: {
    opacity: 0.5,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 44,
  },
  volumeStep: {
    flex: 1,
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  volumeStepFilled: {
    backgroundColor: colors.accent,
  },
  volumeStepDisabled: {
    opacity: 0.35,
  },
});

export default Settings;
