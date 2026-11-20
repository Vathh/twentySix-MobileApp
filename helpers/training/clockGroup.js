/** Jedno ćwiczenie Zegar. Trzy warianty zostają osobnymi kluczami reguł. */

export const CLOCK_NAME = 'Zegar';
export const CLOCK_LIBRARY_KEY = 'clock_1_20_bull';

export const CLOCK_VARIANTS = [
	{
		id: 'fast',
		label: 'Szybki',
		exerciseKey: 'clock_1_20_bull',
		durationSeconds: null,
		dartCount: 21,
	},
	{
		id: 'sectors',
		label: 'Sektory',
		exerciseKey: 'clock_sdt',
		durationSeconds: 300,
		dartCount: null,
	},
	{
		id: 'double',
		label: 'Double',
		exerciseKey: 'doubles_clock',
		durationSeconds: null,
		dartCount: 21,
	},
];

const CLOCK_KEYS = new Set(CLOCK_VARIANTS.map((variant) => variant.exerciseKey));

export function isClockKey(exerciseKey) {
	return CLOCK_KEYS.has(exerciseKey);
}

export function clockVariantId(exerciseKey) {
	return CLOCK_VARIANTS.find((variant) => variant.exerciseKey === exerciseKey)?.id ?? 'fast';
}

export function clockPlayDefinition(item, variantId) {
	const variant = CLOCK_VARIANTS.find((row) => row.id === variantId) ?? CLOCK_VARIANTS[0];
	return {
		...item,
		id: variant.exerciseKey,
		exerciseKey: variant.exerciseKey,
		name: CLOCK_NAME,
		kind: 'exercise',
		inactive: item?.inactive === true,
		durationSeconds: variant.durationSeconds,
		dartCount: variant.dartCount,
	};
}

function clockCard(source, extra) {
	return {
		...source,
		name: CLOCK_NAME,
		durationSeconds: null,
		dartCount: null,
		...extra,
	};
}

/** Biblioteka pokazuje jedną pozycję w miejscu pierwszego zegara. */
export function groupClockCatalog(items) {
	const list = Array.isArray(items) ? items : [];
	const clocks = list.filter((item) => isClockKey(item?.exerciseKey));
	if (clocks.length === 0) {
		return list;
	}
	const parent = clocks.find((item) => item.exerciseKey === CLOCK_LIBRARY_KEY) ?? clocks[0];
	const card = clockCard(parent, {
		id: CLOCK_LIBRARY_KEY,
		exerciseKey: CLOCK_LIBRARY_KEY,
		favorite: Boolean(parent.favorite),
	});
	let placed = false;
	const next = [];
	for (const item of list) {
		if (!isClockKey(item?.exerciseKey)) {
			next.push(item);
			continue;
		}
		if (!placed) {
			next.push(card);
			placed = true;
		}
	}
	return next;
}

/** Ulubione zwijają zegary w jedną kartę. clockKeys zostają do zdjęcia gwiazdki i do kolejności. */
export function groupClockFavorites(items) {
	const list = Array.isArray(items) ? items : [];
	const clocks = list.filter((item) => isClockKey(item?.exerciseKey));
	if (clocks.length === 0) {
		return list;
	}
	const card = clockCard(clocks[0], {
		favorite: true,
		clockKeys: clocks.map((item) => item.exerciseKey),
	});
	let placed = false;
	const next = [];
	for (const item of list) {
		if (!isClockKey(item?.exerciseKey)) {
			next.push(item);
			continue;
		}
		if (!placed) {
			next.push(card);
			placed = true;
		}
	}
	return next;
}

/** Optymistyczna lista trzyma surowe wiersze, żeby zwinięcie nie zgubiło kluczy. */
export function expandClockFavoriteItems(displayItems, storedItems) {
	const stored = Array.isArray(storedItems) ? storedItems : [];
	const clocks = stored.filter((item) => isClockKey(item?.exerciseKey));
	const next = [];
	for (const item of displayItems ?? []) {
		if (Array.isArray(item?.clockKeys)) {
			next.push(...clocks);
			continue;
		}
		const raw = stored.find((row) => row.id === item?.id);
		if (raw) {
			next.push(raw);
		}
	}
	return next;
}

/** Kolejność wraca do kluczy, które naprawdę są w ulubionych. */
export function expandClockFavoriteIds(displayItems) {
	const ids = [];
	for (const item of displayItems ?? []) {
		if (Array.isArray(item?.clockKeys) && item.clockKeys.length > 0) {
			ids.push(...item.clockKeys);
		} else if (item?.id != null) {
			ids.push(item.id);
		}
	}
	return ids;
}
