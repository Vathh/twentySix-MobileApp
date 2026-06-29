export const tournamentAfterLegClose = {
	game: {
		id: 50,
		kind: 'group',
		status: 'in_progress',
		tournamentId: 10,
		legsToWin: 2,
		player1LegsWon: 1,
		player2LegsWon: 0,
		startingScore: 501,
	},
	players: [
		{
			playerId: 1,
			name: 'Gracz A',
			remaining: 501,
			legsWon: 1,
			gameAverage: 123,
			legAverage: null,
		},
		{
			playerId: 2,
			name: 'Gracz B',
			remaining: 501,
			legsWon: 0,
			gameAverage: null,
			legAverage: null,
		},
	],
	currentLeg: null,
	visits: [],
	legs: [
		{
			id: 259,
			legNumber: 1,
			winnerId: 1,
			finishedAt: '2026-06-29T18:17:23+00:00',
		},
	],
};
