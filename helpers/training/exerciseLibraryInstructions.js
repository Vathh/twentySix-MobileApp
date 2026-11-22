/**
 * Szczegółowe instrukcje biblioteki — tylko ekran szczegółów ćwiczenia (nad „Rozpocznij”).
 * Treść według TWENTY_SIX_TRAINING.md; nie idzie na serwer.
 */

const LOOSE_THROWS = {
	goal: 'Swobodne przygotowanie do treningu i rozgrzanie ręki przed właściwymi ćwiczeniami.',
	how: [
		'Rzucaj lotkami w dowolne miejsca tarczy.',
		'Nie musisz trzymać się konkretnego sektora ani pola.',
		'Wykonuj rzuty w swoim naturalnym tempie. Na ekranie jest tylko zegar — nie wpisujesz wyników.',
	],
	scoring: [
		'Ćwiczenie nie jest punktowane.',
		'Nie oceniamy skuteczności i nie zapisujemy listy lotek.',
		'Zapisujemy czas oraz status ukończone albo pominięte.',
	],
	limit: '3 minuty.',
};

function nineDarts(variant) {
	const stage = variant === '18' ? 18 : 9;
	const total = stage * 4;
	return {
		goal: 'Poprawa skuteczności na środku oraz sektorach 20, 19 i 18.',
		how: [
			`Wykonaj cztery etapy, każdy po ${stage} lotek:`,
			`1. Środek tarczy — Outer Bull albo Inner Bull.`,
			`2. Sektor 20 (single, double lub triple).`,
			`3. Sektor 19.`,
			`4. Na zmianę sektory 20, 19 i 18 aż do końca etapu.`,
			'Po każdej lotce zaznacz na ekranie, czy trafiła w aktualny cel.',
		],
		scoring: [
			'Każde trafienie w aktualny cel daje 1 punkt. Pudło daje 0.',
			'Wynik to suma trafień. W podsumowaniu widać też skuteczność per cel (Bull, 20, 19, 18).',
		],
		limit: `Wariant ${stage} lotek: ${stage} lotek na etap, łącznie ${total} rzutów.`,
	};
}

function clock(variantId) {
	if (variantId === 'sectors') {
		return {
			goal: 'Poprawa celności przy rozmianach',
			how: [
				'Celuj kolejno w sektory 1–20, potem w Bull (Outer albo Inner).',
				'Pozostań na podświetlonym sektorze, aż go trafisz. Po trafieniu kolejna lotka idzie w następny cel — także w tej samej trójce.',
				'Pudło nie przesuwa celu. Koniec czasu urywa ćwiczenie na aktualnym sektorze. Ukończenie Bulla przed czasem kończy ćwiczenie.',
			],
			scoring: [
				'Idealne przejście bez pudła to 30 punktów (21 sektorów).',
				'Każde pudło odejmuje 1 punkt. Każdy sektor niezaliczony do końca czasu też odejmuje 1 punkt.',
				'Wynik może być ujemny.',
			],
			limit: '5 minut.',
		};
	}
	if (variantId === 'double') {
		return {
			goal: 'Poprawa skuteczności na podwójnych',
			how: [
				'Celuj kolejno po jednej lotce w Double 1–Double 20, potem w Bull.',
				'Po każdej lotce — trafionej albo pudle — przechodzisz do następnego celu. Nie wracasz do nietrafionego.',
				'Przy Bullu zaznaczasz Outer albo Inner.',
			],
			scoring: [
				'Trafienie Double 1–20 daje 3 punkty. Outer Bull daje 3 punkty. Inner Bull daje 6 punktów. Pudło daje 0.',
				'Wynik to suma punktów. W podsumowaniu widać też trafienia i procent.',
			],
			limit: '21 lotek (po jednej na cel).',
		};
	}
	return {
		goal: 'Poprawa celności przy szybkiej zmianie sektorów i rozmianach.',
		how: [
			'Celuj kolejno po jednej lotce w sektory 1–20, potem w Bull (Outer albo Inner).',
			'Po każdej lotce — trafionej albo pudle — przechodzisz do następnego celu. Nie wracasz do nietrafionego.',
		],
		scoring: [
			'Każde trafienie daje 1 punkt. Pudło daje 0.',
			'Wynik to suma punktów. W podsumowaniu widać też trafienia i procent.',
		],
		limit: '21 lotek (po jednej na cel).',
	};
}

