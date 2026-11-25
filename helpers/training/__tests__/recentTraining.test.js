import { placeRecent } from '../recentTraining.js';
import { trainingInitials } from '../trainingInitials.js';
import { trainingMeta } from '../trainingMeta.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runRecentTrainingTests() {
	const plan = { id: 1, kind: 'plan', name: 'Wieczór' };
	const exercise = { id: 2, kind: 'exercise', name: 'Zegar' };
	const challenge = { id: 3, kind: 'challenge', name: '54 lotki' };
	const fourth = { id: 4, kind: 'plan', name: 'Rano' };

	let list = placeRecent([], plan);
	list = placeRecent(list, exercise);
	list = placeRecent(list, challenge);
	list = placeRecent(list, fourth);
	assert(list.map((item) => item.id).join() === '4,3,2,1', 'cztery pozycje mieszczą się w limicie 6');
	assert(list.length === 4, 'na razie cztery');

	for (let id = 5; id <= 7; id += 1) {
		list = placeRecent(list, { id, kind: 'plan', name: `Plan ${id}` });
	}
	assert(list.length === 6, 'limit zostaje sześć');
	assert(list.map((item) => item.id).join() === '7,6,5,4,3,2', 'najstarsza wypada po przekroczeniu limitu');
	assert(list.every((item) => item.id !== 1), 'najstarsza znika');

	list = placeRecent(list, exercise);
	assert(list.map((item) => item.key).join() === 'exercise:2,plan:7,plan:6,plan:5,plan:4,challenge:3', 'ponowienie idzie na początek');
	assert(list.length === 6, 'limit zostaje sześć');

	const sameNumber = placeRecent(list, { id: 4, kind: 'exercise', name: 'Inne' });
	assert(sameNumber[0].key === 'exercise:4', 'inny rodzaj o tym samym id jest osobną pozycją');
	assert(sameNumber.some((item) => item.key === 'plan:4'), 'plan o tym id zostaje');

	const withVariant = placeRecent([], {
		id: 'nine_darts',
		kind: 'exercise',
		name: '9/18 lotek — 9 lotek',
		variant: '9',
	});
	const bothVariants = placeRecent(withVariant, {
		id: 'nine_darts',
		kind: 'exercise',
		name: '9/18 lotek — 18 lotek',
		variant: '18',
	});
	assert(bothVariants.length === 2, 'warianty to osobne ostatnie');
	assert(bothVariants[0].key === 'exercise:nine_darts:18', 'klucz wariantu 18');
	assert(bothVariants[1].key === 'exercise:nine_darts:9', 'klucz wariantu 9');

	assert(trainingInitials('Luźne rzuty') === 'LR', 'dwa słowa');
	assert(trainingInitials('Luźne rzuty sprawdzenie') === 'LS', 'pierwsze i ostatnie słowo');
	assert(trainingInitials('Zegar') === 'ZE', 'jedno słowo');
	assert(trainingInitials('  ') === '?', 'pusta nazwa');

	assert(
		trainingMeta({
			difficultyLabel: 'Łatwy',
			durationSeconds: 180,
			mechanicLabel: 'Luźne rzuty',
		}) === 'Łatwy · 3 min · Luźne rzuty',
		'meta ćwiczenia',
	);
	assert(
		trainingMeta({ difficultyLabel: 'Średni', declaredMinutes: 60 }) === 'Średni · 60 min',
		'meta planu',
	);
}
