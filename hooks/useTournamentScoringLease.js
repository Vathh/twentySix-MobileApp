import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { GAME_MODE } from '../helpers/gameScoring/resolveGameContext';
import { heartbeatTournamentGame, lockTournamentGame } from '../helpers/lockTournamentGame';

const HEARTBEAT_MS = 20000;

/**
 * Trzyma lock meczu turniejowego, dopóki ekran sędziowania jest otwarty.
 * Po wygaśnięciu próbuje przejąć mecz z powrotem; jeśli trzyma go ktoś inny, pokazuje komunikat.
 */
export function useTournamentScoringLease({
	mode,
	gameClosed,
	tournamentGame,
	accessToken,
}) {
	const lostRef = useRef(false);

	useEffect(() => {
		if (
			mode !== GAME_MODE.TOURNAMENT ||
			gameClosed ||
			!tournamentGame?.id ||
			!accessToken
		) {
			return undefined;
		}

		let stopped = false;
		lostRef.current = false;
		const gameId = tournamentGame.id;
		const type = tournamentGame.type === 'playoff' ? 'playoff' : 'group';

		const beat = async () => {
			if (stopped) {
				return;
			}
			const renewed = await heartbeatTournamentGame({ gameId, type, accessToken });
			if (stopped || renewed.ok || renewed.status === 0) {
				return;
			}
			const reclaimed = await lockTournamentGame({ gameId, type, accessToken });
			if (stopped || reclaimed.ok || lostRef.current) {
				return;
			}
			lostRef.current = true;
			Alert.alert('Mecz niedostępny', reclaimed.message);
		};

		beat();
		const timer = setInterval(beat, HEARTBEAT_MS);

		return () => {
			stopped = true;
			clearInterval(timer);
		};
	}, [mode, gameClosed, tournamentGame?.id, tournamentGame?.type, accessToken]);
}
