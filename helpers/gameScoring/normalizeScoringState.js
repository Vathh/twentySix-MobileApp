import {
	computeFfaStateRevision,
	computeStateRevision,
	computeTournamentStateRevision,
} from './computeStateRevision.js';
import { inferCurrentPlayerIndex } from './inferCurrentPlayerIndex.js';
import { pid } from './pid.js';
import { normalizeMatchFormat } from '../matchFormat/matchFormat.js';

const TOURNAMENT_KIND_MAP = {
	group: 'tournament_group',
	playoff: 'tournament_playoff',
	quick: 'quick_h2h',
};

function mapTournamentPlayer(sp) {
	return {
		playerId: pid(sp.playerId),
		name: sp.name ?? 'Gracz',
		remaining: sp.remaining ?? 501,
		legsWon: sp.legsWon ?? 0,
		legsWonInSet: sp.legsWonInSet ?? sp.legsWon ?? 0,
		setsWon: sp.setsWon ?? 0,
		gameAverage: sp.gameAverage ?? null,
		legAverage: sp.legAverage ?? null,
		legByLegScores: Array.isArray(sp.legByLegScores) ? sp.legByLegScores : undefined,
		legsAverages: Array.isArray(sp.legsAverages) ? sp.legsAverages : undefined,
		dartsPerLeg: Array.isArray(sp.dartsPerLeg) ? sp.dartsPerLeg : undefined,
		matchPointsEarned: sp.matchPointsEarned ?? null,
		matchDartsThrown: sp.matchDartsThrown ?? null,
	};
}

function mapFfaPlayer(sp) {
	return {
		playerId: pid(sp.playerId),
		name: sp.name ?? 'Gracz',
		remaining: sp.remaining ?? 501,
		legsWon: sp.legsWon ?? 0,
		legsWonInSet: sp.legsWonInSet ?? sp.legsWon ?? 0,
		setsWon: sp.setsWon ?? 0,
		gameAverage: sp.gameAverage ?? null,
		legAverage: sp.legAverage ?? null,
		legByLegScores: sp.legByLegScores ?? [],
		legsAverages: sp.legsAverages ?? [],
		dartsPerLeg: sp.dartsPerLeg ?? [],
		matchPointsEarned: sp.matchPointsEarned ?? 0,
		matchDartsThrown: sp.matchDartsThrown ?? 0,
	};
}

function tournamentMetaKind(raw) {
	const kind = raw?.game?.kind;
	return TOURNAMENT_KIND_MAP[kind] ?? 'tournament_group';
}

function tournamentStatus(raw) {
	return raw?.game?.status === 'finished' ? 'finished' : 'in_progress';
}

function ffaStatus(raw) {
	if (raw?.session?.status === 'finished' || raw?.game?.status === 'finished') {
		return 'finished';
	}
	return 'in_progress';
}

/**
 * @param {object} raw — odpowiedź GameScoringStateBuilder (group / playoff)
 * @param {Array} uiPlayers — opcjonalna kolejność graczy z UI (do inferencji tury)
 */
export function fromTournamentState(raw, uiPlayers = []) {
	if (!raw) {
		return null;
	}

	const visits = raw.visits ?? [];
	const N = Math.max(uiPlayers.length, raw.players?.length ?? 2, 2);
	const legNumber = raw.currentLeg?.legNumber ?? null;
	const legOpen = raw.currentLeg?.open ?? false;
	const legOpenerIndex =
		raw.turn?.legOpenerIndex ?? raw.legOpenerIndex ?? 0;

	const turn = {
		currentPlayerIndex: inferCurrentPlayerIndex({
			players: uiPlayers.length ? uiPlayers : raw.players ?? [],
			N,
			visits,
			explicitIndex: null,
			legOpenerIndex,
			legOpen,
		}),
		legOpenerIndex,
		legNumber: legNumber ?? 0,
	};

	const matchFormat = normalizeMatchFormat(
		raw.game?.matchFormat ?? raw.meta?.matchFormat ?? {
			startingScore: raw.game?.startingScore,
		},
	);

	return {
		format: 'h2h',
		revision: computeTournamentStateRevision(raw),
		meta: {
			kind: tournamentMetaKind(raw),
			matchFormat,
			startingScore: matchFormat.startingScore,
			currentSetNumber: raw.game?.currentSetNumber ?? 1,
			gameId: raw.game?.id ?? null,
			lobbyId: null,
			tournamentId: raw.game?.tournamentId ?? null,
			quickGameId: null,
			status: tournamentStatus(raw),
		},
		turn,
		currentLeg: raw.currentLeg
			? {
					id: raw.currentLeg.id ?? null,
					legNumber: raw.currentLeg.legNumber ?? 0,
					open: !!raw.currentLeg.open,
				}
			: null,
		players: (raw.players ?? []).map(mapTournamentPlayer),
		visits,
	};
}

