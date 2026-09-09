import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applySoundPrefs } from '../helpers/gameSounds/playGameSound';

const STORAGE_KEY = '@match_settings';
const SCORING_MODES = {
  SUM: 'sum',
  PER_DART: 'per_dart',
};

const DEFAULT_SETTINGS = {
  scoringMode: SCORING_MODES.SUM,
  soundsEnabled: true,
  soundVolume: 1,
};

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(0, Math.min(1, n));
}

function syncSoundPrefs(settings) {
  applySoundPrefs({
    enabled: settings.soundsEnabled !== false,
    volume: clampVolume(settings.soundVolume),
  });
}

export { SCORING_MODES };

export function useGameSettings() {
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) {
          try {
            const parsed = JSON.parse(json);
            setSettingsState((prev) => {
              const next = { ...prev, ...parsed };
              syncSoundPrefs(next);
              return next;
            });
          } catch (e) {
            console.warn('useGameSettings load error', e);
          }
        } else {
          syncSoundPrefs(DEFAULT_SETTINGS);
        }
        setLoaded(true);
      })
      .catch((e) => {
        console.warn('useGameSettings load error', e);
        setLoaded(true);
      });
  }, []);

  const setSetting = useCallback((key, value) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      syncSoundPrefs(next);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('useGameSettings save error', e)
      );
      return next;
    });
  }, []);

  const setScoringMode = useCallback(
    (mode) => setSetting('scoringMode', mode),
    [setSetting]
  );

  const setSoundsEnabled = useCallback(
    (enabled) => setSetting('soundsEnabled', !!enabled),
    [setSetting]
  );

  const setSoundVolume = useCallback(
    (volume) => setSetting('soundVolume', clampVolume(volume)),
    [setSetting]
  );

  return {
    settings,
    scoringMode: settings.scoringMode,
    setScoringMode,
    soundsEnabled: settings.soundsEnabled !== false,
    setSoundsEnabled,
    soundVolume: clampVolume(settings.soundVolume),
    setSoundVolume,
    setSetting,
    loaded,
    isPerDartMode: settings.scoringMode === SCORING_MODES.PER_DART,
  };
}
