/**
 * Presety środowiska API (local / staging).
 *
 * Przełączanie:
 * - `.env`: EXPO_PUBLIC_API_TARGET=local|staging
 * - albo skrypt: npm run start:local / npm run start:staging
 *
 * EAS / pełny override: ustaw EXPO_PUBLIC_API_URL (+ opcjonalnie REVERB_*) —
 * wtedy TARGET jest ignorowany.
 */

const RAW_LOCAL_HOST = process.env.EXPO_PUBLIC_LOCAL_HOST?.trim();
// Bez osobistego IP jako cichego domyślnego — brak env = localhost + głośny warning (patrz niżej).
const LOCAL_HOST = RAW_LOCAL_HOST || '127.0.0.1';

const API_PRESETS = {
	local: {
		apiUrl: `http://${LOCAL_HOST}:8000/api`,
		reverbKey: 'sld-reverb-key',
		reverbScheme: 'http',
		reverbPort: 8080,
		reverbHost: LOCAL_HOST,
	},
	staging: {
		apiUrl: 'https://dartscore.studiokam.pl/api',
		reverbKey: '28e001f35df29406bc8a144a39a4ef4a',
		reverbScheme: 'https',
		reverbPort: 443,
		reverbHost: 'dartscore.studiokam.pl',
	},
};

function resolveApiTarget() {
	const raw = (process.env.EXPO_PUBLIC_API_TARGET || '').trim().toLowerCase();
	if (raw === 'local' || raw === 'staging') {
		return raw;
	}
	return null;
}

function resolveEnvConfig() {
	const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
	const target = resolveApiTarget();

	// TARGET wygrywa z pełnym URL w .env (łatwe przełączanie local/staging).
	if (target) {
		const preset = API_PRESETS[target] || API_PRESETS.local;
		return {
			target,
			apiUrl: preset.apiUrl,
			reverbKey:
				process.env.EXPO_PUBLIC_REVERB_APP_KEY?.trim() || preset.reverbKey,
			reverbScheme:
				process.env.EXPO_PUBLIC_REVERB_SCHEME?.trim() || preset.reverbScheme,
			reverbPort:
				process.env.EXPO_PUBLIC_REVERB_PORT?.trim()
				|| String(preset.reverbPort),
			reverbHost:
				process.env.EXPO_PUBLIC_REVERB_HOST?.trim() || preset.reverbHost,
		};
	}

	// Bez TARGET: EAS / custom URL, albo domyślnie local.
	if (explicitApiUrl) {
		return {
			target: 'custom',
			apiUrl: explicitApiUrl,
			reverbKey:
				process.env.EXPO_PUBLIC_REVERB_APP_KEY?.trim() || 'sld-reverb-key',
			reverbScheme: process.env.EXPO_PUBLIC_REVERB_SCHEME?.trim() || '',
			reverbPort: process.env.EXPO_PUBLIC_REVERB_PORT?.trim() || '',
			reverbHost: process.env.EXPO_PUBLIC_REVERB_HOST?.trim() || '',
		};
	}

	const preset = API_PRESETS.local;
	return {
		target: 'local',
		apiUrl: preset.apiUrl,
		reverbKey: preset.reverbKey,
		reverbScheme: preset.reverbScheme,
		reverbPort: String(preset.reverbPort),
		reverbHost: preset.reverbHost,
	};
}

const envConfig = resolveEnvConfig();

if (envConfig.target === 'local' && !RAW_LOCAL_HOST) {
	console.warn(
		'[apiConfig] EXPO_PUBLIC_LOCAL_HOST nie jest ustawione — używam 127.0.0.1, co NIE zadziała z telefonu fizycznego/emulatora w sieci LAN. Ustaw EXPO_PUBLIC_LOCAL_HOST=<IP Twojego komputera w Wi-Fi> w .env (patrz .env.example).',
	);
}

const API_BASE_URL = envConfig.apiUrl;

// Baza URL Laravel (bez /api) – do autoryzacji kanałów WebSocket (broadcasting/auth)
const LARAVEL_BASE_URL =
	API_BASE_URL.replace(/\/api\/?$/, '') || `http://${LOCAL_HOST}:8000`;

// Reverb (WebSocket) – musi być taki sam jak REVERB_APP_KEY w .env backendu
export const REVERB_APP_KEY = envConfig.reverbKey;
export const API_TARGET = envConfig.target;

const REVERB_USE_TLS =
	envConfig.reverbScheme === 'https' || API_BASE_URL.startsWith('https://');
const REVERB_WS_PORT =
	Number(envConfig.reverbPort) || (REVERB_USE_TLS ? 443 : 8080);

const INVALID_CLIENT_WS_HOSTS = new Set(['0.0.0.0', '[::]', '::', '']);

