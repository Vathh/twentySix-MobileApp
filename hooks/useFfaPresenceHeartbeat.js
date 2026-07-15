import { useEffect } from 'react';
import { AppState } from 'react-native';
import { postFfaPresence } from '../helpers/quickGameFfaApi';
import {
	clearActiveFfaLobby,
	saveActiveFfaLobby,
} from '../helpers/activeQuickGameMatch';
import { GAME_MODE } from '../helpers/gameScoring/resolveGameContext';

/**
 * Heartbeat presence dla quick FFA online.
 */
export function useFfaPresenceHeartbeat({
	mode,
	syncEnabled,
	lobbyId,
	accessToken,
	gameClosed,
	intentionalFfaLeaveRef,
}) {
	useEffect(() => {
		if (
			mode !== GAME_MODE.QUICK_FFA ||
			!syncEnabled ||
			!lobbyId ||
			!accessToken ||
			gameClosed
		) {
			return undefined;
		}

		let cancelled = false;
		const token = accessToken;

		const sendPresence = async (status) => {
			if (cancelled) return;
			try {
				await postFfaPresence(lobbyId, token, status);
			} catch {
				// Ignoruj błędy sieci — heartbeat spróbuje ponownie
			}
		};

		saveActiveFfaLobby(lobbyId);
		sendPresence('connected');

		const heartbeat = setInterval(() => sendPresence('connected'), 30000);

		const appStateSub = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') {
				sendPresence('connected');
			} else if (nextState === 'background' || nextState === 'inactive') {
				sendPresence('disconnected');
			}
		});

		return () => {
			cancelled = true;
			clearInterval(heartbeat);
			appStateSub.remove();
			if (!intentionalFfaLeaveRef.current) {
				sendPresence('disconnected');
			}
		};
	}, [mode, syncEnabled, lobbyId, accessToken, gameClosed, intentionalFfaLeaveRef]);

	useEffect(() => {
		if (gameClosed && mode === GAME_MODE.QUICK_FFA) {
			clearActiveFfaLobby();
		}
	}, [gameClosed, mode]);
}
