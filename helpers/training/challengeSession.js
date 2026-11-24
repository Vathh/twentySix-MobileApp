/**
 * Przebieg wyzwania: jak event — tylko ćwiczenia, bez pauzy i bez pomijania.
 */

import {
	advanceHang,
	aimsFromCompletion,
	emptyPlanHang,
	finalizeHang,
	mergeAims,
	planItemAt,
	recordExerciseResult,
	slotToExerciseDefinition,
	slotVariant,
} from './planSession.js';

export function challengeItems(definition) {
	return (Array.isArray(definition?.items) ? definition.items : []).filter((row) => row?.kind === 'exercise');
}

export function challengeAsPlan(definition) {
	return {
		...definition,
		items: challengeItems(definition),
	};
}

export function emptyChallengeHang(definition, clientSessionId, inputMode) {
	const plan = challengeAsPlan(definition);
	const hang = emptyPlanHang(plan, clientSessionId, inputMode);
	return {
		...hang,
		definition,
		definitionId: definition.id,
	};
}

export function recordChallengeExercise(hang, item, completion) {
	const withResult = recordExerciseResult(hang, item, completion, 'completed');
	return advanceHang({
		...withResult,
		plan: hang.plan || challengeAsPlan(hang.definition),
	});
}

export function finalizeChallengeHang(hang, completedAt = new Date().toISOString()) {
	const planHang = {
		...hang,
		plan: hang.plan || challengeAsPlan(hang.definition),
	};
	const done = finalizeHang(planHang, completedAt);
	return {
		...done,
		definitionId: hang.definitionId || hang.definition?.id,
		summary: {
			...done.summary,
			kind: 'challenge',
			name: hang.definition?.name || hang.plan?.name,
			definitionId: hang.definitionId || hang.definition?.id,
		},
	};
}

export function challengeProgressLabel(index, total) {
	const n = Math.max(0, Number(index) || 0) + 1;
	const m = Math.max(0, Number(total) || 0);
	return `${n}/${m}`;
}

export function canPlayChallenge(definition) {
	return Boolean(
		definition
		&& definition.kind === 'challenge'
		&& definition.inactive !== true
		&& challengeItems(definition).length > 0,
	);
}

export {
	planItemAt,
	slotToExerciseDefinition,
	slotVariant,
	aimsFromCompletion,
	mergeAims,
};