function resolveReverbWsHost() {
	if (envConfig.reverbHost) {
		return envConfig.reverbHost;
	}
	try {
		const u = new URL(API_BASE_URL);
		const host = u.hostname;
		if (INVALID_CLIENT_WS_HOSTS.has(host)) {
			console.warn(
				'[WS/Reverb:config] API_BASE_URL ma host 0.0.0.0 / :: — telefon nie połączy się z Reverb. Ustaw IPv4 komputera w EXPO_PUBLIC_LOCAL_HOST albo EXPO_PUBLIC_REVERB_HOST (np. 192.168.10.94). W backendzie REVERB_HOST=0.0.0.0 jest OK dla serwera; klient musi użyć realnego IP.',
			);
		}
		return host;
	} catch {
		return LOCAL_HOST;
	}
}

const reverbHostResolved = resolveReverbWsHost();

if (typeof __DEV__ !== 'undefined' && __DEV__) {
	console.log(
		`[apiConfig] target=${API_TARGET} api=${API_BASE_URL} ws=${reverbHostResolved}:${REVERB_WS_PORT}`,
	);
}

/** Do diagnostyki na stagingu (RC) — widać w UI, czy env z EAS trafił do APK. */
export const getReverbDiagnostics = () => ({
	apiTarget: API_TARGET,
	apiUrl: API_BASE_URL,
	wsHost: reverbHostResolved,
	wsPort: REVERB_WS_PORT,
	forceTLS: REVERB_USE_TLS,
	keyPrefix: REVERB_APP_KEY.slice(0, 4),
	keyLooksDefault: REVERB_APP_KEY === 'sld-reverb-key',
});

export const getReverbConfig = () => ({
	key: REVERB_APP_KEY,
	wsHost: reverbHostResolved,
	wsPort: REVERB_WS_PORT,
	wssPort: REVERB_WS_PORT,
	forceTLS: REVERB_USE_TLS,
	disableStats: true,
	enabledTransports: ['ws', 'wss'],
	authEndpoint: LARAVEL_BASE_URL + '/broadcasting/auth',
});

const GAME_ENDPOINT = '/game';
const ACTIVE_ENDPOINT = '/active';
const UPDATE_ENDPOINT = '/update';
const GAME_IN_PROGRESS_ENDPOINT = '/inProgress';
const GAME_RELEASE_ENDPOINT = '/release';

const LOGIN_ENDPOINT = '/login';
const ACCOUNT_LOGIN_ENDPOINT = '/account/login';

const AUTHORIZATION_ENDPOINT = '/authorization';
const AUTHORIZATION_AUTHENTICATE_ENDPOINT = '/authenticate';

const LOGOUT_ENDPOINT = '/logout';

// Quick game
const QUICK_GAME_ENDPOINT = '/quick-game';
const QUICK_GAME_UPDATE_ENDPOINT = '/update';

// Quick game lobby
const QUICK_GAME_LOBBY_PREFIX = '/quick-game/lobby';
const LOBBY_CREATE_ENDPOINT = '/create';
const LOBBY_LEAVE = '/leave';
const LOBBY_READY = '/ready';
const LOBBY_START = '/start';
const LOBBY_INVITE = '/invite';

export const AUTHENTICATE_API_URL =
	API_BASE_URL + AUTHORIZATION_ENDPOINT + AUTHORIZATION_AUTHENTICATE_ENDPOINT;

export const LOGOUT_API_URL = API_BASE_URL + LOGOUT_ENDPOINT;

export const LOGIN_API_URL = API_BASE_URL + LOGIN_ENDPOINT;
export const ACCOUNT_LOGIN_API_URL = API_BASE_URL + ACCOUNT_LOGIN_ENDPOINT;
export const ACCOUNT_LOGOUT_API_URL = API_BASE_URL + '/account/logout';
export const ACCOUNT_SESSION_REFRESH_API_URL = API_BASE_URL + '/account/session/refresh';
export const ACCOUNT_CHANGE_PASSWORD_API_URL = API_BASE_URL + '/account/password';
export const REGISTER_API_URL = API_BASE_URL + '/register';
export const RESEND_VERIFICATION_API_URL = API_BASE_URL + '/email/verification-notification';

export const ACTIVE_GAMES_API_URL =
	API_BASE_URL + GAME_ENDPOINT + ACTIVE_ENDPOINT;

export const UPDATE_GAME_API_URL =
	API_BASE_URL + GAME_ENDPOINT + UPDATE_ENDPOINT;

export const GAME_IN_PROGRESS_API_URL =
	API_BASE_URL + GAME_ENDPOINT + GAME_IN_PROGRESS_ENDPOINT;

export const GAME_RELEASE_API_URL =
	API_BASE_URL + GAME_ENDPOINT + GAME_RELEASE_ENDPOINT;

export const QUICK_GAME_UPDATE_API_URL =
	API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_UPDATE_ENDPOINT;
