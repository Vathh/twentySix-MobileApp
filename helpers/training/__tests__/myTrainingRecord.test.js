import {
	formatMyRecordLabel,
	pickMyRecordScore,
	resolvePlayExerciseKey,
	resolvePlayVariant,
} from '../myTrainingRecord.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const bundle = {
	items: [
		{ exerciseKey: 'bull_counter', variant: null, score: 12 },
		{ exerciseKey: 'nine_darts', variant: '9', score: 8 },
		{ exerciseKey: 'nine_darts', variant: '18', score: 14 },
		{ exerciseKey: 'scoring_under_pressure', variant: '20', score: 100 },
		{ exerciseKey: 'clock_1_20_bull', variant: null, score: 21 },
		{ exerciseKey: 'bobs_27_hard', variant: null, score: 40 },
	],
	definitions: [
		{ definitionId: 7, kind: 'plan', score: 220 },
		{ definitionId: 9, kind: 'challenge', score: 55 },
	],
};

export function runMyTrainingRecordTests() {
	assert(
		resolvePlayExerciseKey(
			{ kind: 'exercise', exerciseKey: 'clock_1_20_bull' },
			{ clockVariant: 'double' },
		) === 'doubles_clock',
		'zegar double → doubles_clock',
	);
	assert(
		resolvePlayExerciseKey(
			{ kind: 'exercise', exerciseKey: 'bobs_27_easy' },
			{ bobsVariant: 'hard' },
		) === 'bobs_27_hard',
		'bobs hard → bobs_27_hard',
	);
	assert(
		resolvePlayVariant(
			{ kind: 'exercise', exerciseKey: 'nine_darts' },
			{ dartVariant: '18' },
		) === '18',
		'nine_darts variant 18',
	);
	assert(
		resolvePlayVariant(
			{ kind: 'exercise', exerciseKey: 'scoring_under_pressure' },
			{ pressureVariant: '20/19/18' },
		) === '20/19/18',
		'scoring pressure rotation',
	);
	assert(
		pickMyRecordScore(bundle, { kind: 'exercise', exerciseKey: 'bull_counter' }) === 12,
		'bull_counter record',
	);
	assert(
		pickMyRecordScore(
			bundle,
			{ kind: 'exercise', exerciseKey: 'nine_darts' },
			{ dartVariant: '18' },
		) === 14,
		'nine_darts 18 record',
	);
	assert(
		pickMyRecordScore(
			bundle,
			{ kind: 'exercise', exerciseKey: 'clock_1_20_bull' },
			{ clockVariant: 'fast' },
		) === 21,
		'clock fast record',
	);
	assert(pickMyRecordScore(bundle, { kind: 'plan', id: 7 }) === 220, 'plan record');
	assert(pickMyRecordScore(bundle, { kind: 'challenge', id: 9 }) === 55, 'challenge record');
	assert(pickMyRecordScore(bundle, { kind: 'event', id: 3 }) === null, 'missing event');
	assert(formatMyRecordLabel(12) === 'Mój rekord: 12', 'label with score');
	assert(formatMyRecordLabel(null) === null, 'label without placeholder');
	assert(
		formatMyRecordLabel(null, { placeholder: true }) === 'Mój rekord: —',
		'label placeholder',
	);
}

runMyTrainingRecordTests();
