import { isVisitComplete } from './visitUtils.js';

/** Revision z surowej odpowiedzi turniejowej (group / playoff). */
export function computeTournamentStateRevision(state) {
	if (!state) {
		return 0;
	}

	// Po zamknięciu lega currentLeg jest null — revision musi rosnąć dalej
	// (max id otwartego lub zakończonego lega + liczba wygranych legów).
	const legIds = [
		state.currentLeg?.id ?? 0,
		...(state.legs ?? []).map((leg) => leg.id ?? 0),
	];
	const legToken = Math.max(0, ...legIds);

	let rev =
		legToken * 1_000_000 +
		(state.game?.player1LegsWon ?? 0) * 10_000 +
		(state.game?.player2LegsWon ?? 0) * 1_000 +
		(state.legs ?? []).length * 500_000;

	const visits = state.visits ?? [];
	for (const v of visits) {
		const visitId = v.id ?? v.visitNumber ?? 0;
		rev +=
			visitId * 1_000 +
			(v.dartsInVisit ?? 0) * 10 +
			Math.min(v.score ?? 0, 180);
	}

	if (state.game?.status === 'finished') {
		rev += 999_999_999;
	}

	return rev;
}

/** Revision z surowej odpowiedzi quick game FFA. */
export function computeFfaStateRevision(state) {
	if (!state) {
		return 0;
	}

	const sessionVersion = state.session?.stateVersion ?? 0;
	let rev = sessionVersion * 1_000_000;

	const visits = state.visits ?? [];
	visits.forEach((v, index) => {
		const visitId = v.id ?? v.visitNumber ?? index + 1;
		rev +=
			visitId * 1_000 +
			(v.dartsInVisit ?? 0) * 10 +
			Math.min(v.score ?? 0, 180);
	});

	const legsToWin = state.session?.legsToWin ?? state.game?.legsToWin ?? 0;
	const maxLegsWon = (state.players ?? []).reduce(
		(max, p) => Math.max(max, p.legsWon ?? 0),
		0,
	);
	rev += maxLegsWon * 10_000 + legsToWin;

	if (state.session?.status === 'finished' || state.game?.status === 'finished') {
		rev += 999_999_999;
	}

	return rev;
}

/** Revision API (surowy) lub znormalizowanego stanu meczu. */
export function computeStateRevision(state) {
	if (!state) {
		return 0;
	}

	if (state.session) {
		return computeFfaStateRevision(state);
	}

	if (state.game?.kind) {
		return computeTournamentStateRevision(state);
	}

	if (state.format !== 'h2h' && state.format !== 'ffa') {
		return 0;
	}

	let rev = (state.currentLeg?.id ?? 0) * 1_000_000;
	rev += (state.meta?.legsToWin ?? 0) * 100;
	rev += (state.turn?.legNumber ?? 0) * 10;

	const visits = state.visits ?? [];
	visits.forEach((v, index) => {
		const visitId = v.id ?? v.visitNumber ?? index + 1;
		rev += visitId * 100;
		if (isVisitComplete(v)) {
			rev += Math.min(v.score ?? 0, 180);
		} else {
			rev += (v.dartsInVisit ?? 0) * 10;
		}
	});

	const maxLegsWon = (state.players ?? []).reduce(
		(max, p) => Math.max(max, p.legsWon ?? 0),
		0,
	);
	rev += maxLegsWon * 10_000;

	if (state.meta?.status === 'finished') {
		rev += 999_999_999;
	}

	return rev;
}
