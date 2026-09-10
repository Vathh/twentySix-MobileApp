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
	const eachOwnTurnOk =
		lobbyScoringMode !== 'each_own'
		|| myPlayerIndex === null
		|| myPlayerIndex === currentPlayerIndex;
	// each_own: kolejkę liczy currentPlayerIndex z WS. `you.canInput` z eventu
	// jest widokiem rzucającego — nie wolno nim blokować rywala.
	const serverOk = lobbyScoringMode === 'each_own' || canInputFromServer;

	return (
		!gameClosed
		&& !isModalVisible
		&& !busy
		&& !isSpectator
		&& (!syncEnabled || (eachOwnTurnOk && serverOk))
	);
}
