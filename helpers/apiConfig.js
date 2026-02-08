// const API_BASE_URL = 'http://192.168.0.16:8190/dart_league';
// const API_BASE_URL = 'http://192.168.0.17:8000/api';
// const API_BASE_URL = 'http://127.0.0.1:8000/api';
const API_BASE_URL = 'http://10.0.2.2:8000/api';


const GAME_ENDPOINT = '/game';
const ACTIVE_ENDPOINT = '/active';
const UPDATE_ENDPOINT = '/update';

const LOGIN_ENDPOINT = '/login';
const ACCOUNT_LOGIN_ENDPOINT = '/account/login';

const MATCH_ENDPOINT = '/match';
const MATCH_ACTIVE_ENDPOINT = '/active';

const AUTHORIZATION_ENDPOINT = "/authorization";
const AUTHORIZATION_AUTHENTICATE_ENDPOINT = "/authenticate";

const LOGOUT_ENDPOINT = "/logout";

// Quick game
const QUICK_GAME_ENDPOINT = '/quick-game';
const QUICK_GAME_UPDATE_ENDPOINT = '/update';
const QUICK_GAME_CREATE_ENDPOINT = '/create';
const QUICK_GAME_ACTIVE_ENDPOINT = '/active';
const QUICK_GAME_IN_PROGRESS_ENDPOINT = '/inProgress';

// Quick game lobby
const QUICK_GAME_LOBBY_PREFIX = '/quick-game/lobby';
const LOBBY_CREATE_ENDPOINT = '/create';
const LOBBY_JOIN_ENDPOINT = '/join';
const LOBBY_GET_BY_CODE = '/code'; // GET /code/{code}
const LOBBY_LEAVE = '/leave';
const LOBBY_READY = '/ready';
const LOBBY_START = '/start';
const LOBBY_INVITE = '/invite';

export const MATCH_ACTIVE_API_URL = API_BASE_URL + MATCH_ENDPOINT + MATCH_ACTIVE_ENDPOINT;

export const MATCH_API_URL = API_BASE_URL + MATCH_ENDPOINT;

export const AUTHENTICATE_API_URL = API_BASE_URL + AUTHORIZATION_ENDPOINT + AUTHORIZATION_AUTHENTICATE_ENDPOINT;

export const LOGOUT_API_URL = API_BASE_URL + LOGOUT_ENDPOINT;

export const LOGIN_API_URL = API_BASE_URL + LOGIN_ENDPOINT;
export const ACCOUNT_LOGIN_API_URL = API_BASE_URL + ACCOUNT_LOGIN_ENDPOINT;

export const ACTIVE_GAMES_API_URL = API_BASE_URL + GAME_ENDPOINT + ACTIVE_ENDPOINT;

export const UPDATE_GAME_API_URL = API_BASE_URL + GAME_ENDPOINT + UPDATE_ENDPOINT;

export const QUICK_GAME_UPDATE_API_URL = API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_UPDATE_ENDPOINT;
export const QUICK_GAME_CREATE_API_URL = API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_CREATE_ENDPOINT;
export const QUICK_GAME_ACTIVE_API_URL = API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_ACTIVE_ENDPOINT;
export const QUICK_GAME_IN_PROGRESS_API_URL = API_BASE_URL + QUICK_GAME_ENDPOINT + QUICK_GAME_IN_PROGRESS_ENDPOINT;
export const QUICK_GAME_LOBBY_CREATE_API_URL = API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + LOBBY_CREATE_ENDPOINT;
export const QUICK_GAME_LOBBY_JOIN_API_URL = API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + LOBBY_JOIN_ENDPOINT;
export const getQuickGameLobbyByCodeUrl = (code) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + LOBBY_GET_BY_CODE + '/' + encodeURIComponent(code);
export const getQuickGameLobbyUrl = (lobbyId) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId;
export const getQuickGameLobbyLeaveUrl = (lobbyId) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_LEAVE;
export const getQuickGameLobbyReadyUrl = (lobbyId) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_READY;
export const getQuickGameLobbyStartUrl = (lobbyId) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_START;
export const getQuickGameLobbyInviteUrl = (lobbyId) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_INVITE;
const LOBBY_ADD_GUEST = '/add-guest';
export const getQuickGameLobbyAddGuestUrl = (lobbyId) => API_BASE_URL + QUICK_GAME_LOBBY_PREFIX + '/' + lobbyId + LOBBY_ADD_GUEST;

// Znajomi (wymaga auth)
const FRIENDS_PREFIX = '/friends';
export const FRIENDS_API_URL = API_BASE_URL + FRIENDS_PREFIX;