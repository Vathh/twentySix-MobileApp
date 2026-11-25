/**
 * Czysta logika bundla rekordów (bez AsyncStorage / API).
 */

import { exerciseDisplayName, normalizeFavoriteVariant } from './exerciseVariantFavorites.js';

export const EMPTY_RECORDS = {
	items: [],
	definitions: [],
};

export function normalizeRecordsBundle(data) {
	return {
		items: Array.isArray(data?.items) ? data.items : [],
		definitions: Array.isArray(data?.definitions) ? data.definitions : [],
		savedAt: typeof data?.savedAt === 'string' ? data.savedAt : null,
	};
}

export function isRecordsCacheStale(bundle, now = Date.now(), ttlMs) {
	if (!bundle?.savedAt) {
		return true;
	}
	const at = Date.parse(bundle.savedAt);
	if (!Number.isFinite(at)) {
		return true;
	}
	return now - at >= ttlMs;
}

/**
 * Wariant jak na backendzie (TrainingRecordsService / TrainingExerciseVariant).
 */
export function normalizeRecordVariant(exerciseKey, raw) {
	const value = normalizeFavoriteVariant(raw);
	if (exerciseKey === 'nine_darts') {
		return value === '18' ? '18' : '9';
	}
	if (exerciseKey === 'scoring_under_pressure') {
		const allowed = ['20', '19', '18', '20/19/18'];
		return allowed.includes(value) ? value : '20';
	}
	// Zegar / Bob's / reszta — wariant w exerciseKey albo go nie ma.
	return null;
}

function scoreValue(score) {
	const n = Number(score);
	return Number.isFinite(n) ? n : null;
}

/**
 * Czysta aktualizacja bundla po ukończeniu sesji.
 */
export function mergeCompletionIntoBundle(bundle, record) {
	const base = normalizeRecordsBundle(bundle);
	const items = [...base.items];
	const definitions = [...base.definitions];
	const achievedAt = typeof record?.completedAt === 'string'
		? record.completedAt
		: new Date().toISOString();

	const considerExercise = (exerciseKey, variantRaw, score, name) => {
		const value = scoreValue(score);
		if (!exerciseKey || value == null) {
			return;
		}
		const variant = normalizeRecordVariant(exerciseKey, variantRaw);
		const want = normalizeFavoriteVariant(variant);
		const index = items.findIndex((row) => (
			row?.exerciseKey === exerciseKey
			&& normalizeFavoriteVariant(row?.variant) === want
		));
		const label = exerciseDisplayName(exerciseKey, variant, name || exerciseKey);
		if (index >= 0) {
			if (value > Number(items[index].score)) {
				items[index] = {
					...items[index],
					score: value,
					achievedAt,
					name: label,
					variant: variant || null,
				};
			}
			return;
		}
		items.push({
			exerciseKey,
			variant: variant || null,
			name: label,
			score: value,
			achievedAt,
		});
	};

	const considerDefinition = (definitionId, kind, score) => {
		const id = Number(definitionId);
		const value = scoreValue(score);
		if (!Number.isFinite(id) || id <= 0 || value == null) {
			return;
		}
		const index = definitions.findIndex((row) => Number(row?.definitionId) === id);
		if (index >= 0) {
			if (value > Number(definitions[index].score)) {
				definitions[index] = {
					...definitions[index],
					score: value,
					achievedAt,
					kind: kind || definitions[index].kind,
				};
			}
			return;
		}
		definitions.push({
			definitionId: id,
			kind: kind || 'plan',
			score: value,
			achievedAt,
		});
	};

	if (record?.exerciseKey) {
		considerExercise(
			record.exerciseKey,
			record.variant ?? record.stats?.variant,
			record.score,
			record.name,
		);
	}

	const kind = record?.kind
		|| record?.summary?.kind
		|| (record?.definitionId && !record?.exerciseKey ? 'plan' : null);
	if (record?.definitionId && !record?.exerciseKey) {
		considerDefinition(record.definitionId, kind, record.score);
	}

	const slots = Array.isArray(record?.items) ? record.items : [];
	for (const slot of slots) {
		if (slot?.kind !== 'exercise' || slot?.status !== 'completed') {
			continue;
		}
		considerExercise(
			slot.exerciseKey,
			slot.variant ?? slot.stats?.variant,
			slot.score,
			slot.name,
		);
	}

	items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pl')
		|| String(a.variant || '').localeCompare(String(b.variant || '')));
	definitions.sort((a, b) => Number(a.definitionId) - Number(b.definitionId));

	return {
		items,
		definitions,
		savedAt: base.savedAt,
	};
}
