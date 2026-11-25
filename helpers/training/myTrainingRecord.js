/**
 * Wybór „Mój rekord” dla ekranu startu (ćwiczenie / plan / wyzwanie / event).
 */

import { BOBS_VARIANTS, isBobsKey } from './bobs27Group.js';
import { CLOCK_VARIANTS, isClockKey } from './clockGroup.js';
import { normalizeFavoriteVariant } from './exerciseVariantFavorites.js';

export function resolvePlayExerciseKey(item, { clockVariant, bobsVariant } = {}) {
	if (!item || item.kind !== 'exercise') {
		return null;
	}
	if (isClockKey(item.exerciseKey)) {
		return CLOCK_VARIANTS.find((row) => row.id === clockVariant)?.exerciseKey
			?? item.exerciseKey;
	}
	if (isBobsKey(item.exerciseKey)) {
		return BOBS_VARIANTS.find((row) => row.id === bobsVariant)?.exerciseKey
			?? item.exerciseKey;
	}
	return item.exerciseKey || item.id || null;
}

export function resolvePlayVariant(item, { dartVariant, pressureVariant } = {}) {
	if (!item || item.kind !== 'exercise') {
		return '';
	}
	if (item.exerciseKey === 'nine_darts') {
		return normalizeFavoriteVariant(dartVariant) || '9';
	}
	if (item.exerciseKey === 'scoring_under_pressure') {
		return normalizeFavoriteVariant(pressureVariant) || '20';
	}
	return '';
}

/**
 * @returns {number|null} najlepszy wynik lub null gdy brak
 */
export function pickMyRecordScore(bundle, item, options = {}) {
	if (!item || !bundle) {
		return null;
	}
	if (item.kind === 'exercise') {
		const exerciseKey = resolvePlayExerciseKey(item, options);
		if (!exerciseKey) {
			return null;
		}
		const variant = resolvePlayVariant(item, options);
		const items = Array.isArray(bundle.items) ? bundle.items : [];
		const exact = items.find((row) => (
			row?.exerciseKey === exerciseKey
			&& normalizeFavoriteVariant(row?.variant) === variant
		));
		if (exact && Number.isFinite(Number(exact.score))) {
			return Number(exact.score);
		}
		if (!variant) {
			const any = items.find((row) => row?.exerciseKey === exerciseKey);
			if (any && Number.isFinite(Number(any.score))) {
				return Number(any.score);
			}
		}
		return null;
	}

	const definitionId = Number(item.id);
	if (!Number.isFinite(definitionId)) {
		return null;
	}
	const definitions = Array.isArray(bundle.definitions) ? bundle.definitions : [];
	const row = definitions.find((entry) => Number(entry?.definitionId) === definitionId);
	if (row && Number.isFinite(Number(row.score))) {
		return Number(row.score);
	}
	return null;
}

export function formatMyRecordLabel(score, { placeholder = false } = {}) {
	if (score == null || !Number.isFinite(Number(score))) {
		return placeholder ? 'Mój rekord: —' : null;
	}
	return `Mój rekord: ${Number(score)}`;
}
