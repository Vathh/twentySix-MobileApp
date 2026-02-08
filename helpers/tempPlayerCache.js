import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@QuickGame_temp_player_names';
const MAX_NAMES = 20;

export const getCachedTempNames = async () => {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    if (!json) return [];
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const addCachedTempName = async (name) => {
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  try {
    const list = await getCachedTempNames();
    const filtered = list.filter((n) => n !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, MAX_NAMES);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('tempPlayerCache add failed', e);
  }
};