function bobs27(variantId) {
	if (variantId === 'hard') {
		return {
			goal: 'Poprawa skuteczności na podwójnych',
			how: [
				'Startujesz z licznikiem 27. Cele: D1–D20, a na końcu Inner Bull (wartość 50). Outer Bull przy Innerze jest pudłem.',
				'Na każdy cel trzy lotki. Każde trafienie w aktualny Double dodaje jego wartość (do Twojego licznika). Trzy pudła odejmują ją raz.',
				'Jeśli rozliczenie celu zjechałoby wynik poniżej 1, ćwiczenie się kończy — zapisujemy 0, nie liczbę ujemną.',
				'Inaczej koniec po 5 minutach albo po rozliczeniu Innera, ze stanem licznika.',
			],
			scoring: [
				'W trakcie widać aktualny wynik licznika.',
				'Wynik końcowy to stan licznika albo 0, gdy ćwiczenie urwało się poniżej 1.',
			],
			limit: '5 minut.',
		};
	}
	return {
		goal: 'Poprawa skuteczności na podwójnych',
		how: [
			'Startujesz z licznikiem 27.',
			'Na każdy cel masz trzy lotki: najpierw D1, potem D2, aż do D20. Bez Bulla.',
			'Każde trafienie w aktualny Double dodaje jego wartość (do Twojego licznika). Wartości: D1 = 2, D2 = 4, …, D20 = 40.',
			'Trzy pudła na tym samym celu odejmują tę wartość raz. Jedno lub dwa pudła wyniku nie zmieniają.',
			'Niedokończona trójka na końcu czasu nic nie dodaje i nic nie odejmuje. Rozliczenie D20 przed czasem kończy ćwiczenie.',
		],
		scoring: [
			'Wynik to stan licznika — może zejść poniżej zera i ćwiczenie jedzie dalej.',
			'W trakcie wynik nie jest pokazywany. Widać go w podsumowaniu wraz z trafieniami i procentem.',
		],
		limit: '5 minut.',
	};
}

const CATCH_20 = {
	goal: 'Poprawa skuteczności na niskich checkoutach pod presją czasu',
	how: [
		'Rozpoczynasz od 41 i idziesz kolejno do 60. Nie wracasz do wcześniejszych wartości.',
		'Na każdy checkout masz dwie wizyty po najwyżej 3 lotki.',
		'Zamknięcie jak w X01: dokładnie zero, ostatnia lotka w Double. Bust (przestrzelenie, zostawienie 1, zła ostatnia lotka) nie zamyka.',
		'Bust w pierwszej wizycie wraca do wartości checkoutu — zostaje druga wizyta. Bust w drugiej albo dwie wizyty bez zamknięcia przenoszą na następny checkout.',
		'Koniec czasu urywa otwartą wizytę — nie zamyka i nie wchodzi do wyniku.',
	],
	scoring: [
		'Za każdy skutecznie zamknięty checkout dostajesz 2 punkty. Wynik to suma tych punktów.',
		'W trakcie ćwiczenia nie pokazujemy liczby pomyślnych zamknięć ani stanu punktowego.',
	],
	limit: '9 minut albo przejście wszystkich wartości 41–60.',
};

function scoringPressure(variant) {
	const aim = variant === '20/19/18'
		? 'Cel zmienia się co lotkę: 20, potem 19, potem 18 i od nowa.'
		: `Celujesz cały czas w sektor ${variant || '20'}.`;
	return {
		goal: 'Poprawa regularności na punktacji oraz punktacji pod presją',
		how: [
			aim,
			'Single aktualnego sektora dodaje do wyniku ćwiczenia 1 punkt, double dodaje 2 punkty, triple dodaje 3 punkty.',
			'Pomyłka na sektorze zeruje bieżącą serię. Kolejna trafiona lotka zaczyna nową.',
			'W trakcie ćwiczenia widać tylko wynik bieżącej serii, nie najwyższej.',
		],
		scoring: [
			'Wynik ćwiczenia to najwyższa uzyskana seria punktowa.',
			'W podsumowaniu widać też trafienia i procentową skuteczność.',
		],
		limit: '5 minut.',
	};
}

