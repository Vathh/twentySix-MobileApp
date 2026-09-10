export function isFfaOneDeviceSpectator(syncEnabled, lobbyScoringMode, isHost) {
	return syncEnabled && lobbyScoringMode === 'one_device' && !isHost;
}

/**
 * Czy bieżący użytkownik może wpisać rzut (trening / one_device / each_own).
 */
export function ffaScoringCanInput({
	gameClosed,
	isModalVisible,
	busy,
	isSpectator,
	syncEnabled,
	canInputFromServer,
	lobbyScoringMode,
	myPlayerIndex,
	currentPlayerIndex,
}) {
	return (
		!gameClosed
		&& !isModalVisible
		&& !busy
		&& !isSpectator
		&& (!syncEnabled || canInputFromServer)
		&& (
			!syncEnabled
			|| lobbyScoringMode !== 'each_own'
			|| myPlayerIndex === null
			|| myPlayerIndex === currentPlayerIndex
		)
	);
}
