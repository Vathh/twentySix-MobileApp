import {
	decorateFavoriteExercise,
	exerciseDisplayName,
	favoriteItemKey,
	hasDetailVariantFavorites,
	isVariantFavorited,
	playRouteFromFavoriteItem,
} from '../exerciseVariantFavorites.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runExerciseVariantFavoritesTests() {
	assert(
		exerciseDisplayName('clock_1_20_bull', '') === 'Zegar — Szybki',
		'nazwa zegara szybkiego',
	);
	assert(
		exerciseDisplayName('nine_darts', '18') === '9/18 lotek — 18 lotek',
		'nazwa 18 lotek',
	);
	assert(
		exerciseDisplayName('scoring_under_pressure', '20/19/18') === 'Scoring z presją — 20/19/18',
		'nazwa scoring pressure',
	);

	assert(hasDetailVariantFavorites({ exerciseKey: 'nine_darts' }), '9/18 ma warianty');
	assert(hasDetailVariantFavorites({ exerciseKey: 'clock_sdt' }), 'zegar ma warianty');
	assert(!hasDetailVariantFavorites({ exerciseKey: 'loose_throws' }), 'luźne bez wariantów');

	assert(
		favoriteItemKey({ kind: 'plan', id: 7 }) === 'plan:7',
		'klucz planu',
	);
	assert(
		favoriteItemKey({ kind: 'exercise', exerciseKey: 'nine_darts', variant: '9' })
			=== 'exercise:nine_darts:9',
		'klucz wariantu',
	);

	const favorites = [
		{ exerciseKey: 'nine_darts', variant: '9', favorite: true },
		{ exerciseKey: 'bobs_27_easy', variant: null, favorite: true },
	];
	assert(isVariantFavorited(favorites, 'nine_darts', '9'), '9 lotek ulubione');
	assert(!isVariantFavorited(favorites, 'nine_darts', '18'), '18 lotek nie');
	assert(isVariantFavorited(favorites, 'bobs_27_easy', ''), 'bob easy');

	const decorated = decorateFavoriteExercise({
		kind: 'exercise',
		id: 'clock_sdt',
		exerciseKey: 'clock_sdt',
		name: 'Zegar',
	});
	assert(decorated.name === 'Zegar — Sektory', 'dekoracja nazwy zegara');
	assert(decorated.key === 'exercise:clock_sdt', 'klucz po dekoracji');

	const route = playRouteFromFavoriteItem({
		kind: 'exercise',
		id: 'nine_darts',
		exerciseKey: 'nine_darts',
		variant: '18',
		name: '9/18 lotek',
	});
	assert(route?.screen === 'TrainingExercise', 'nawigacja do gry');
	assert(route?.params?.variant === '18', 'wariant w params');
}
