import { useEffect } from 'react';
import { useConfirm } from '../context/ConfirmProvider';
import { GAME_MODE } from '../helpers/gameScoring';
import { releaseTournamentGame } from '../helpers/lockTournamentGame';
import { postFfaPresence } from '../helpers/quickGameFfaApi';

/**
 * Potwierdzenie wyjścia z ekranu scoringu — zwalnia mecz turniejowy / oznacza
 * obecność FFA jako „left” (each_own), zanim nawigacja faktycznie przejdzie dalej.
 * one_device: wyjście nie kasuje gry — host wraca z ekranu szybkiej gry.
 * Po zakończeniu meczu (gameClosed) wyjście bez dodatkowego alertu.
 *
 * @param {() => void} [onClosedLeave] — np. wylogowanie tabletu po finale turnieju
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
					onClosedLeave?.();
					return;
				}

				e.preventDefault();

				const isOneDeviceFfa =
					mode === GAME_MODE.QUICK_FFA && lobbyScoringMode === 'one_device';

				void (async () => {
					const ok = await confirm({
						title: isOneDeviceFfa ? 'Wyjdź z ekranu gry?' : 'Opuścić mecz?',
						message: isOneDeviceFfa
							? 'Gra pozostanie aktywna. Możesz wrócić z ekranu szybkiej gry albo skasować ją tam.'
							: 'Czy na pewno chcesz opuścić mecz?',
						cancelLabel: isOneDeviceFfa ? 'Zostań' : 'Kontynuuj mecz',
						confirmLabel: isOneDeviceFfa ? 'Wyjdź' : 'Opuść mecz',
					});
					if (!ok) return;

					if (
						mode === GAME_MODE.TOURNAMENT &&
						tournamentGame?.id &&
						accessToken
					) {
						await releaseTournamentGame({
							gameId: tournamentGame.id,
							type: tournamentGame.type === 'playoff' ? 'playoff' : 'group',
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