const SCORING_65 = {
	goal: 'Poprawa punktacji i utrzymania jej regularności',
	how: [
		'Sumujesz punkty uzyskane w każdym podejściu do tarczy (3 lotki). W grze biorą udział wszystkie sektory na tarczy.',
		'Jeśli suma podejścia wynosi co najmniej 65, dostajesz 1 punkt ćwiczenia. Słabsze podejście daje 0.',
		'Powtarzasz podejścia do końca czasu. Urwane podejście na końcu czasu nie wchodzi do wyniku.',
	],
	scoring: [
		'Wynik to liczba podejść za 65+.',
		'W podsumowaniu widać też średnią punktów zakończonych podejść (także tych poniżej 65).',
	],
	limit: '5 minut.',
};

const SINGLES = {
	goal: 'Trening celności na polach Single oraz poruszania się po ścieżce sektorów pod presją czasu.',
	how: [
		'Ścieżka: 1 → 2 → … → 20 → Bull → 20 → 19 → … → 1. Bull zalicza Outer albo Inner.',
		'Liczą się tylko Single. Double i Triple nie zaliczają sektora.',
		'Podejście ma trzy lotki. Trafienie Single aktualnego sektora przesuwa Cię dalej już przy następnej lotce — w jednej trójce możesz przejść kilka sektorów.',
		'Jeśli żadna z trzech lotek nie trafi sektora aktualnego przy tej lotce, cofasz się o jeden sektor (nie niżej niż 1).',
		'Po Bullu kierunek się odwraca. Single 1 na powrocie kończy ścieżkę; jeśli został czas, nowa ścieżka startuje od 1.',
	],
	scoring: [
		'W drodze do Bulla: punkty równe numerowi sektora, Bull = 25.',
		'W drodze powrotnej: 25 + krok od 20 (20 = 26, …, 1 = 45).',
		'Wynik końcowy to suma ukończonych ścieżek plus punkty pozycji ścieżki niedokończonej w chwili końca czasu.',
	],
	limit: '10 minut.',
};

const CHECKOUT_41 = {
	goal: 'Poprawa skuteczności na niskich checkoutach z rozmianą',
	how: [
		'Start od 41. Na każdą wartość masz najwyżej 3 lotki (jedna wizyta).',
		'Zamknięcie jak w X01: dokładnie zero, ostatnia lotka w Double. Bust nie zamyka i kończy wizytę.',
		'Sukces: wchodzisz o jeden w górę. Porażka: schodzisz o jeden, nie niżej niż 41.',
		'Niedokończona wizyta na końcu czasu nie zamyka i nie wchodzi do wyniku.',
	],
	scoring: [
		'Zapisywany jest najwyższy zamknięty checkout — nawet jeśli później zejdziesz niżej.',
		'41 = 1 pkt. Każdy kolejny aż do 50 dokłada 5. Każdy powyżej 50 dokłada 7.',
		'Przykłady: 49 → 41 pkt, 50 → 46, 51 → 53, 52 → 60. Górnego limitu nie ma.',
	],
	limit: '10 minut.',
};

const CHECKOUT_BULL_81 = {
	goal: 'Poprawa skuteczności przy rozmianach oraz celności na środku tarczy',
	how: [
		'Każde podejście ma zawsze 3 lotki. Wpisujesz każde podejście po jednej lotce.',
		'Dwie pierwsze lotki ustawiają checkout — odejmują pełną wartość z tarczy (single, double, triple, Outer 25, Inner 50). Pudło odejmuje 0. Zawsze rzucasz trzecią lotkę.',
		'Trzecia lotka zawsze idzie w czerwony środek.',
		'Kolejność wartości: 81 → … → 90, potem powrót 89 → … → 81. Po ponownym zamknięciu 81, jeśli został czas, kolejna runda od 81.',
		'Nieudane podejście (także z bonusem) zostawia tę samą wartość checkoutu.',
	],
	scoring: [
		'Zamknięcie (+10): po dwóch lotkach zostało dokładnie 50 i trzecia trafiła Inner. Outer przy ustawionych 50 nie zamyka.',
		'Bonus (+4): po dwóch lotkach nie zostało 50, a trzecia trafiła Inner.',
		'Wynik to suma zamknięć i bonusów. W trakcie ćwiczenia nie pokazujemy aktualnego wyniku.',
	],
	limit: '8 minut.',
};

