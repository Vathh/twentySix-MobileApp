export function shortPlayerLabel(name) {
	const text = String(name ?? '').trim();
	if (text.length <= 10) {
		return text || '—';
	}
	return `${text.slice(0, 9)}…`;
}

function isFinishedStatus(status) {
	return status === 'finished';
}

function scoreForRow(game, rowPlayerId) {
	const s1 = game.score1 ?? 0;
	const s2 = game.score2 ?? 0;
	if (Number(game.player1?.id) === Number(rowPlayerId)) {
		return `${s1} - ${s2}`;
	}
	return `${s2} - ${s1}`;
}

export function matrixCellForPair(game, rowPlayerId, { playableUnfinished = false } = {}) {
	if (!game) {
		return { text: '—', playable: false, game: null };
	}
	if (isFinishedStatus(game.status)) {
		return { text: scoreForRow(game, rowPlayerId), playable: false, game };
	}
	if (playableUnfinished) {
		return { text: '—', playable: true, game };
	}
	if (game.status === 'scheduled') {
		return { text: '—', playable: false, game };
	}
	return { text: scoreForRow(game, rowPlayerId), playable: false, game };
}

export function buildGroupMatrix(group, { playableUnfinished = false } = {}) {
	const standings = group?.standings ?? [];
	const games = group?.games ?? [];
	const byPair = new Map();
	games.forEach((game) => {
		const a = game.player1?.id;
		const b = game.player2?.id;
		if (a == null || b == null) {
			return;
		}
		byPair.set(`${a}-${b}`, game);
		byPair.set(`${b}-${a}`, game);
	});

	const columns = [
		{ key: 'player', label: 'Zawodnik', width: 120, align: 'left', player: true },
		...standings.map((row) => ({
			key: `vs_${row.playerId}`,
			label: shortPlayerLabel(row.playerName),
			width: playableUnfinished ? 72 : 64,
		})),
		{ key: 'gamesWon', label: 'W', width: 36 },
		{ key: 'gamesLost', label: 'L', width: 36 },
		{ key: 'matchUnitsDifference', label: 'Wynik', width: 52 },
		{ key: 'points', label: 'Pkt', width: 40 },
		{ key: 'place', label: 'Pozycja', width: 58 },
	];

	const rows = standings.map((row) => {
		const next = {
			key: `p-${row.playerId}`,
			player: {
				text: row.playerName,
				playerId: row.userId ? row.playerId : null,
				name: row.playerName,
			},
			gamesWon: row.gamesWon,
			gamesLost: row.gamesLost,
			matchUnitsDifference: row.matchUnitsDifference,
			points: row.points,
			place: row.place,
		};
		standings.forEach((col) => {
			if (row.playerId === col.playerId) {
				next[`vs_${col.playerId}`] = { text: 'X', playable: false, game: null };
				return;
			}
			next[`vs_${col.playerId}`] = matrixCellForPair(
				byPair.get(`${row.playerId}-${col.playerId}`),
				row.playerId,
				{ playableUnfinished },
			);
		});
		return next;
	});

	return { columns, rows };
}

export function playerNamesFromStandings(standings) {
	return (standings ?? [])
		.map((row) => row.playerName)
		.filter((name) => typeof name === 'string' && name.trim() !== '');
}
