import {
	BOBS_NAME,
	bobsPlayDefinition,
	bobsVariantId,
	expandBobsFavoriteIds,
	groupBobsCatalog,
	groupBobsFavorites,
} from '../bobs27Group.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runBobs27GroupTests() {
	const catalog = [
		{ id: 'loose_throws', exerciseKey: 'loose_throws', name: 'Luźne rzuty', favorite: false },
		{ id: 'bobs_27_easy', exerciseKey: 'bobs_27_easy', name: "Bob's 27 easy", durationSeconds: 300, favorite: true },
		{ id: 'catch_20', exerciseKey: 'catch_20', name: 'Catch20', favorite: false },
		{ id: 'bobs_27_hard', exerciseKey: 'bobs_27_hard', name: "Bob's 27 hard", durationSeconds: 300, favorite: false },
	];
	const grouped = groupBobsCatalog(catalog);
	assert(grouped.length === 3, 'dwa Boby stają się jedną pozycją');
	assert(
		grouped.map((item) => item.exerciseKey).join(',') === 'loose_throws,bobs_27_easy,catch_20',
		'Bob zostaje w miejscu easy',
	);
	assert(grouped[1].name === BOBS_NAME, 'pozycja nazywa się Bob\'s 27');
	assert(grouped[1].favorite === true, 'gwiazdka jest z wariantu easy');

	assert(bobsVariantId('bobs_27_hard') === 'hard', 'hard rozpoznaje swój klucz');
	const started = bobsPlayDefinition(grouped[1], 'hard');
	assert(started.exerciseKey === 'bobs_27_hard', 'start hard idzie w swój klucz');
	assert(started.name === BOBS_NAME, 'sesja nazywa się Bob\'s 27');
	assert(started.durationSeconds === 300, 'hard ma 5 minut');

	const favorites = groupBobsFavorites([
		catalog[3],
		catalog[0],
		catalog[1],
	]);
	assert(favorites.length === 2, 'dwa ulubione Boby są jedną kartą');
	assert(favorites[0].name === BOBS_NAME, 'ulubiony Bob nazywa się Bob\'s 27');
	assert(favorites[0].bobsKeys.join(',') === 'bobs_27_hard,bobs_27_easy', 'karta pamięta oba klucze');
	const moved = [favorites[1], favorites[0]];
	assert(
		expandBobsFavoriteIds(moved).join(',') === 'loose_throws,bobs_27_hard,bobs_27_easy',
		'kolejność rozwija klucze Boba',
	);
}
