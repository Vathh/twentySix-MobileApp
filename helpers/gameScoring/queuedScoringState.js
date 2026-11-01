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

function startingScoreOf(raw) {
	const format = raw?.game?.matchFormat ?? raw?.meta?.matchFormat;
	const value = Number(
		format?.startingScore
		?? raw?.game?.startingScore
		?? raw?.meta?.startingScore
		?? raw?.session?.startingScore
		?? 501,
	);
	return Number.isFinite(value) && value > 0 ? value : 501;
}

function withClosedLeg(raw) {
	const players = raw.players ?? [];
	const n = players.length > 0 ? players.length : 2;
	const opener = Number(raw.turn?.legOpenerIndex ?? raw.legOpenerIndex ?? 0);
	const safeOpener = Number.isInteger(opener) && opener >= 0 && opener < n ? opener : 0;
	const nextOpener = (safeOpener + 1) % n;
	const startingScore = startingScoreOf(raw);
	const closedLegNumber = Number(raw.currentLeg?.legNumber ?? raw.turn?.legNumber ?? 0);

	return {
		...raw,
		currentLeg: null,
		pendingClosedLegId: raw.currentLeg.id,
		visits: [],
		legOpenerIndex: nextOpener,
		turn: {
			...(raw.turn ?? {}),
			currentPlayerIndex: nextOpener,
			legOpenerIndex: nextOpener,
			legNumber: closedLegNumber + 1,
		},
		players: players.map((player) => ({
			...player,
			remaining: startingScore,
		})),
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
	if (entry.op === 'closeLeg' && raw.currentLeg) {
		if (raw.currentLeg.id == null) {
			return bumpSessionVersion({
				...raw,
				currentLeg: null,
				pendingClosedLegId: raw.currentLeg.id,
			});
		}
		return bumpSessionVersion(withClosedLeg(raw));
	}
	return raw;
}

export function replayOutboxOnRawState(raw, entries) {
	return (entries ?? []).reduce(
		(state, entry) => patchRawStateWithEntry(state, entry) ?? state,
		raw,
	);
}