export const QUICK_GAME_LOBBY_CREATE_API_URL =
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + LOBBY_CREATE_ENDPOINT;
export const getQuickGameLobbyUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId;
export const getQuickGameLobbyLeaveUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_LEAVE;
export const getQuickGameLobbyReadyUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_READY;
export const getQuickGameLobbyStartUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_START;
export const getQuickGameLobbyInviteUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_INVITE;
export const QUICK_GAME_LOBBY_INVITATIONS_URL =
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/invitations';
export const getQuickGameLobbyRejectInvitationUrl = (invitationId) =>
	API_BASE_URL +
	QUICK_GAME_LOBBY_PREFIX +
	'/invitations/' +
	invitationId +
	'/reject';
const LOBBY_ADD_GUEST = '/add-guest';
export const getQuickGameLobbyAddGuestUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_ADD_GUEST;
export const getQuickGameLobbyRematchUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/rematch';
export const getQuickGameLobbyRematchIntentUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/rematch/intent';

export const getQuickGameFfaStateUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/state';
export const getQuickGameFfaVisitUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/visits';
export const getQuickGameFfaUndoUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/visits/undo';
export const getQuickGameFfaPresenceUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/presence';
export const getQuickGameFfaAbortUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/abort';
export const getQuickGameFfaCricketVisitUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/cricket/visits';
export const getQuickGameFfaCricketDartUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/cricket/darts';
export const getQuickGameFfaCricketUndoUrl = (lobbyId) =>
	API_BASE_URL +
	QUICK_GAME_LOBBY_PREFIX +
	'/' +
	lobbyId +
	'/ffa/cricket/visits/undo';
export const getQuickGameFfaBob27DartUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/bob27/darts';
export const getQuickGameFfaBob27UndoUrl = (lobbyId) =>
	API_BASE_URL +
	QUICK_GAME_LOBBY_PREFIX +
	'/' +
	lobbyId +
	'/ffa/bob27/darts/undo';
export const getQuickGameFfaAtcVisitUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/atc/visits';
export const getQuickGameFfaAtcUndoUrl = (lobbyId) =>
	API_BASE_URL +
	QUICK_GAME_LOBBY_PREFIX +
	'/' +
	lobbyId +
	'/ffa/atc/visits/undo';
export const getQuickGameFfaCatch40VisitUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/catch40/visits';
export const getQuickGameFfaCatch40UndoUrl = (lobbyId) =>
	API_BASE_URL +
	QUICK_GAME_LOBBY_PREFIX +
	'/' +
	lobbyId +
	'/ffa/catch40/visits/undo';
export const getQuickGameFfaCricket56VisitUrl = (lobbyId) =>
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + '/ffa/cricket56/visits';
export const getQuickGameFfaCricket56UndoUrl = (lobbyId) =>
	API_BASE_URL +
	QUICK_GAME_LOBBY_PREFIX +
	'/' +
	lobbyId +
	'/ffa/cricket56/visits/undo';
export const QUICK_GAME_LOBBY_ACTIVE_MATCH_URL =
	API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/active-match';

// Game scoring (wizyty, legi) — ten sam kontrakt dla quick / group / playoff
const GROUP_GAMES_PREFIX = '/group-games';
const PLAYOFF_GAMES_PREFIX = '/playoff-games';

export const getGroupGameScoringBaseUrl = (gameId) =>
	API_BASE_URL + GROUP_GAMES_PREFIX + '/' + gameId;

export const getPlayoffGameScoringBaseUrl = (playoffGameId) =>
	API_BASE_URL + PLAYOFF_GAMES_PREFIX + '/' + playoffGameId;

const LEAGUE_GAMES_PREFIX = '/league-games';

export const LEAGUE_GAMES_MINE_URL = API_BASE_URL + LEAGUE_GAMES_PREFIX + '/mine';
export const LEAGUE_GAMES_INVITATIONS_URL =
	API_BASE_URL + LEAGUE_GAMES_PREFIX + '/invitations';

export const getLeagueGameUrl = (gameId) =>
	API_BASE_URL + LEAGUE_GAMES_PREFIX + '/' + gameId;

export const getLeagueGameOpenLobbyUrl = (gameId) =>
	getLeagueGameUrl(gameId) + '/open-lobby';

export const getLeagueGameAcceptUrl = (gameId) =>
	getLeagueGameUrl(gameId) + '/accept';

export const getLeagueGameRejectUrl = (gameId) =>
	getLeagueGameUrl(gameId) + '/reject';

export const getLeagueGameCancelUrl = (gameId) =>
	getLeagueGameUrl(gameId) + '/cancel';

export const getLeagueGameStartUrl = (gameId) =>
	getLeagueGameUrl(gameId) + '/start';

export const getLeagueGameScoringBaseUrl = (gameId) =>
	getLeagueGameUrl(gameId);

