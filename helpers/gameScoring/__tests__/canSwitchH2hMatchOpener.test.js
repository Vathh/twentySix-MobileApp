import {
	canSwitchH2hMatchOpener,
	scoringStateHasProgress,
} from '../applyGameScoringState.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const openingState = {
	visits: [],
	legs: [],
	players: [
		{ legsWon: 0, setsWon: 0 },
		{ legsWon: 0, setsWon: 0 },
	],
	currentLeg: { legNumber: 1 },
	game: { player1LegsWon: 0, player2LegsWon: 0 },
};

export function runCanSwitchH2hMatchOpenerTests() {
	assert(!scoringStateHasProgress(openingState), 'opening state has no progress');
	assert(
		canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: scoringStateHasProgress(openingState),
		}),
		'opening state allows switch',
	);

	assert(
		!canSwitchH2hMatchOpener({
			openerChosen: false,
			hasProgress: false,
		}),
		'opener not chosen yet',
	);

	const withVisits = {
		...openingState,
		visits: [{ id: 1, playerId: 1, score: 45 }],
	};
	assert(scoringStateHasProgress(withVisits), 'visits are progress');
	assert(
		!canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: scoringStateHasProgress(withVisits),
		}),
		'visits block switch',
	);

	const legWon = {
		...openingState,
		visits: [],
		legs: [{ id: 1 }],
		players: [
			{ legsWon: 1, setsWon: 0 },
			{ legsWon: 0, setsWon: 0 },
		],
		game: { player1LegsWon: 1, player2LegsWon: 0 },
	};
	assert(scoringStateHasProgress(legWon), 'won leg is progress');
	assert(
		!canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: scoringStateHasProgress(legWon),
		}),
		'won leg blocks switch',
	);

	assert(
		!canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: false,
			localVisitInProgress: true,
		}),
		'unfinished per-dart visit blocks switch',
	);

	const afterUndo = {
		visits: [],
		legs: [],
		players: [
			{ legsWon: 0, setsWon: 0 },
			{ legsWon: 0, setsWon: 0 },
		],
		turn: { legNumber: 1 },
		game: { player1LegsWon: 0, player2LegsWon: 0 },
	};
	assert(!scoringStateHasProgress(afterUndo), 'undo to zero clears progress');
	assert(
		canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: scoringStateHasProgress(afterUndo),
			localVisitInProgress: false,
		}),
		'undo back to opening allows switch',
	);

	assert(
		!canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: false,
			gameClosed: true,
		}),
		'finished match blocks switch',
	);
	assert(
		!canSwitchH2hMatchOpener({
			openerChosen: true,
			hasProgress: false,
			bullOffRequired: true,
		}),
		'bull-off blocks switch',
	);
}
