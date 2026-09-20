import { Dimensions } from 'react-native';
import { computeUiScale, scaleNumeric } from './uiScaleMath';

function windowShortestSide() {
	const { width, height } = Dimensions.get('window');
	return Math.min(width, height);
}

export function getUiScale() {
	return computeUiScale(windowShortestSide());
}

/** Skaluje dp (font, padding, ikona). Na telefonie zwraca wartość bez zmian. */
export function scaleSize(size) {
	return scaleNumeric(size, getUiScale());
}
