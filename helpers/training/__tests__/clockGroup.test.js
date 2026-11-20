import {
	CLOCK_NAME,
	clockPlayDefinition,
	clockVariantId,
	expandClockFavoriteIds,
	groupClockCatalog,
	groupClockFavorites,
} from '../clockGroup.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runClockGroupTests() {
	const catalog = [
		{ id: 'loose_throws', exerciseKey: 'loose_throws', name: 'Luźne rzuty', favorite: false },
		{ id: 'clock_1_20_bull', exerciseKey: 'clock_1_20_bull', name: 'Zegar szybki', dartCount: 21, favorite: true },
		{ id: 'bobs_27_easy', exerciseKey: 'bobs_27_easy', name: "Bob's 27 easy", favorite: false },
		{ id: 'clock_sdt', exerciseKey: 'clock_sdt', name: 'Zegar sektory', durationSeconds: 300, favorite: false },
		{ id: 'doubles_clock', exerciseKey: 'doubles_clock', name: 'Zegar doubli', dartCount: 21, favorite: true },
	];
	const grouped = groupClockCatalog(catalog);
	assert(grouped.length === 3, 'trzy zegary stają się jedną pozycją');
	assert(grouped.map((item) => item.exerciseKey).join(',') === 'loose_throws,clock_1_20_bull,bobs_27_easy', 'zegar zostaje w miejscu pierwszego');
	assert(grouped[1].name === CLOCK_NAME, 'pozycja nazywa się Zegar');
	assert(grouped[1].dartCount == null && grouped[1].durationSeconds == null, 'wspólna karta nie pokazuje limitu jednego wariantu');
	assert(grouped[1].favorite === true, 'gwiazdka jest z wariantu szybkiego');

	assert(clockVariantId('doubles_clock') === 'double', 'double rozpoznaje swój klucz');
	assert(clockVariantId('clock_sdt') === 'sectors', 'sektory rozpoznają swój klucz');
	const started = clockPlayDefinition(grouped[1], 'double');
	assert(started.exerciseKey === 'doubles_clock', 'start doubli idzie w swój klucz');
	assert(started.name === CLOCK_NAME, 'sesja nazywa się Zegar');
	assert(started.dartCount === 21, 'double ma 21 lotek');
	const sectors = clockPlayDefinition(grouped[1], 'sectors');
	assert(sectors.exerciseKey === 'clock_sdt' && sectors.durationSeconds === 300, 'sektory mają pięć minut');
	assert(sectors.dartCount == null, 'sektory nie mają limitu lotek');

	const favorites = groupClockFavorites([
		catalog[3],
		catalog[0],
		catalog[4],
	]);
	assert(favorites.length === 2, 'dwa ulubione zegary są jedną kartą');
	assert(favorites[0].name === CLOCK_NAME, 'ulubiony zegar nazywa się Zegar');
	assert(favorites[0].clockKeys.join(',') === 'clock_sdt,doubles_clock', 'karta pamięta oba klucze');
	const moved = [favorites[1], favorites[0]];
	assert(expandClockFavoriteIds(moved).join(',') === 'loose_throws,clock_sdt,doubles_clock', 'kolejność rozwija klucze zegara');
}
