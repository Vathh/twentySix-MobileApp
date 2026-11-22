/**
 * Drugi zapis tej samej sesji jest tym samym wpisem. Odrzucenie treści nie wchodzi do historii.
 */

const ALREADY_STORED = 'training_session_already_stored';

const REJECTED_REASONS = new Set([
	'training_definition_not_found',
	'training_definition_not_active',
	'training_exercise_not_found',
	'training_dart_log_rejected',
	'training_session_invalid',
	'training_stats_invalid',
	'training_unexpected_field',
]);

export function enqueueCompletion(items, record) {
	const list = Array.isArray(items) ? items : [];
	if (list.some((item) => item && item.clientSessionId === record.clientSessionId)) {
		return list;
	}
	return [...list, record];
}

export function applySyncOutcome(items, clientSessionId, sync, syncReason = null) {
	return (Array.isArray(items) ? items : []).map((item) => (
		item?.clientSessionId === clientSessionId
			? { ...item, sync, syncReason: sync === 'rejected' ? syncReason : null }
			: item
	));
}

function sanitizeAimRows(aims) {
	if (!Array.isArray(aims)) {
		return [];
	}
	return aims
		.filter((row) => row && typeof row.aim === 'string' && row.aim !== '')
		.map((row) => {
			const attempts = Math.max(0, Math.trunc(Number(row.attempts) || 0));
			const hits = Math.min(attempts, Math.max(0, Math.trunc(Number(row.hits) || 0)));
			return { aim: row.aim, attempts, hits };
		})
		.filter((row) => row.attempts > 0);
}

/** Payload planu na serwer: bez surowych stats ćwiczeń (unikamy odrzucenia). */
export function sanitizePlanItems(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	return items.map((row) => {
		const rawScore = row?.score;
		const score = rawScore == null || rawScore === ''
			? null
			: Math.trunc(Number(rawScore));
		const item = {
			position: row.position,
			kind: row.kind,
			status: row.status,
			scored: Boolean(row.scored),
			score: Number.isFinite(score) ? score : null,
			aims: sanitizeAimRows(row.aims),
		};
		if (row.kind === 'exercise') {
			item.exerciseKey = row.exerciseKey ?? null;
		}
		return item;
	});
}

export function sessionBody(record) {
	const body = {
		clientSessionId: record.clientSessionId,
		completedAt: record.completedAt,
		score: record.score == null || record.score === ''
			? null
			: (Number.isFinite(Math.trunc(Number(record.score)))
				? Math.trunc(Number(record.score))
				: record.score),
		stats: record.stats && typeof record.stats === 'object'
			? {
				...record.stats,
				aims: sanitizeAimRows(record.stats.aims),
			}
			: record.stats,
	};
	if (record.exerciseKey) {
		body.exerciseKey = record.exerciseKey;
	} else {
		body.definitionId = record.definitionId;
	}
	if (Array.isArray(record.items)) {
		body.items = sanitizePlanItems(record.items);
	}
	return body;
}

/**
 * @param {{ ok?: boolean, status?: number, data?: { reason?: string } }} response
 * @returns {'synced'|'rejected'|'pending'}
 */
export function syncOutcome(response) {
	const reason = response?.data?.reason;
	if (response?.ok && (response.status === 201 || response.status === 200)) {
		return 'synced';
	}
	if (response?.status === 409 && reason === ALREADY_STORED) {
		return 'synced';
	}
	if ((reason && REJECTED_REASONS.has(reason)) || response?.status === 404) {
		return 'rejected';
	}
	return 'pending';
}

export function syncReason(response) {
	return response?.data?.reason || (response?.status === 404 ? 'not_found' : null);
}

export function syncLabel(sync, reason = null) {
	if (sync === 'synced') {
		return 'Zapisano.';
	}
	if (sync === 'rejected') {
		if (reason === 'training_dart_log_rejected') {
			return 'Nie zapisano. Serwer odrzucił szczegóły lotek.';
		}
		if (
			reason === 'training_session_invalid'
			|| reason === 'training_stats_invalid'
			|| reason === 'training_unexpected_field'
		) {
			return 'Nie zapisano. Dane sesji zostały odrzucone.';
		}
		if (reason === 'training_exercise_not_found') {
			return 'Nie zapisano. Nieznane ćwiczenie w planie.';
		}
		return 'Nie zapisano. Ta treść nie jest już dostępna.';
	}
	return 'Zapisze się po połączeniu.';
}
