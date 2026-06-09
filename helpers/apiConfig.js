// Adres API backendu. Telefon (Expo Go) musi łączyć się z IP komputera w tej samej sieci Wi‑Fi.
// Sprawdź IP komputera: w terminalu wpisz ipconfig, szukaj "IPv4" przy "Wireless LAN".
// Emulator Android: często działa ten sam adres; jeśli nie, zmień na http://10.0.2.2:8000/api
const API_BASE_URL = 'http://192.168.0.28:8000/api';

// Baza URL Laravel (bez /api) – do autoryzacji kanałów WebSocket (broadcasting/auth)
const LARAVEL_BASE_URL =
	API_BASE_URL.replace(/\/api\/?$/, '') || 'http://192.168.0.28:8000';

// Reverb (WebSocket) – musi być taki sam jak REVERB_APP_KEY w .env backendu
export const REVERB_APP_KEY = 'sld-reverb-key';
// Host i port Reverb: ten sam host co API (LAN), NIE używaj 0.0.0.0 w aplikacji — to tylko bind serwera.
// Opcjonalnie: EXPO_PUBLIC_REVERB_HOST / EXPO_PUBLIC_REVERB_PORT w .env (Metro musi być zrestartowany).
const REVERB_WS_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT) || 8080;

const INVALID_CLIENT_WS_HOSTS = new Set(['0.0.0.0', '[::]', '::', '']);

function resolveReverbWsHost() {
	const fromEnv =
		typeof process !== 'undefined'
			? process.env.EXPO_PUBLIC_REVERB_HOST?.trim()
			: '';
	if (fromEnv) {
		return fromEnv;
	}
	try {
		const u = new URL(API_BASE_URL);
		const host = u.hostname;
		if (INVALID_CLIENT_WS_HOSTS.has(host)) {
			console.warn(
				'[WS/Reverb:config] API_BASE_URL ma host 0.0.0.0 / :: — telefon nie połączy się z Reverb. Ustaw IPv4 komputera w API_BASE_URL albo EXPO_PUBLIC_REVERB_HOST (np. 192.168.0.28). W backendzie REVERB_HOST=0.0.0.0 jest OK dla serwera; klient musi użyć realnego IP.',
			);
		}
		return host;
	} catch {
		return '192.168.0.28';
	}
}

const reverbHostResolved = resolveReverbWsHost();

export const getReverbConfig = () => ({
	key: REVERB_APP_KEY,
	cluster: 'reverb',
	wsHost: reverbHostResolved,
	wsPort: REVERB_WS_PORT,
	wssPort: REVERB_WS_PORT,
	forceTLS: false,
	disableStats: true,
	enabledTransports: ['ws', 'wss'],
	authEndpoint: LARAVEL_BASE_URL + '/broadcasting/auth',
});

const GAME_ENDPOINT = '/game';
const ACTIVE_ENDPOINT = '/active';
const UPDATE_ENDPOINT = '/update';
const GAME_IN_PROGRESS_ENDPOINT = '/inProgress';

const LOGIN_ENDPOINT = '/login';
const ACCOUNT_LOGIN_ENDPOINT = '/account/login';

const AUTHORIZATION_ENDPOINT = '/authorization';
const AUTHORIZATION_AUTHENTICATE_ENDPOINT = '/authenticate';

const LOGOUT_ENDPOINT = '/logout';

// Quick game
const QUICK_GAME_ENDPOINT = '/quick-game';
const QUICK_GAME_UPDATE_ENDPOINT = '/update';
const QUICK_GAME_CREATE_ENDPOINT = '/create';
const QUICK_GAME_ACTIVE_ENDPOINT = '/active';
const QUICK_GAME_IN_PROGRESS_ENDPOINT = '/inProgress';

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

export const ACTIVE_GAMES_API_URL =
	API_BASE_URL + GAME_ENDPOINT + ACTIVE_ENDPOINT;

export const UPDATE_GAME_API_URL =
	API_BASE_URL + GAME_ENDPOINT + UPDATE_ENDPOINT;

export const GAME_IN_PROGRESS_API_URL =
	API_BASE_URL + GAME_ENDPOINT + GAME_IN_PROGRESS_ENDPOINT;

export const QUICK_GAME_UPDATE_API_URL =
	API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_UPDATE_ENDPOINT;
export const QUICK_GAME_CREATE_API_URL =
	API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_CREATE_ENDPOINT;
export const QUICK_GAME_ACTIVE_API_URL =
	API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_ACTIVE_ENDPOINT;
export const QUICK_GAME_IN_PROGRESS_API_URL =
	API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_IN_PROGRESS_ENDPOINT;
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

// Game scoring (wizyty, legi) — ten sam kontrakt dla quick / group / playoff
const QUICK_GAMES_PREFIX = '/quick-games';
const GROUP_GAMES_PREFIX = '/group-games';
const PLAYOFF_GAMES_PREFIX = '/playoff-games';

export const getQuickGameScoringBaseUrl = (quickGameId) =>
	API_BASE_URL + QUICK_GAMES_PREFIX + '/' + quickGameId;

export const getGroupGameScoringBaseUrl = (gameId) =>
	API_BASE_URL + GROUP_GAMES_PREFIX + '/' + gameId;

export const getPlayoffGameScoringBaseUrl = (playoffGameId) =>
	API_BASE_URL + PLAYOFF_GAMES_PREFIX + '/' + playoffGameId;

export const getGameScoringStateUrl = (baseUrl) => baseUrl + '/scoring/state';
export const getGameScoringStartLegUrl = (baseUrl) => baseUrl + '/legs';
export const getGameScoringVisitUrl = (baseUrl, legId) =>
	baseUrl + '/legs/' + legId + '/visits';
export const getGameScoringUndoUrl = (baseUrl, legId) =>
	baseUrl + '/legs/' + legId + '/visits/undo';
export const getGameScoringCloseLegUrl = (baseUrl, legId) =>
	baseUrl + '/legs/' + legId + '/close';

/** Kanał publiczny Pusher: quick-game.{id} | group-game.{id} | playoff-game.{id} */
export const getGameScoringChannelName = (kind, gameId) =>
	kind + '-game.' + gameId;
const FRIENDS_PREFIX = '/friends';
export const FRIENDS_API_URL = API_BASE_URL + FRIENDS_PREFIX;

const TOURNAMENT_INVITATIONS_PREFIX = '/tournaments/invitations';
export const TOURNAMENT_INVITATIONS_RECEIVED_URL =
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/received';
export const getTournamentInvitationAcceptUrl = (invitationId) =>
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/' + invitationId + '/accept';
export const getTournamentInvitationRejectUrl = (invitationId) =>
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/' + invitationId + '/reject';
export const getTournamentInvitationWithdrawUrl = (invitationId) =>
	API_BASE_URL + TOURNAMENT_INVITATIONS_PREFIX + '/' + invitationId + '/withdraw';
