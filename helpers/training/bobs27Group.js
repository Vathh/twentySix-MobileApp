/** Jedno ćwiczenie Bob's 27. Easy i hard zostają osobnymi kluczami reguł. */

export const BOBS_NAME = "Bob's 27";
export const BOBS_LIBRARY_KEY = 'bobs_27_easy';

export const BOBS_VARIANTS = [
	{
		id: 'easy',
		label: 'Easy',
		exerciseKey: 'bobs_27_easy',
		durationSeconds: 300,
	},
	{
		id: 'hard',
		label: 'Hard',
		exerciseKey: 'bobs_27_hard',
		durationSeconds: 300,
	},
];

const BOBS_KEYS = new Set(BOBS_VARIANTS.map((variant) => variant.exerciseKey));

export function isBobsKey(exerciseKey) {
	return BOBS_KEYS.has(exerciseKey);
}

export function bobsVariantId(exerciseKey) {
	return BOBS_VARIANTS.find((variant) => variant.exerciseKey === exerciseKey)?.id ?? 'easy';
}

export function bobsPlayDefinition(item, variantId) {
	const variant = BOBS_VARIANTS.find((row) => row.id === variantId) ?? BOBS_VARIANTS[0];
	return {
		...item,
		id: variant.exerciseKey,
		exerciseKey: variant.exerciseKey,
		name: BOBS_NAME,
		kind: 'exercise',
		inactive: item?.inactive === true,
		durationSeconds: variant.durationSeconds,
		dartCount: null,
	};
}

function bobsCard(source, extra) {
	return {
		...source,
		name: BOBS_NAME,
		durationSeconds: null,
		dartCount: null,
		...extra,
	};
}

/** Biblioteka pokazuje jedną pozycję w miejscu pierwszego Boba. */
export function groupBobsCatalog(items) {
	const list = Array.isArray(items) ? items : [];
	const bobs = list.filter((item) => isBobsKey(item?.exerciseKey));
	if (bobs.length === 0) {
		return list;
	}
	const parent = bobs.find((item) => item.exerciseKey === BOBS_LIBRARY_KEY) ?? bobs[0];
	const card = bobsCard(parent, {
		id: BOBS_LIBRARY_KEY,
		exerciseKey: BOBS_LIBRARY_KEY,
		favorite: Boolean(parent.favorite),
	});
	let placed = false;
	const next = [];
	for (const item of list) {
		if (!isBobsKey(item?.exerciseKey)) {
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

/** Ulubione zwijają Boby w jedną kartę. */
export function groupBobsFavorites(items) {
	const list = Array.isArray(items) ? items : [];
	const bobs = list.filter((item) => isBobsKey(item?.exerciseKey));
	if (bobs.length === 0) {
		return list;
	}
	const card = bobsCard(bobs[0], {
		favorite: true,
		bobsKeys: bobs.map((item) => item.exerciseKey),
	});
	let placed = false;
	const next = [];
	for (const item of list) {
		if (!isBobsKey(item?.exerciseKey)) {
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

export function expandBobsFavoriteItems(displayItems, storedItems) {
	const stored = Array.isArray(storedItems) ? storedItems : [];
	const bobs = stored.filter((item) => isBobsKey(item?.exerciseKey));
	const next = [];
	for (const item of displayItems ?? []) {
		if (Array.isArray(item?.bobsKeys)) {
			next.push(...bobs);
			continue;
		}
		const raw = stored.find((row) => row.id === item?.id);
		if (raw) {
			next.push(raw);
		}
	}
	return next;
}

export function expandBobsFavoriteIds(displayItems) {
	const ids = [];
	for (const item of displayItems ?? []) {
		if (Array.isArray(item?.bobsKeys) && item.bobsKeys.length > 0) {
			ids.push(...item.bobsKeys);
		} else if (item?.id != null) {
			ids.push(item.id);
		}
	}
	return ids;
}
