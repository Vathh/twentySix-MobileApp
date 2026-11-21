/**
 * Przebieg eventu: jak plan, ale tylko ćwiczenia, bez pauzy/pomijania.
 * Hang trzyma exerciseSession (z lotkami) do wznowienia po crashu.
 */

import {
	advanceHang,
	aimsFromCompletion,
	finalizeHang,
	mergeAims,
	planItemAt,
	recordExerciseResult,
	slotToExerciseDefinition,
} from './planSession.js';

export function eventItems(event) {
	return (Array.isArray(event?.items) ? event.items : []).filter((row) => row?.kind === 'exercise');
}

export function eventAsPlan(event) {
	return {
		...event,
		items: eventItems(event),
	};
}

export function recordEventExercise(hang, item, completion) {
	const withResult = recordExerciseResult(hang, item, completion, 'completed');
	return advanceHang({
		...withResult,
		plan: hang.plan || hang.event,
	});
}

export function finalizeEventHang(hang, completedAt = new Date().toISOString()) {
	const planHang = {
		...hang,
		plan: hang.plan || hang.event,
		clientSessionId: hang.clientAttemptId,
	};
	const done = finalizeHang(planHang, completedAt);
	return {
		...done,
		clientAttemptId: hang.clientAttemptId,
		summary: {
			...done.summary,
			clientSessionId: hang.clientAttemptId,
			kind: 'event',
			name: hang.event?.name || hang.plan?.name,
		},
	};
}

export function eventProgressLabel(index, total) {
	const n = Math.max(0, Number(index) || 0) + 1;
	const m = Math.max(0, Number(total) || 0);
	return `${n}/${m}`;
}

export { planItemAt, slotToExerciseDefinition, aimsFromCompletion, mergeAims };
