import {
	NINE_DARTS_LENGTH,
	aimAt,
	aimInstruction,
	canPlayNineDarts,
	currentAim,
	dartHitsAim,
	nineDartsCompletion,
	nineDartsLength,
	nineDartsStats,
	recordNineDart,
	startNineDartsSession,
	undoNineDart,
} from '../nineDartsExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, darts) {
	return darts.reduce(
		(session, dart) => recordNineDart(session, dart),
		startNineDartsSession(definition, '22222222-2222-4222-8222-222222222222'),
	);
}

const definition = {
	id: 'nine_darts',
	kind: 'exercise',
	name: '9 lotek',
	exerciseKey: 'nine_darts',
	dartCount: 36,
	inactive: false,
};

export function runNineDartsExerciseTests() {
	assert(nineDartsLength(null) === NINE_DARTS_LENGTH, 'domyślnie 36 lotek');
	assert(nineDartsLength(10) === 10, 'krótsza definicja ucina sekwencję');
	assert(nineDartsLength(80) === NINE_DARTS_LENGTH, 'dłuższa definicja nie dokłada lotek');
	assert(nineDartsLength(36, '18') === 72, 'wariant 18 ma 72 lotki');
	assert(aimAt(17, 18).kind === 'bull', 'w wariancie 18 osiemnasta lotka zostaje na środku');
	assert(aimAt(18, 18).number === 20, 'w wariancie 18 dziewiętnasta lotka wchodzi w 20');
	assert(aimAt(54, 18).number === 20, 'czwarty etap wariantu 18 zaczyna od 20');
	assert(aimAt(71, 18).number === 18, 'ostatnia lotka wariantu 18 celuje w 18');

	assert(aimAt(0).kind === 'bull', 'pierwsze 9 lotek celuje w środek');
	assert(aimAt(8).kind === 'bull', 'dziewiąta lotka zostaje na środku');
	assert(aimAt(9).number === 20, 'drugi etap celuje w 20');
	assert(aimAt(18).number === 19, 'trzeci etap celuje w 19');
	assert(aimAt(27).number === 20, 'czwarty etap zaczyna od 20');
	assert(aimAt(28).number === 19, 'potem 19');
	assert(aimAt(29).number === 18, 'potem 18');
	assert(aimAt(35).number === 18, 'ostatnia lotka celuje w 18');
	const instructionText = (index) => aimInstruction(aimAt(index)).map((part) => part.text).join('');
	const strongText = (index) => aimInstruction(aimAt(index)).filter((part) => part.strong).map((part) => part.text);
	assert(instructionText(0) === 'Celuj w czerwony środek.', 'instrukcja środka');
	assert(strongText(0).join(',') === 'środek', 'środek jest pogrubiony');
	assert(instructionText(9) === 'Celuj w sektor 20.', 'instrukcja sektora 20');
	assert(instructionText(18) === 'Celuj w sektor 19.', 'instrukcja sektora 19');
	assert(instructionText(27) === 'Celuj kolejno po jednej lotce w sektor 20, 19 i 18.', 'instrukcja ostatniego etapu');
	assert(instructionText(35) === instructionText(27), 'ostatni etap ma jedną instrukcję');
	assert(strongText(27).join(',') === '20,19,18', 'numery ostatniego etapu są pogrubione');

	assert(canPlayNineDarts(definition), 'aktywne 9 lotek da się rozpocząć');
	assert(!canPlayNineDarts({ ...definition, inactive: true }), 'nieaktywne 9 lotek nie startuje');
	assert(!canPlayNineDarts({ ...definition, exerciseKey: 'clock_1_20_bull' }), 'zegar nie startuje tym silnikiem');

	let session = startNineDartsSession(definition, definition.id);
	assert(currentAim(session).kind === 'bull', 'start na środku');
	assert(recordNineDart(session, { ring: 'triple', number: 20 }) === session, 'sektor na środku nie wchodzi');
	session = recordNineDart(session, { ring: 'inner' });
	session = recordNineDart(session, { ring: 'outer' });
	session = recordNineDart(session, { ring: 'miss' });
	assert(session.darts.length === 3, 'środek przyjmuje inner, outer i pudło');
	assert(nineDartsStats(session).hits === 2, 'inner i outer są trafieniami');
	assert(currentAim(session).kind === 'bull', 'etap trwa do dziewiątej lotki');

	for (let index = session.darts.length; index < 9; index += 1) {
		session = recordNineDart(session, { ring: 'inner' });
	}
	assert(currentAim(session).number === 20, 'po dziewięciu lotkach wchodzi sektor 20');
	session = recordNineDart(session, { ring: 'inner' });
	assert(session.darts.length === 9, 'przycisk środka nie działa na sektorze');
	session = recordNineDart(session, { ring: 'triple' });
	session = recordNineDart(session, { ring: 'double' });
	session = recordNineDart(session, { ring: 'single' });
	session = recordNineDart(session, { ring: 'miss' });
	assert(nineDartsStats(session).stages[1].hits === 3, 'każdy pierścień 20 jest trafieniem');
	assert(nineDartsStats(session).stages[1].attempts === 4, 'pudło sektora jest liczone');

	session = undoNineDart(session);
	assert(currentAim(session).number === 20, 'cofnięcie zostaje w etapie');
	assert(session.status === 'playing', 'cofnięcie otwiera grę');
	for (let index = 0; index < 9; index += 1) {
		session = undoNineDart(session);
	}
	assert(currentAim(session).kind === 'bull', 'cofnięcie wraca do poprzedniego etapu');

	const stageFour = [
		{ ring: 'triple', number: 20 },
		{ ring: 'single', number: 19 },
		{ ring: 'double', number: 20 },
		{ ring: 'miss' },
		{ ring: 'triple', number: 19 },
		{ ring: 'single', number: 18 },
		{ ring: 'double', number: 20 },
		{ ring: 'single', number: 18 },
		{ ring: 'triple', number: 18 },
	];
	const prefix = [];
	for (let index = 0; index < 27; index += 1) {
		prefix.push(index < 9 ? { ring: 'outer' } : { ring: 'single' });
	}
	const finished = play(definition, [...prefix, ...stageFour]);
	assert(finished.status === 'completed', 'ostatnia lotka kończy ćwiczenie');
	assert(currentAim(finished) === null, 'po końcu nie ma celu');
	assert(recordNineDart(finished, { ring: 'single', number: 18 }) === finished, 'po końcu lotka nie dochodzi');
	const undone = undoNineDart(finished);
	assert(undone.status === 'playing', 'cofnięcie otwiera domknięte ćwiczenie');
	assert(currentAim(undone).number === 18, 'wraca ostatni cel');

	const stats = nineDartsStats(finished);
	assert(stats.stages.length === 4, 'pełne ćwiczenie ma cztery etapy');
	assert(stats.stages[0].hits === 9 && stats.stages[0].percent === 100, 'środek policzony osobno');
	assert(stats.stages[1].label === 'Sektor 20', 'drugi etap to sektor 20');
	assert(stats.stages[2].label === 'Sektor 19', 'trzeci etap to sektor 19');
	assert(stats.stages[3].hits === 6 && stats.stages[3].percent === 67, 'na zmianę liczy tylko aktualny sektor');
	assert(stats.attempts === 36, 'łącznie 36 lotek');
	assert(stats.hits === 33, 'trzy pudła schodzą z łącznych trafień');
	assert(!Object.prototype.hasOwnProperty.call(stats, 'darts'), 'statystyki nie mają listy lotek');
	const aim20 = stats.aims.find((row) => row.aim === '20');
	const aim19 = stats.aims.find((row) => row.aim === '19');
	const aim18 = stats.aims.find((row) => row.aim === '18');
	assert(aim20 && aim20.attempts === stats.stages[1].attempts + 3, 'etap 4 dolicza lotki 20 do sektora 20');
	assert(aim19 && aim19.attempts === stats.stages[2].attempts + 3, 'etap 4 dolicza lotki 19 do sektora 19');
	assert(aim18 && aim18.attempts === 3 && aim18.hits === 2, 'etap 4 ma trzy lotki w 18');
	assert(!stats.aims.some((row) => /19 i 18|Sektor/.test(row.aim)), 'brak zbiorczego / „Sektor …” pierścienia');

	const record = nineDartsCompletion(finished, '2026-11-20T12:00:00.000Z');
	assert(record.score === 33, 'każde trafienie daje 1 punkt');
	assert(!Object.prototype.hasOwnProperty.call(record, 'darts'), 'zapis nie ma listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'nine_darts', 'zapis wskazuje ćwiczenie');
	assert(!JSON.stringify(body).includes('"darts"'), 'na serwer nie idą lotki');

	const short = play({ ...definition, dartCount: 10 }, [
		...Array.from({ length: 9 }, () => ({ ring: 'miss' })),
		{ ring: 'double' },
	]);
	assert(short.status === 'completed', 'krótsza definicja kończy się wcześniej');
	const shortStats = nineDartsStats(short);
	assert(shortStats.stages.length === 2, 'ucięte ćwiczenie nie otwiera dalszych etapów');
	assert(shortStats.stages[1].attempts === 1 && shortStats.stages[1].hits === 1, 'ostatni etap ma jedną lotkę');
	assert(dartHitsAim(aimAt(9), { number: 19, ring: 'triple' }) === false, 'inny sektor pudłuje');

	let wide = startNineDartsSession(definition, definition.id, '18');
	assert(wide.length === 72 && wide.stageSize === 18, 'start wariantu 18');
	for (let index = 0; index < 18; index += 1) {
		wide = recordNineDart(wide, { ring: 'outer' });
	}
	assert(wide.status === 'playing', '18 lotek środka nie kończy ćwiczenia');
	assert(currentAim(wide).number === 20, 'po 18 lotkach wchodzi sektor 20');
	assert(nineDartsStats(wide).stages[0].attempts === 18, 'etap środka liczy 18 lotek');
	assert(nineDartsStats(wide).variant === '18', 'zapis pamięta wariant');
}
