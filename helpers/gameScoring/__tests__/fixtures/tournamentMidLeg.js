export const tournamentMidLeg = {
	game: {
		id: 1,
		kind: 'group',
		status: 'in_progress',
		tournamentId: 10,
		legsToWin: 2,
		player1LegsWon: 0,
		player2LegsWon: 0,
		startingScore: 501,
	},
	players: [
		{
			playerId: 1,
			name: 'Gracz A',
			remaining: 441,
			legsWon: 0,
			gameAverage: 60,
			legAverage: 60,
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
	currentLeg: { id: 5, legNumber: 1, open: true },
	visits: [
		{
			id: 1,
			playerId: 1,
			score: 60,
			dartsInVisit: 3,
			bust: false,
			closedLeg: false,
		},
	],
	legs: [],
};
