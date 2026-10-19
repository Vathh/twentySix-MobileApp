/**
 * Średnia pierwszych 9 lotek z wyników wizyt.
 * Każda wizyta liczona jest jako 3 lotki — dokładne lotki checkoutu zna serwer
 * (`matchFirstNineAverage` w stanie scoringu).
 */
export function matchFirstNineFromScores(playerState) {
	const groups = [];
	for (const leg of playerState?.legByLegScores ?? []) {
		if (Array.isArray(leg) && leg.length > 0) {
			groups.push(leg);
		}
	}
	if (Array.isArray(playerState?.currentLegScores) && playerState.currentLegScores.length > 0) {
		groups.push(playerState.currentLegScores);
	}

	let points = 0;
	let visits = 0;
	for (const scores of groups) {
		for (const score of scores.slice(0, 3)) {
			const value = Number(score);
			if (!Number.isFinite(value)) {
				continue;
			}
			points += value;
			visits += 1;
		}
	}

	if (visits === 0) {
		return null;
	}

	return Math.round((points / visits) * 100) / 100;
}

export function resolveMatchFirstNine(playerState) {
	const server = playerState?.matchFirstNineAverage;
	if (server != null && server !== '' && Number.isFinite(Number(server))) {
		return Number(server);
	}

	return matchFirstNineFromScores(playerState);
}