/**
 * @param {object} raw — odpowiedź QuickGameFfaStateBuilder
 * @param {Array} uiPlayers
 */
export function fromFfaState(raw, uiPlayers = []) {
	if (!raw) {
		return null;
	}

	const visits = raw.visits ?? [];
	const session = raw.session ?? {};
	const N = Math.max(uiPlayers.length, raw.players?.length ?? 2, 2);
	const legNumber =
		session.currentLegNumber ?? raw.currentLeg?.legNumber ?? 0;
	const legOpen = raw.currentLeg?.open ?? session.status === 'in_progress';

	const explicitIndex =
		session.currentPlayerIndex != null
			? Number(session.currentPlayerIndex)
			: null;

	const turn = {
		currentPlayerIndex: inferCurrentPlayerIndex({
			players: uiPlayers.length ? uiPlayers : raw.players ?? [],
			N,
			visits,
			explicitIndex,
			legOpenerIndex:
				session.legOpenerIndex != null
					? Number(session.legOpenerIndex)
					: 0,
			legOpen,
		}),
		legOpenerIndex:
			session.legOpenerIndex != null ? Number(session.legOpenerIndex) : 0,
		legNumber,
	};

	const matchFormat = normalizeMatchFormat(
		session.matchFormat ?? raw.game?.matchFormat ?? {
			startingScore: session.startingScore,
			legsToWinSet: session.legsToWinSet,
			setsToWinMatch: session.setsToWinMatch,
		},
	);

	return {
		format: 'ffa',
		revision: computeFfaStateRevision(raw),
		meta: {
			kind: 'quick_ffa',
			matchFormat,
			startingScore: matchFormat.startingScore,
			currentSetNumber: session.currentSetNumber ?? 1,
			gameId: raw.game?.id ?? null,
			lobbyId: session.lobbyId ?? null,
			tournamentId: null,
			quickGameId: session.quickGameId ?? null,
			status: ffaStatus(raw),
		},
		turn,
		currentLeg: raw.currentLeg
			? {
					id: raw.currentLeg.id ?? null,
					legNumber: raw.currentLeg.legNumber ?? legNumber,
					open: !!raw.currentLeg.open,
				}
			: legOpen
				? { id: null, legNumber, open: true }
				: null,
		players: (raw.players ?? []).map(mapFfaPlayer),
		visits,
	};
}

/** Auto-wykrywa format surowej odpowiedzi API. */
export function normalizeScoringState(raw, uiPlayers = []) {
	if (!raw) {
		return null;
	}
	if (raw.format === 'h2h' || raw.format === 'ffa') {
		if (raw.meta && raw.turn) {
			return {
				format: raw.format,
				revision: raw.revision ?? computeStateRevision(raw),
				meta: raw.meta,
				turn: raw.turn,
				currentLeg: raw.currentLeg ?? null,
				players: (raw.players ?? []).map(
					raw.format === 'ffa' ? mapFfaPlayer : mapTournamentPlayer,
				),
				visits: raw.visits ?? [],
			};
		}
		return raw;
	}
	if (raw.session) {
		return fromFfaState(raw, uiPlayers);
	}
	return fromTournamentState(raw, uiPlayers);
}

export function isNormalizedScoringState(state) {
	return state != null && (state.format === 'h2h' || state.format === 'ffa');
}