const BULL_COUNTER = {
	goal: 'Poprawa celności na środku tarczy przy walce o pierwszeństwo przy tarczy',
	how: [
		'Używaj tylko jednej lotki — po rzucie wyciągasz ją z tarczy i rzucasz ponownie.',
		'Celuj w środek. Na ekranie zaznaczasz Inner, Outer albo Pudło.',
	],
	scoring: [
		'Inner (czerwony) — 4 punkty.',
		'Outer (zielony) — 2 punkty.',
		'Poza Bullem — 0.',
		'Wynik to suma punktów. W trakcie widać aktualny wynik.',
	],
	limit: '3 minuty.',
};

const FIFTY_FOUR_DART = {
	goal: 'Sprawdzenie punktacji, doubli i shanghai pod stałą liczbą 54 rzutów.',
	how: [
		'Wyzwanie ma trzy etapy bez pauzy i bez wznowienia. Przerwanie kończy próbę bez zapisu.',
		'Etap 1 — Shanghai 10–15: na każdy sektor trzy lotki. Wpisujesz Single, Double, Triple albo Pudło. Najbardziej optymalne jest trafienie pełnego shanghai (S, D, T).',
		'Etap 2 — Doubles: po jednej lotce w D1–D20 + Inner Bull. Outer bull traktowany jest jako pudło.',
		'Etap 3 — Shanghai 16–20: jak etap 1, sektory 16–20. Najbardziej optymalne jest trafienie pełnego shanghai (S, D, T).',
		'Po każdym sektorze lub celu od razu idzie następny. W trakcie nie widać sumy punktów.',
	],
	scoring: [
		'Shanghai: wartość pojedyncza daje 15 punktów, podwójna 30 punktów, potrójna 45 punktów. Za komplet trafień (pojedyncza, podwójna, potrójna) w jednym podejściu dodatkowo doliczane jest 100 punktów.',
		'Doubles: trafiony double daje 50. Inner Bull daje 100. Outer Bull nie jest trafieniem (0).',
		'Wynik to suma trzech etapów. Maksimum 3190. Punktację łączną widać dopiero w podsumowaniu.',
	],
	limit: '54 lotki (18 w Shanghai 10–15, 21 w Doubles, 15 w Shanghai 16–20).',
};

/**
 * @param {{ exerciseKey?: string|null, kind?: string, challengeKey?: string, mechanic?: string }} definition
 * @param {{ clockVariant?: string, dartVariant?: string, pressureVariant?: string, bobsVariant?: string }} [opts]
 * @returns {{ goal: string, how: string[], scoring: string[], limit: string }|null}
 */
export function libraryInstructionsFor(definition, opts = {}) {
	const challengeKey = definition?.challengeKey || definition?.mechanic;
	if (definition?.kind === 'challenge' && challengeKey === 'fifty_four_dart') {
		return FIFTY_FOUR_DART;
	}
	const key = definition?.exerciseKey;
	if (!key) {
		return null;
	}
	if (key === 'loose_throws') {
		return LOOSE_THROWS;
	}
	if (key === 'nine_darts') {
		return nineDarts(opts.dartVariant);
	}
	if (key === 'clock_1_20_bull' || key === 'clock_sdt' || key === 'doubles_clock') {
		const fromKey = key === 'clock_sdt' ? 'sectors' : key === 'doubles_clock' ? 'double' : 'fast';
		return clock(opts.clockVariant || fromKey);
	}
	if (key === 'bobs_27_easy' || key === 'bobs_27_hard') {
		const fromKey = key === 'bobs_27_hard' ? 'hard' : 'easy';
		return bobs27(opts.bobsVariant || fromKey);
	}
	if (key === 'catch_20') {
		return CATCH_20;
	}
	if (key === 'scoring_under_pressure') {
		return scoringPressure(opts.pressureVariant || '20');
	}
	if (key === 'scoring_65') {
		return SCORING_65;
	}
	if (key === 'singles_under_pressure') {
		return SINGLES;
	}
	if (key === 'checkout_41') {
		return CHECKOUT_41;
	}
	if (key === 'checkout_bull_81') {
		return CHECKOUT_BULL_81;
	}
	if (key === 'bull_counter') {
		return BULL_COUNTER;
	}
	return null;
}

export const LOOSE_THROWS_AIM_TEXT = 'Celuj gdziekolwiek, rozgrzej rękę.';
