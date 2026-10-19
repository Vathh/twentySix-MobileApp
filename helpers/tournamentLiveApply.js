function patchPlayer(player, id, name) {
	if (id == null && !name) {
		return player;
	}
	return {
		...player,
		id: id ?? player?.id,
		name: name || player?.name,
	};
}

function mergeGroupGame(existing, live) {
	const scheduled = live.status === 'scheduled';
	return {
		...existing,
		status: live.status ?? existing.status,
		score1: scheduled ? existing.score1 : (live.player1Score ?? existing.score1),
		score2: scheduled ? existing.score2 : (live.player2Score ?? existing.score2),
		player1Average: live.player1Average ?? existing.player1Average,
		player2Average: live.player2Average ?? existing.player2Average,
	};
}

function mergeStandings(rows, updates) {
	if (!Array.isArray(updates) || updates.length === 0) {
		return rows;
	}
	const byId = new Map(updates.map((row) => [Number(row.playerId), row]));
	return (rows ?? []).map((row) => {
		const next = byId.get(Number(row.playerId));
		if (!next) {
			return row;
		}
		return {
			...row,
			gamesWon: next.gamesWon,
			gamesLost: next.gamesLost,
			matchUnitsDifference: next.matchUnitsDifference,
			points: next.points,
			place: next.place,
		};
	});
}

function patchRunningAverage(groups, playerId, average) {
	if (playerId == null || average == null) {
		return groups;
	}
	return groups.map((group) => ({
		...group,
		standings: (group.standings ?? []).map((row) => (
			Number(row.playerId) === Number(playerId) ? { ...row, average } : row
		)),
	}));
}

export function applyGroupMatrixEvent(data, payload) {
	if (!data || !payload) {
		return data;
	}
	let groups = data.groups ?? [];
	const game = payload.game;
	if (game?.id != null) {
		groups = groups.map((group) => ({
			...group,
			games: (group.games ?? []).map((existing) => (
				Number(existing.id) === Number(game.id) ? mergeGroupGame(existing, game) : existing
			)),
		}));
		groups = patchRunningAverage(groups, game.player1Id, game.player1RunningAverage);
		groups = patchRunningAverage(groups, game.player2Id, game.player2RunningAverage);
	}
	if (payload.includeStandings && Array.isArray(payload.standings)) {
		const groupNumber = Number(payload.groupNumber);
		groups = groups.map((group) => (
			Number(group.groupNumber) === groupNumber
				? { ...group, standings: mergeStandings(group.standings, payload.standings) }
				: group
		));
	}
	return { ...data, groups };
}

export function applyGroupsSnapshot(data, snapshot) {
	if (!data || !snapshot) {
		return data;
	}
	if (
		snapshot.tournamentStatus
		&& data.tournament?.status
		&& snapshot.tournamentStatus !== data.tournament.status
	) {
		return null;
	}
	const byId = new Map((snapshot.games ?? []).map((game) => [Number(game.id), game]));
	const standingsByGroup = snapshot.standingsByGroup ?? {};
	return {
		...data,
		groups: (data.groups ?? []).map((group) => {
			const standingUpdate = standingsByGroup[group.groupNumber] ?? standingsByGroup[String(group.groupNumber)];
			return {
				...group,
				games: (group.games ?? []).map((existing) => {
					const live = byId.get(Number(existing.id));
					return live ? mergeGroupGame(existing, live) : existing;
				}),
				standings: mergeStandings(group.standings, standingUpdate),
			};
		}),
	};
}

function mergePlayoffGame(existing, live) {
	const hide = live.hideScores === true || live.status === 'scheduled';
	return {
		...existing,
		status: live.status ?? existing.status,
		score1: hide ? null : (live.player1Score ?? existing.score1),
		score2: hide ? null : (live.player2Score ?? existing.score2),
		winnerId: live.winnerId !== undefined ? live.winnerId : existing.winnerId,
		player1Average: live.player1Average ?? existing.player1Average,
		player2Average: live.player2Average ?? existing.player2Average,
		player1: patchPlayer(existing.player1, live.player1Id, live.player1Name),
		player2: patchPlayer(existing.player2, live.player2Id, live.player2Name),
	};
}

function patchRounds(rounds, liveGames) {
	const byId = new Map(liveGames.map((game) => [Number(game.id), game]));
	return (rounds ?? []).map((round) => ({
		...round,
		games: (round.games ?? []).map((existing) => {
			const live = byId.get(Number(existing.id));
			return live ? mergePlayoffGame(existing, live) : existing;
		}),
	}));
}

export function applyPlayoffGames(data, games) {
	if (!data || !Array.isArray(games) || games.length === 0) {
		return data;
	}
	return {
		...data,
		playoff: patchRounds(data.playoff, games),
		consolationPlayoff: patchRounds(data.consolationPlayoff, games),
	};
}

export function applyPlayoffSnapshot(data, snapshot) {
	if (!data || !snapshot) {
		return data;
	}
	if (
		snapshot.tournamentStatus
		&& data.tournament?.status
		&& snapshot.tournamentStatus !== data.tournament.status
	) {
		return null;
	}
	return applyPlayoffGames(data, snapshot.games ?? []);
}
