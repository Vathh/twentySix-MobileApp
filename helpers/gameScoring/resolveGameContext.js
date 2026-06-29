import {
	getGroupGameScoringBaseUrl,
	getPlayoffGameScoringBaseUrl,
} from '../apiConfig';
import { normalizeTournamentPlayers } from '../normalizeTournamentPlayers';
import { createFfaTransport } from './transports/createFfaTransport.js';
import { createTournamentTransport } from './transports/createTournamentTransport.js';

export const GAME_MODE = {
	TRAINING: 'training',
	QUICK_FFA: 'quick_ffa',
	TOURNAMENT: 'tournament',
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
 */
export function resolveGameContext(routeParams, auth) {
	const trainingGame = routeParams?.trainingGame ?? null;
	const quickGame = routeParams?.quickGame ?? null;
	const tournamentGame = routeParams?.game ?? null;

	const isTraining = !!trainingGame;
	const isQuick = !!quickGame && !isTraining;
	const isTournament = !!tournamentGame?.id;

	let mode = GAME_MODE.TRAINING;
	if (isTournament) {
		mode = GAME_MODE.TOURNAMENT;
	} else if (isQuick) {
		mode = GAME_MODE.QUICK_FFA;
	}

	const matchConfig = isTraining ? trainingGame : quickGame;
	const lobbyId = quickGame?.lobbyId ?? null;
	const lobbyScoringMode = matchConfig?.scoringMode ?? 'each_own';
	const isHost = matchConfig?.isHost ?? true;
	const legsToWin = matchConfig?.legsCount ?? 2;

	const players = isTraining || isQuick
		? mapQuickPlayers(matchConfig?.players)
		: tournamentGame
			? normalizeTournamentPlayers(
					tournamentGame.player1,
					tournamentGame.player2,
				)
			: [];

	const N = Math.min(Math.max(players.length, 2), 8);
	const myPlayerIndex = resolveMyPlayerIndex(matchConfig, auth, players);

	const hasOnlineQuick =
		isQuick &&
		!!lobbyId &&
		(quickGame?.gameType === '501' || quickGame?.gameType === undefined);
	const accessToken = auth?.accessToken ?? null;

	let transport = null;
	let reloadKey = null;

	if (isTournament && accessToken) {
		const baseUrl =
			tournamentGame.type === 'playoff'
				? getPlayoffGameScoringBaseUrl(tournamentGame.id)
				: getGroupGameScoringBaseUrl(tournamentGame.id);
		const channelKind =
			tournamentGame.type === 'playoff' ? 'playoff' : 'group';
		transport = createTournamentTransport({
			baseUrl,
			accessToken,
			channelKind,
			gameId: tournamentGame.id,
		});
		reloadKey = tournamentGame.id;
	} else if (hasOnlineQuick && accessToken) {
		transport = createFfaTransport({
			lobbyId,
			accessToken,
			lobbyScoringMode,
			isHost,
			myPlayerIndexFromLobby: myPlayerIndex,
		});
		reloadKey = lobbyId;
	}

	const syncEnabled = transport != null;
	const isLocal = mode === GAME_MODE.TRAINING;
	const showStartModal = isTraining || (isQuick && !syncEnabled);

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
		isLocal,
		syncEnabled,
		showStartModal,
		players,
		N,
		legsToWin,
		transport,
		reloadKey,
		lobbyScoringMode,
		isHost,
		myPlayerIndex,
		tournamentGame: isTournament ? tournamentGame : null,
		activeGame,
		lobbyId,
	};
}
