import { useEffect } from 'react';
import { useConfirm } from '../context/ConfirmProvider';
import { GAME_MODE } from '../helpers/gameScoring';
import { releaseTournamentGame } from '../helpers/lockTournamentGame';
import { clearOutbox } from '../helpers/gameScoring/scoringOutbox';
import { postFfaPresence } from '../helpers/quickGameFfaApi';

/**
 * Potwierdzenie wyjścia z ekranu scoringu — zwalnia mecz turniejowy / oznacza
 * obecność FFA jako „left” (each_own), zanim nawigacja faktycznie przejdzie dalej.
 * one_device: wyjście nie kasuje gry — host wraca z ekranu szybkiej gry.
 * Po zakończeniu meczu (gameClosed) wyjście bez dodatkowego alertu.
 *
 * @param {() => boolean | void} [onClosedLeave] — np. wylogowanie tabletu po końcu turnieju; `true` = obsłużono nawigację
 */
export function useLeaveGameConfirmation({
	navigation,
	mode,
	gameClosed,
	tournamentGame,
	accessToken,
	syncEnabled,
	lobbyId,
	intentionalFfaLeaveRef,
	onClosedLeave,
	lobbyScoringMode = 'each_own',
}) {
	const confirm = useConfirm();

	useEffect(
		() =>
			navigation.addListener('beforeRemove', (e) => {
				if (gameClosed) {
					if (onClosedLeave?.()) {
						e.preventDefault();
					}
					return;
				}

				e.preventDefault();

				const isOneDeviceFfa =
					mode === GAME_MODE.QUICK_FFA && lobbyScoringMode === 'one_device';

				void (async () => {
					const isTournament = mode === GAME_MODE.TOURNAMENT;
					const ok = await confirm({
						title: isOneDeviceFfa
							? 'Wyjdź z ekranu gry?'
							: isTournament
								? 'Wyjdź z sędziowania?'
								: 'Opuścić mecz?',
						message: isOneDeviceFfa
							? 'Gra pozostanie aktywna. Możesz wrócić z ekranu szybkiej gry albo skasować ją tam.'
							: isTournament
								? 'Inne urządzenie będzie mogło kontynuować ten mecz od ostatniej wizyty.'
								: 'Czy na pewno chcesz opuścić mecz?',
						cancelLabel: isOneDeviceFfa ? 'Zostań' : 'Kontynuuj mecz',
						confirmLabel: isOneDeviceFfa ? 'Wyjdź' : isTournament ? 'Wyjdź' : 'Opuść mecz',
					});
					if (!ok) return;

					if (
						mode === GAME_MODE.TOURNAMENT &&
						tournamentGame?.id &&
						accessToken
					) {
						const kind = tournamentGame.type === 'playoff' ? 'playoff' : 'group';
						await clearOutbox(
							`scoring-outbox:tournament:${kind}:${tournamentGame.id}`,
						);
						await releaseTournamentGame({
							gameId: tournamentGame.id,
							type: kind,
							accessToken,
						});
					}
					if (
						mode === GAME_MODE.QUICK_FFA &&
						syncEnabled &&
						lobbyId &&
						accessToken &&
						!isOneDeviceFfa
					) {
						intentionalFfaLeaveRef.current = true;
						try {
							await postFfaPresence(lobbyId, accessToken, 'left');
						} catch {
							// Wyjście z ekranu i tak dozwolone
						}
					}
					navigation.dispatch(e.data.action);
				})();
			}),
		[
			navigation,
			mode,
			gameClosed,
			tournamentGame,
			accessToken,
			syncEnabled,
			lobbyId,
			intentionalFfaLeaveRef,
			onClosedLeave,
			lobbyScoringMode,
			confirm,
		],
	);
}
