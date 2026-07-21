/**
 * twentySix mobile — aktywna paleta kolorów.
 *
 * Aktywny motyw: Arena Dark.
 * Purple Night zostaje w theme/palettes/ (i ThemePicker) na przyszły wybór użytkownika.
 *
 * StyleSheet przechowuje wartości przy starcie — po setColorTheme() zrób DevSettings.reload().
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import purpleNight from './palettes/purpleNight';
import arenaDark from './palettes/arenaDark';

export const THEME_STORAGE_KEY = '@twentysix/color_theme';

export const DEFAULT_THEME_ID = 'arena-dark';

export const THEME_OPTIONS = [
	{ id: 'arena-dark', label: 'Arena Dark', description: 'Charcoal + amber (domyślny)' },
	{ id: 'purple-night', label: 'Purple Night', description: 'Fiolet + amber' },
];

const PALETTES = {
	'purple-night': purpleNight,
	'arena-dark': arenaDark,
};

/** Mutowalny obiekt — ten sam referencyjnie; initTheme() podmienia wartości przed StyleSheet. */
export const colors = { ...arenaDark, __themeId: DEFAULT_THEME_ID };

export function getActiveThemeId() {
	return colors.__themeId === 'purple-night' ? 'purple-night' : 'arena-dark';
}

export function applyTheme(themeId) {
	const id = themeId === 'purple-night' ? 'purple-night' : 'arena-dark';
	const palette = PALETTES[id];
	Object.assign(colors, palette, { __themeId: id });
	return id;
}

export async function initTheme() {
	try {
		const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
		// Na razie zawsze Arena Dark; zapisany wybór przyda się, gdy wróci ThemePicker w UI.
		applyTheme(DEFAULT_THEME_ID);
		if (stored !== DEFAULT_THEME_ID) {
			await AsyncStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME_ID);
		}
	} catch {
		applyTheme(DEFAULT_THEME_ID);
	}
	return getActiveThemeId();
}

/** Zapis + apply. Po wywołaniu zrób DevSettings.reload(), żeby StyleSheet się odświeżył. */
export async function setColorTheme(themeId) {
	const id = applyTheme(themeId);
	await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
	return id;
}

export default colors;
