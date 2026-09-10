import { normalizeMatchFormat } from '../matchFormat/matchFormat.js';
import {
	getGroupGameScoringBaseUrl,
	getLeagueGameScoringBaseUrl,
	getPlayoffGameScoringBaseUrl,
} from '../apiConfig';
import { normalizeTournamentPlayers } from '../normalizeTournamentPlayers';
import { resolveFfaTransportKind } from './resolveFfaTransportKind.js';
import { createFfaTransport } from './transports/createFfaTransport.js';
import { createTournamentTransport } from './transports/createTournamentTransport.js';

export const GAME_MODE = {
	TRAINING: 'training',
	QUICK_FFA: 'quick_ffa',
	TOURNAMENT: 'tournament',
	LEAGUE: 'league',
};

function mapQuickPlayers(players) {
	return (players ?? []).map((p) => ({
		id: p.id,
		name: p.name ?? 'Gracz',
		playerId: p.playerId != null ? Number(p.playerId) : null,
	}));
}

function resolveMyPlayerIndex(matchConfig, auth, players) {
	if (
		matchConfig?.myPlayerIndex !== undefined &&
		matchConfig?.myPlayerIndex !== null
	) {
		return matchConfig.myPlayerIndex;
	}
	if (auth?.playerId != null) {
		const idx = players.findIndex(
			(p) => p.playerId != null && p.playerId === Number(auth.playerId),
		);
		if (idx >= 0) {
			return idx;
		}
	}
	return null;
}

/**
 * Jedno miejsce na kontekst meczu z parametrów nawigacji.
 * @param {object} options - opcjonalny `getCurrentPlayerIndex()` doprowadzany do transportu FFA,
 *   żeby `assertCanInput` widział aktualną turę (chroni przed race po WS update w trakcie zapisu).
 */
export function resolveGameContext(routeParams, auth, options = {}) {
	const { getCurrentPlayerIndex = null } = options;
	const trainingGame = routeParams?.trainingGame ?? null;
	const quickGame = routeParams?.quickGame ?? null;
	const tournamentGame = routeParams?.game ?? null;

	const isTraining = !!trainingGame;
	const isQuick = !!quickGame && !isTraining;
	const isLeague = tournamentGame?.type === 'league';
	const isTournament = !!tournamentGame?.id && !isLeague;

	let mode = GAME_MODE.TRAINING;
	if (isLeague) {
		mode = GAME_MODE.LEAGUE;
	} else if (isTournament) {
		mode = GAME_MODE.TOURNAMENT;
	} else if (isQuick) {
		mode = GAME_MODE.QUICK_FFA;
	}

	const matchConfig = isTraining ? trainingGame : quickGame;
	const lobbyId = quickGame?.lobbyId ?? null;
	const lobbyScoringMode = matchConfig?.scoringMode ?? 'each_own';
	const isHost = matchConfig?.isHost ?? true;
	const matchFormat = normalizeMatchFormat(
		matchConfig?.matchFormat ?? tournamentGame?.matchFormat,
	);

	const players = isTraining || isQuick
		? mapQuickPlayers(matchConfig?.players)
		: tournamentGame
			? normalizeTournamentPlayers(
					tournamentGame.player1,
					tournamentGame.player2,
				)
			: [];

	const resolvedGameType = String(
		matchFormat?.gameType
			?? quickGame?.gameType
			?? trainingGame?.gameType
			?? 'x01',
	).toLowerCase();
	const minPlayers = mode === GAME_MODE.TRAINING ? 1 : 2;
	const N = Math.min(Math.max(players.length, minPlayers), 8);
	const myPlayerIndex = resolveMyPlayerIndex(matchConfig, auth, players);
	const ffaKind = resolveFfaTransportKind({
		isQuick,
		lobbyId,
		resolvedGameType,
		quickGameType: quickGame?.gameType,
	});
	const accessToken = auth?.accessToken ?? null;

	let transport = null;
	let reloadKey = null;

	if ((isTournament || isLeague) && accessToken) {
		const isPlayoff = tournamentGame.type === 'playoff';
		const baseUrl = isLeague
			? getLeagueGameScoringBaseUrl(tournamentGame.id)
			: isPlayoff
				? getPlayoffGameScoringBaseUrl(tournamentGame.id)
				: getGroupGameScoringBaseUrl(tournamentGame.id);
		const channelKind = isLeague ? 'league' : (isPlayoff ? 'playoff' : 'group');
		transport = createTournamentTransport({
			baseUrl,
			accessToken,
			channelKind,
			gameId: tournamentGame.id,
		});
		reloadKey = tournamentGame.id;
	} else if (ffaKind && accessToken) {
		transport = createFfaTransport({
			kind: ffaKind,
			lobbyId,
			accessToken,
			lobbyScoringMode,
			isHost,
			myPlayerIndexFromLobby: myPlayerIndex,
			getCurrentPlayerIndex,
		});
		reloadKey = lobbyId;
	}

	const syncEnabled = transport != null;
	// Trening: kolejność ustalana na setupie — bez modala „Kto rozpoczyna”.
	const showStartModal = isQuick && !syncEnabled;

	const activeGame = isTraining
		? { id: null, type: 'training', tournamentId: null, groupNumber: null }
		: isQuick
			? {
					id: null,
					type: 'quick_game',
					tournamentId: null,
					groupNumber: null,
				}
			: tournamentGame;

	return {
		mode,
		syncEnabled,
		showStartModal,
		players,
		N,
		matchFormat,
		transport,
		reloadKey,
		lobbyScoringMode,
		isHost,
		myPlayerIndex,
		tournamentGame: (isTournament || isLeague) ? tournamentGame : null,
		activeGame,
		lobbyId,
	};
}
