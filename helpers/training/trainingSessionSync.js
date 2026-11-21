/**
 * Drugi zapis tej samej sesji jest tym samym wpisem. Odrzucenie treści nie wchodzi do historii.
 */

const ALREADY_STORED = 'training_session_already_stored';

const REJECTED_REASONS = new Set([
	'training_definition_not_active',
	'training_definition_not_found',
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

export function applySyncOutcome(items, clientSessionId, sync) {
	return (Array.isArray(items) ? items : []).map((item) => (
		item?.clientSessionId === clientSessionId ? { ...item, sync } : item
	));
}

export function sessionBody(record) {
	const body = {
		clientSessionId: record.clientSessionId,
		completedAt: record.completedAt,
		score: record.score,
		stats: record.stats,
	};
	if (record.exerciseKey) {
		body.exerciseKey = record.exerciseKey;
	} else {
		body.definitionId = record.definitionId;
	}
	if (Array.isArray(record.items)) {
		body.items = record.items;
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

export function syncLabel(sync) {
	if (sync === 'synced') {
		return 'Zapisano.';
	}
	if (sync === 'rejected') {
		return 'Nie zapisano. Ta treść nie jest już dostępna.';
	}
	return 'Zapisze się po połączeniu.';
}
