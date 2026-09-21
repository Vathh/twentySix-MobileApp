import {
	normalizeDartLimit,
	normalizeLossThreshold,
} from './dartLimitRules.js';

export const DEFAULT_MATCH_FORMAT = {
	startingScore: 501,
	legsToWinSet: 2,
	setsToWinMatch: 1,
	gameType: 'x01',
	outRule: 'double_out',
	bob27Mode: 'hard',
	bob27Bull: 'with',
	winMode: 'first_to',
	winLength: 2,
	dartLimit: null,
	lossThreshold: null,
};

export const STARTING_SCORE_OPTIONS = [
	101, 201, 301, 401, 501, 601, 701, 801, 901, 1001,
];

export const GAME_TYPE_X01 = 'x01';
export const GAME_TYPE_CRICKET = 'cricket';
export const GAME_TYPE_BOB27 = 'bob27';
export const GAME_TYPE_ATC = 'atc';
export const GAME_TYPE_CATCH40 = 'catch40';
export const GAME_TYPE_CRICKET56 = 'cricket56';
export const BOB27_MODE_EASY = 'easy';
export const BOB27_MODE_HARD = 'hard';
export const BOB27_BULL_WITH = 'with';
export const BOB27_BULL_WITHOUT = 'without';

export const GAME_TYPE_OPTIONS = [
	{
		value: GAME_TYPE_X01,
		label: '501 / X01',
		description: 'Klasyczny x01, double out',
	},
	{
		value: GAME_TYPE_CRICKET,
		label: 'Cricket',
		description: '20–15 i bull, punkty za zamknięte',
	},
	{
		value: GAME_TYPE_BOB27,
		label: "Bob's 27",
		description: 'Trening dubli D1–D20, opcjonalnie inner bull',
	},
	{
		value: GAME_TYPE_ATC,
		label: 'Around the Clock',
		description: '1 → 20 → bull, bez przeskoków',
	},
	{
		value: GAME_TYPE_CATCH40,
		label: 'Catch 40',
		description: 'Checkouty 61–100, max 6 lotek, double out',
	},
	{
		value: GAME_TYPE_CRICKET56,
		label: 'Cricket 60',
		description: '15–20 i bull, 7 rund, perfect 60',
	},
];

export function isCricketFormat(format) {
	return String(format?.gameType ?? '').toLowerCase() === GAME_TYPE_CRICKET;
}

export function isBob27Format(format) {
	return String(format?.gameType ?? '').toLowerCase() === GAME_TYPE_BOB27;
}

export function isAtcFormat(format) {
	const raw = String(format?.gameType ?? '').toLowerCase();
	return raw === GAME_TYPE_ATC || raw === 'around_the_clock' || raw === 'clock';
}

export function isCatch40Format(format) {
	const raw = String(format?.gameType ?? '').toLowerCase();
	return raw === GAME_TYPE_CATCH40 || raw === 'catch_40' || raw === 'catch-40';
}

export function isCricket56Format(format) {
	const raw = String(format?.gameType ?? '').toLowerCase();
	return raw === GAME_TYPE_CRICKET56
		|| raw === 'cricket_56'
		|| raw === 'cricket-56'
		|| raw === 'cricket60'
		|| raw === 'cricket_60'
		|| raw === 'cricketsequence'
		|| raw === 'cricket_sequence';
}

export function hidesX01MatchFields(format) {
	return isCricketFormat(format) || isBob27Format(format) || isAtcFormat(format) || isCatch40Format(format) || isCricket56Format(format);
}

export function normalizeBob27Mode(mode) {
	return String(mode ?? '').toLowerCase() === BOB27_MODE_EASY
		? BOB27_MODE_EASY
		: BOB27_MODE_HARD;
}

export function normalizeBob27Bull(value) {
	return String(value ?? '').toLowerCase() === BOB27_BULL_WITHOUT
		? BOB27_BULL_WITHOUT
		: BOB27_BULL_WITH;
}

export function includesBob27Bull(formatOrBull) {
	if (formatOrBull && typeof formatOrBull === 'object') {
		return normalizeBob27Bull(formatOrBull.bob27Bull) === BOB27_BULL_WITH;
	}
	return normalizeBob27Bull(formatOrBull) === BOB27_BULL_WITH;
}

