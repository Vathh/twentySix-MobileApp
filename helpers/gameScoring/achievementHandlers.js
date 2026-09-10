import { addAchievement } from '../reducers/achievementActions.js';

/**
 * Handlery achievementów (max/170+, highest finish, quick finish) — wydzielone
 * z GameScoringScreen. Wołane fresh na każdy render (jak offline/online visit flow),
 * żeby zawsze widziały aktualny `currentPlayer`/`currentResult`.
 *
 * @param {object} deps
 */
export function createAchievementHandlers({
	achievementsDispatch,
	activeGame,
	currentPlayer,
	currentResult,
}) {
	const handleMaxAndOneSeventy = (playerForAchievement, visitScore) => {
		const p = playerForAchievement ?? currentPlayer;
		if (!p) return;
		const val =
			visitScore !== undefined && visitScore !== null ? visitScore : currentResult;
		if (Number(val) === 180) {
			const max = {
				playerId: p.playerId,
				tournamentId: activeGame?.tournamentId,
				value: null,
				type: 'max',
			};
			achievementsDispatch(addAchievement(max));
		}

		if (val >= 170 && val < 180) {
			const oneSeventy = {
				playerId: p.playerId,
				tournamentId: activeGame?.tournamentId,
				value: val,
				type: 'one_seventy',
			};
			achievementsDispatch(addAchievement(oneSeventy));
		}
	};

	const handleHf = (visitScore, playerForHf) => {
		const val =
			visitScore !== undefined && visitScore !== null ? visitScore : currentResult;
		const p = playerForHf ?? currentPlayer;
		if (!p || val < 100) return;
		const hf = {
			playerId: p.playerId,
			tournamentId: activeGame?.tournamentId,
			value: val,
			type: 'hf',
		};
		achievementsDispatch(addAchievement(hf));
	};

	const handleQf = (player, dart) => {
		if (dart < 20) {
			const qf = {
				playerId: player.playerId,
				tournamentId: activeGame?.tournamentId,
				value: dart,
				type: 'qf',
			};
			achievementsDispatch(addAchievement(qf));
		}
	};

	return { handleMaxAndOneSeventy, handleHf, handleQf };
}
