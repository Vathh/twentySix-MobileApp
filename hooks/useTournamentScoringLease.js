import { useEffect, useRef } from 'react';
import { GAME_MODE } from '../helpers/gameScoring/resolveGameContext';
import { heartbeatTournamentGame } from '../helpers/lockTournamentGame';
import { clearOutbox } from '../helpers/gameScoring/scoringOutbox';

const HEARTBEAT_MS = 20000;

function tournamentOutboxKey(tournamentGame) {
	const kind = tournamentGame?.type === 'playoff' ? 'playoff' : 'group';
	return `scoring-outbox:tournament:${kind}:${tournamentGame.id}`;
}

/**
 * Trzyma lock meczu turniejowego, dopóki ekran sędziowania jest otwarty.
 * Nie woła lock() ponownie — anulowanie i przejęcie kończą sędziowanie na tym ekranie.
 */
export function useTournamentScoringLease({
	mode,
	gameClosed,
	tournamentGame,
	accessToken,
	onEnded = null,
}) {
	const lostRef = useRef(false);
	const onEndedRef = useRef(onEnded);
	onEndedRef.current = onEnded;

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

		const end = async (reason) => {
			if (stopped || lostRef.current) {
				return;
			}
			lostRef.current = true;
			stopped = true;
			await clearOutbox(tournamentOutboxKey(tournamentGame));
			onEndedRef.current?.(reason);
		};

		const beat = async () => {
			if (stopped) {
				return;
			}
			const renewed = await heartbeatTournamentGame({ gameId, type, accessToken });
			if (stopped || renewed.status === 0) {
				return;
			}
			if (renewed.ok) {
				if (renewed.gameStatus === 'finished') {
					await end('finished');
				}
				return;
			}
			if (renewed.reason === 'cancelled') {
				await end('cancelled');
				return;
			}
			if (renewed.reason === 'stolen' || renewed.status === 409 || renewed.status === 403) {
				await end('stolen');
			}
		};

		beat();
		const timer = setInterval(beat, HEARTBEAT_MS);

		return () => {
			stopped = true;
			clearInterval(timer);
		};
	}, [mode, gameClosed, tournamentGame, accessToken]);
}