export const getGameScoringStateUrl = (baseUrl) => baseUrl + '/scoring/state';
export const getGameScoringStartLegUrl = (baseUrl) => baseUrl + '/legs';
export const getGameScoringVisitUrl = (baseUrl, legId) =>
	baseUrl + '/legs/' + legId + '/visits';
export const getGameScoringUndoUrl = (baseUrl, legId) =>
	baseUrl + '/legs/' + legId + '/visits/undo';
export const getGameScoringCloseLegUrl = (baseUrl, legId) =>
	baseUrl + '/legs/' + legId + '/close';

/** Kanał publiczny Pusher: quick-game.{id} | group-game.{id} | playoff-game.{id} | league-game.{id} */
export const getGameScoringChannelName = (kind, gameId) =>
	kind + '-game.' + gameId;
const FRIENDS_PREFIX = '/friends';
export const FRIENDS_API_URL = API_BASE_URL + FRIENDS_PREFIX;
export const FRIENDS_INVITE_URL = FRIENDS_API_URL + '/invite';
export const FRIENDS_ACCEPT_URL = FRIENDS_API_URL + '/accept';
export const FRIENDS_REJECT_URL = FRIENDS_API_URL + '/reject';
export const FRIENDS_REMOVE_URL = FRIENDS_API_URL + '/remove';
export const FRIENDS_INVITATIONS_RECEIVED_URL =
	FRIENDS_API_URL + '/invitations/received';
export const FRIENDS_INVITATIONS_SENT_URL =
	FRIENDS_API_URL + '/invitations/sent';
export const USERS_SEARCH_URL = API_BASE_URL + '/users/search';

export const getPlayerProfileUrl = (playerId) =>
	API_BASE_URL + '/players/' + playerId;
export const getPlayerGamesUrl = (playerId, page = 1) =>
	API_BASE_URL + '/players/' + playerId + '/games?page=' + page;

const TOURNAMENT_INVITATIONS_PREFIX = '/tournaments/invitations';
export const TOURNAMENT_INVITATIONS_RECEIVED_URL =
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/received';
export const getTournamentInvitationAcceptUrl = (invitationId) =>
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/' + invitationId + '/accept';
export const getTournamentInvitationRejectUrl = (invitationId) =>
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/' + invitationId + '/reject';
export const getTournamentInvitationWithdrawUrl = (invitationId) =>
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/' + invitationId + '/withdraw';

const ORGANIZATION_INVITATIONS_PREFIX = '/organizations/invitations';
export const ORGANIZATION_INVITATIONS_RECEIVED_URL =
	API_BASE_URL + ORGANIZATION_INVITATIONS_PREFIX + '/received';
export const getOrganizationInvitationAcceptUrl = (invitationId) =>
	API_BASE_URL + ORGANIZATION_INVITATIONS_PREFIX + '/' + invitationId + '/accept';
export const getOrganizationInvitationRejectUrl = (invitationId) =>
	API_BASE_URL + ORGANIZATION_INVITATIONS_PREFIX + '/' + invitationId + '/reject';

export const getTournamentJoinPreviewUrl = (code) =>
	API_BASE_URL + '/tournaments/join/' + encodeURIComponent(code);
export const getTournamentJoinApplyUrl = (code) =>
	API_BASE_URL + '/tournaments/join/' + encodeURIComponent(code);

export const getOrganizationsUrl = (page = 1) =>
	API_BASE_URL + '/organizations?page=' + page;
export const getSeasonsUrl = (page = 1) =>
	API_BASE_URL + '/seasons?page=' + page;
export const getTournamentsUrl = (page = 1) =>
	API_BASE_URL + '/tournaments?page=' + page;

export const getOrganizationUrl = (organizationId) =>
	API_BASE_URL + '/organizations/' + organizationId;
export const getLeagueUrl = (leagueId) =>
	API_BASE_URL + '/leagues/' + leagueId;
export const getLeagueDivisionUrl = (leagueId, divisionId) =>
	API_BASE_URL + '/leagues/' + leagueId + '/divisions/' + divisionId;
export const getLeagueSeasonUrl = (seasonId) =>
	API_BASE_URL + '/league-seasons/' + seasonId;
export const getSeasonUrl = (seasonId) =>
	API_BASE_URL + '/seasons/' + seasonId;
export const getSeasonStandingsUrl = (seasonId, page = 1) =>
	API_BASE_URL + '/seasons/' + seasonId + '/standings?page=' + page;
export const getTournamentUrl = (tournamentId) =>
	API_BASE_URL + '/tournaments/' + tournamentId;

export const PUSH_TOKENS_API_URL = API_BASE_URL + '/push-tokens';

export const ME_COMPETITIONS_URL = API_BASE_URL + '/me/competitions';
export const TRAINING_GAMES_API_URL = API_BASE_URL + '/training/games';
