/**
 * Lokalna tablica z payloadu komendy, zanim API potwierdzi zapis.
 * Nie liczy reguł lega — dokleja wizytę i remaining z payloadu.
 */

function withVisit(raw, payload) {
	const visit = {
		playerId: payload.playerId,
		score: payload.score,
		remainingBefore: payload.remainingBefore,
		remainingAfter: payload.remainingAfter,
		dartsInVisit: payload.dartsInVisit ?? 3,
		closedLeg: Boolean(payload.closedLeg),
		bust: Boolean(payload.bust),
		clientVisitId: payload.clientVisitId ?? null,
	};
	const remaining = payload.bust ? payload.remainingBefore : payload.remainingAfter;
	const players = (raw.players ?? []).map((player) =>
		Number(player.playerId) === Number(payload.playerId)
			? { ...player, remaining }
			: player,
	);
	return {
		...raw,
		players,
		visits: [...(raw.visits ?? []), visit],
	};
}

function withUndo(raw) {
	const visits = raw.visits ?? [];
	if (visits.length === 0) {
		return raw;
	}
	const removed = visits[visits.length - 1];
	const players = (raw.players ?? []).map((player) =>
		Number(player.playerId) === Number(removed.playerId)
			? { ...player, remaining: removed.remainingBefore ?? player.remaining }
			: player,
	);
	return {
		...raw,
		players,
		visits: visits.slice(0, -1),
	};
}

function bumpSessionVersion(raw) {
	if (!raw?.session) {
		return raw;
	}
	return {
		...raw,
		session: {
			...raw.session,
			stateVersion: Number(raw.session.stateVersion ?? 0) + 1,
		},
	};
}

export function patchRawStateWithEntry(raw, entry) {
	if (!raw || !entry) {
		return raw;
	}
	if (entry.op === 'recordVisit' && entry.payload) {
		return bumpSessionVersion(withVisit(raw, entry.payload));
	}
	if (entry.op === 'undoVisit') {
		return bumpSessionVersion(withUndo(raw));
	}
	return raw;
}

export function replayOutboxOnRawState(raw, entries) {
	return (entries ?? []).reduce(
		(state, entry) => patchRawStateWithEntry(state, entry) ?? state,
		raw,
	);
}
