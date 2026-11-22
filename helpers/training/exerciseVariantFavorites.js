/**
 * Ulubione / ostatnie na poziomie wariantu ćwiczenia.
 * Zegar i Bob's = osobne exerciseKey. 9/18 i Scoring z presją = ten sam key + variant.
 */

import {
	BOBS_NAME,
	BOBS_VARIANTS,
	bobsPlayDefinition,
	bobsVariantId,
	isBobsKey,
} from './bobs27Group.js';
import {
	CLOCK_NAME,
	CLOCK_VARIANTS,
	clockPlayDefinition,
	clockVariantId,
	isClockKey,
} from './clockGroup.js';
import { NINE_DARTS_VARIANTS } from './nineDartsExercise.js';
import { SCORING_PRESSURE_VARIANTS } from './scoringUnderPressureExercise.js';

export function normalizeFavoriteVariant(variant) {
	if (variant == null || variant === '') {
		return '';
	}
	return String(variant);
}

export function favoriteItemKey(item) {
	if (item?.kind && item.kind !== 'exercise') {
		return item?.key || `${item.kind}:${item.id}`;
	}
	const exerciseKey = item?.exerciseKey || item?.id;
	const variant = normalizeFavoriteVariant(item?.variant);
	if (!exerciseKey) {
		return item?.key || `${item?.kind}:${item?.id}`;
	}
	return variant ? `exercise:${exerciseKey}:${variant}` : `exercise:${exerciseKey}`;
}

export function variantLabelFor(exerciseKey, variant) {
	const value = normalizeFavoriteVariant(variant);
	if (isClockKey(exerciseKey)) {
		return CLOCK_VARIANTS.find((row) => row.exerciseKey === exerciseKey)?.label ?? null;
	}
	if (isBobsKey(exerciseKey)) {
		return BOBS_VARIANTS.find((row) => row.exerciseKey === exerciseKey)?.label ?? null;
	}
	if (exerciseKey === 'nine_darts') {
		return NINE_DARTS_VARIANTS.find((row) => row.id === value)?.label ?? (value || null);
	}
	if (exerciseKey === 'scoring_under_pressure') {
		return SCORING_PRESSURE_VARIANTS.includes(value) ? value : (value || null);
	}
	return value || null;
}

export function exerciseDisplayName(exerciseKey, variant, fallbackName) {
	if (isClockKey(exerciseKey)) {
		const label = variantLabelFor(exerciseKey, variant);
		return label ? `${CLOCK_NAME} — ${label}` : CLOCK_NAME;
	}
	if (isBobsKey(exerciseKey)) {
		const label = variantLabelFor(exerciseKey, variant);
		return label ? `${BOBS_NAME} — ${label}` : BOBS_NAME;
	}
	const base = fallbackName
		|| (exerciseKey === 'nine_darts' ? '9/18 lotek' : null)
		|| (exerciseKey === 'scoring_under_pressure' ? 'Scoring z presją' : null)
		|| exerciseKey;
	const label = variantLabelFor(exerciseKey, variant);
	if (label && (exerciseKey === 'nine_darts' || exerciseKey === 'scoring_under_pressure')) {
		return `${base} — ${label}`;
	}
	return base;
}

/** Ćwiczenia z wariantami na ekranie szczegółów (serduszka przy opcjach). */
export function hasDetailVariantFavorites(item) {
	const key = item?.exerciseKey;
	return Boolean(
		isClockKey(key)
		|| isBobsKey(key)
		|| key === 'nine_darts'
		|| key === 'scoring_under_pressure',
	);
}

export function detailVariantOptions(item) {
	const key = item?.exerciseKey;
	if (isClockKey(key)) {
		return CLOCK_VARIANTS.map((row) => ({
			id: row.id,
			label: row.label,
			exerciseKey: row.exerciseKey,
			variant: '',
		}));
	}
	if (isBobsKey(key)) {
		return BOBS_VARIANTS.map((row) => ({
			id: row.id,
			label: row.label,
			exerciseKey: row.exerciseKey,
			variant: '',
		}));
	}
	if (key === 'nine_darts') {
		return NINE_DARTS_VARIANTS.map((row) => ({
			id: row.id,
			label: row.label,
			exerciseKey: 'nine_darts',
			variant: row.id,
		}));
	}
	if (key === 'scoring_under_pressure') {
		return SCORING_PRESSURE_VARIANTS.map((row) => ({
			id: row,
			label: row,
			exerciseKey: 'scoring_under_pressure',
			variant: row,
		}));
	}
	return [];
}

export function isVariantFavorited(favorites, exerciseKey, variant = '') {
	const want = normalizeFavoriteVariant(variant);
	const list = Array.isArray(favorites) ? favorites : [];
	return list.some((row) => (
		(row?.exerciseKey === exerciseKey || row?.id === exerciseKey)
		&& normalizeFavoriteVariant(row?.variant) === want
		&& row?.favorite !== false
	));
}

export function decorateFavoriteExercise(item) {
	if (!item || item.kind !== 'exercise') {
		return item;
	}
	const exerciseKey = item.exerciseKey || item.id;
	return {
		...item,
		exerciseKey,
		variant: normalizeFavoriteVariant(item.variant) || null,
		name: exerciseDisplayName(exerciseKey, item.variant, item.name),
		key: favoriteItemKey({ ...item, exerciseKey }),
	};
}

export function decorateFavoriteExercises(items) {
	return (Array.isArray(items) ? items : []).map(decorateFavoriteExercise);
}

/** Parametry nawigacji do gry z kafelka ulubionych/ostatnich. */
export function playRouteFromFavoriteItem(item) {
	if (!item || item.kind !== 'exercise') {
		return null;
	}
	const exerciseKey = item.exerciseKey || item.id;
	const variant = normalizeFavoriteVariant(item.variant);
	let definition = {
		...item,
		id: exerciseKey,
		exerciseKey,
		kind: 'exercise',
		name: exerciseDisplayName(exerciseKey, variant, item.name),
	};
	if (isClockKey(exerciseKey)) {
		definition = clockPlayDefinition(definition, clockVariantId(exerciseKey));
	} else if (isBobsKey(exerciseKey)) {
		definition = bobsPlayDefinition(definition, bobsVariantId(exerciseKey));
	}
	return {
		screen: 'TrainingExercise',
		params: {
			definition,
			variant: (exerciseKey === 'nine_darts' || exerciseKey === 'scoring_under_pressure')
				? (variant || undefined)
				: undefined,
		},
	};
}
