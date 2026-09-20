/**
 * Patch StyleSheet.create — wszystkie StyleSheet-y aplikacji dostają skalę tabletu.
 * Importuj jako side-effect NA POCZĄTKU App.js (po gesture-handler, przed resztą UI).
 */
import { StyleSheet } from 'react-native';
import { getUiScale } from './uiScale';
import { scaleStyles } from './uiScaleMath';

const INSTALLED = '__twentysixUiScaleInstalled';

export function installUiScale() {
	if (StyleSheet[INSTALLED]) {
		return;
	}
	const originalCreate = StyleSheet.create.bind(StyleSheet);
	StyleSheet.create = (styles) => originalCreate(scaleStyles(styles, getUiScale()));
	StyleSheet.createUnscaled = originalCreate;
	StyleSheet[INSTALLED] = true;
}

installUiScale();
