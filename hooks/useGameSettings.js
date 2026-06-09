import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@match_settings';
const SCORING_MODES = {
  SUM: 'sum',
  PER_DART: 'per_dart',
};

const DEFAULT_SETTINGS = {
  scoringMode: SCORING_MODES.SUM,
};

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
            setSettingsState((prev) => ({ ...prev, ...parsed }));
          } catch (e) {
            console.warn('useGameSettings load error', e);
          }
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

  return {
    settings,
    scoringMode: settings.scoringMode,
    setScoringMode,
    setSetting,
    loaded,
    isPerDartMode: settings.scoringMode === SCORING_MODES.PER_DART,
  };
}