export function normalizeMatchFormat(input) {
	const base = { ...DEFAULT_MATCH_FORMAT };
	if (!input || typeof input !== 'object') {
		return base;
	}

	let gameType = String(input.gameType ?? input.game_type ?? base.gameType);
	if (gameType === '501') {
		gameType = GAME_TYPE_X01;
	}
	if (gameType === 'around_the_clock' || gameType === 'clock') {
		gameType = GAME_TYPE_ATC;
	}
	if (gameType === 'catch_40' || gameType === 'catch-40') {
		gameType = GAME_TYPE_CATCH40;
	}
	if (
		gameType === 'cricket_56'
		|| gameType === 'cricket-56'
		|| gameType === 'cricket60'
		|| gameType === 'cricket_60'
		|| gameType === 'cricketsequence'
		|| gameType === 'cricket_sequence'
	) {
		gameType = GAME_TYPE_CRICKET56;
	}

	const isCricket = gameType === GAME_TYPE_CRICKET;
	const isBob27 = gameType === GAME_TYPE_BOB27;
	const isAtc = gameType === GAME_TYPE_ATC;
	const isCatch40 = gameType === GAME_TYPE_CATCH40;
	const isCricket56 = gameType === GAME_TYPE_CRICKET56;
	const hideSets = isCricket || isBob27 || isAtc || isCatch40 || isCricket56;
	const winMode = String(input.winMode ?? input.win_mode ?? 'first_to').toLowerCase() === 'best_of'
		? 'best_of'
		: 'first_to';
	const winLength = Number(
		input.winLength
			?? input.win_length
			?? (winMode === 'best_of'
				? Math.max(2, (Number(input.legsToWinSet ?? input.legs_to_win_set ?? base.legsToWinSet) * 2) - 1)
				: (Number(input.legsToWinSet ?? input.legs_to_win_set ?? base.legsToWinSet))),
	);
	const dartLimit = hideSets
		? null
		: normalizeDartLimit(input.dartLimit ?? input.dart_limit ?? null);
	const lossThreshold = dartLimit == null
		? null
		: normalizeLossThreshold(input.lossThreshold ?? input.loss_threshold ?? null);

	return {
		startingScore: Number(
			input.startingScore ?? input.starting_score ?? base.startingScore,
		),
		legsToWinSet: Number(
			input.legsToWinSet
				?? input.legs_to_win_set
				?? base.legsToWinSet,
		),
		setsToWinMatch: hideSets
			? 1
			: Number(
				input.setsToWinMatch ?? input.sets_to_win_match ?? base.setsToWinMatch,
			),
		gameType,
		outRule: String(input.outRule ?? input.out_rule ?? base.outRule),
		bob27Mode: normalizeBob27Mode(input.bob27Mode ?? input.bob27_mode ?? base.bob27Mode),
		bob27Bull: normalizeBob27Bull(input.bob27Bull ?? input.bob27_bull ?? base.bob27Bull),
		winMode,
		winLength,
		dartLimit,
		lossThreshold,
	};
}

export function isSingleSetFormat(format) {
	return (format?.setsToWinMatch ?? 1) === 1;
}

function dartLimitSuffix(format) {
	return format?.dartLimit != null ? ` · max ${format.dartLimit} lotek` : '';
}

export function formatMatchLabel(format) {
	const f = normalizeMatchFormat(format);
	if (isCricketFormat(f)) {
		return `Cricket · do ${f.legsToWinSet} legów`;
	}
	if (isBob27Format(f)) {
		const mode = f.bob27Mode === BOB27_MODE_EASY ? 'easy' : 'hard';
		const bull = includesBob27Bull(f) ? 'z bullem' : 'bez bulla';
		return `Bob's 27 · ${mode} · ${bull} · do ${f.legsToWinSet} legów`;
	}
	if (isAtcFormat(f)) {
		return `Around the Clock · do ${f.legsToWinSet} legów`;
	}
	if (isCatch40Format(f)) {
		return `Catch 40 · do ${f.legsToWinSet} legów`;
	}
	if (isCricket56Format(f)) {
		return `Cricket 60 · do ${f.legsToWinSet} legów`;
	}
	if (isSingleSetFormat(f)) {
		if (f.winMode === 'best_of') {
			return `${f.startingScore} · best of ${f.winLength}${dartLimitSuffix(f)}`;
		}

		return `${f.startingScore} · do ${f.legsToWinSet} legów${dartLimitSuffix(f)}`;
	}

	return `${f.startingScore} · ${f.setsToWinMatch} sety · ${f.legsToWinSet} legi/set${dartLimitSuffix(f)}`;
}

export function isMatchWon(playerState, format) {
	const f = normalizeMatchFormat(format);
	if (isSingleSetFormat(f)) {
		return (playerState?.legsWon ?? 0) >= f.legsToWinSet;
	}

	return (playerState?.setsWon ?? 0) >= f.setsToWinMatch;
}

export function isMatchFinished(playerStates, format) {
	const f = normalizeMatchFormat(format);
	const states = playerStates ?? [];
	if (f.winMode === 'best_of' && isSingleSetFormat(f) && states.length >= 2) {
		const a = states[0]?.legsWon ?? 0;
		const b = states[1]?.legsWon ?? 0;
		return a >= f.legsToWinSet || b >= f.legsToWinSet || (a + b) >= f.winLength;
	}

	return states.some((state) => isMatchWon(state, f));
}

export function findWinnerIndex(playerStates, format) {
	const f = normalizeMatchFormat(format);
	return (playerStates ?? []).findIndex((state) => isMatchWon(state, f));
}
