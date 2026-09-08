export const FFA_WS_EVENTS = ['ffa.state.updated', '.ffa.state.updated'];

export function unwrapFfaPayload(data) {
	const state = data?.state ?? data;
	return state?.session ? state : null;
}

export function createFfaRealtimeConfig({ lobbyId, accessToken, scope }) {
	return {
		channelName: `private-quick-game-lobby.${lobbyId}`,
		channelType: 'private',
		accessToken,
		events: FFA_WS_EVENTS,
		scope,
		unwrapPayload: unwrapFfaPayload,
	};
}

export function ffaHostBlockedMessage(lobbyScoringMode, isHost, actionLabel) {
	if (lobbyScoringMode === 'one_device' && !isHost) {
		return `W trybie „jedno urządzenie” ${actionLabel} tylko host.`;
	}
	return null;
}

export function ffaInputBlockedMessage({
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
	playerIndex,
	currentPlayerIndex,
}) {
	const hostMsg = ffaHostBlockedMessage(lobbyScoringMode, isHost, 'punkty wpisuje');
	if (hostMsg) {
		return hostMsg;
	}
	if (lobbyScoringMode === 'each_own' && myPlayerIndexFromLobby !== null) {
		if (playerIndex !== myPlayerIndexFromLobby) {
			return 'Możesz wpisywać tylko własne rzuty.';
		}
		if (
			currentPlayerIndex !== null &&
			currentPlayerIndex !== undefined &&
			currentPlayerIndex !== myPlayerIndexFromLobby
		) {
			return 'Czekaj na swoją kolejkę.';
		}
	}
	return null;
}
