export const ffaAfterVisit = {
	session: {
		id: 1,
		lobbyId: 5,
		status: 'in_progress',
		legsToWin: 2,
		startingScore: 501,
		currentLegNumber: 1,
		legOpenerIndex: 0,
		currentPlayerIndex: 1,
		stateVersion: 3,
		quickGameId: null,
	},
	players: [
		{
			playerId: 10,
			name: 'Host',
			remaining: 441,
			legsWon: 0,
			gameAverage: 60,
			legAverage: 60,
		},
		{
			playerId: 20,
			name: 'Friend',
			remaining: 501,
			legsWon: 0,
			gameAverage: null,
			legAverage: null,
		},
	],
	currentLeg: { legNumber: 1, open: true },
	visits: [
		{
			playerId: 10,
			score: 60,
			dartsInVisit: 3,
			bust: false,
			closedLeg: false,
		},
	],
	game: { status: 'in_progress', legsToWin: 2 },
};
