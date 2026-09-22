/**
 * Skala UI względem telefonu (~390 dp szerokości).
 *
 * Telefony (shortest < 600) zostają 1:1.
 * Tablet 7" (~600) ≈ 1.17, 10" (~800) ≈ 1.34, większe max 1.36.
 * Współczynnik jest umiarkowany — nie skalujemy liniowo z szerokością,
 * bo 10" ma ~2× więcej dp niż iPhone i wtedy wszystko byłoby ogromne.
 */

export const TABLET_SHORTEST_DP = 600;
export const PHONE_BASE_SHORTEST_DP = 390;
export const MAX_UI_SCALE = 1.36;
export const MODERATE_FACTOR = 0.32;

const SCALABLE_KEYS = new Set([
	'fontSize',
	'lineHeight',
	'letterSpacing',
	'width',
	'height',
	'minWidth',
	'minHeight',
	'maxWidth',
	'maxHeight',
	'padding',
	'paddingTop',
	'paddingRight',
	'paddingBottom',
	'paddingLeft',
	'paddingHorizontal',
	'paddingVertical',
	'paddingStart',
	'paddingEnd',
	'margin',
	'marginTop',
	'marginRight',
	'marginBottom',
	'marginLeft',
	'marginHorizontal',
	'marginVertical',
	'marginStart',
	'marginEnd',
	'top',
	'right',
	'bottom',
	'left',
	'start',
	'end',
	'borderRadius',
	'borderTopLeftRadius',
	'borderTopRightRadius',
	'borderBottomLeftRadius',
	'borderBottomRightRadius',
	'borderTopStartRadius',
	'borderTopEndRadius',
	'borderBottomStartRadius',
	'borderBottomEndRadius',
	'borderWidth',
	'borderTopWidth',
	'borderRightWidth',
	'borderBottomWidth',
	'borderLeftWidth',
	'borderStartWidth',
	'borderEndWidth',
	'gap',
	'rowGap',
	'columnGap',
	'shadowRadius',
	'textShadowRadius',
	'outlineWidth',
	'outlineOffset',
]);

const TRANSLATE_KEYS = new Set(['translateX', 'translateY', 'translateZ']);

/**
 * Dodatkowe powiększenie głównego licznika wyniku na tablecie.
 * Telefon zostaje 1. Od 7" rośnie tak, by wynik było widać z ponad 2 m.
 * 7" ≈ 2.76, 10" ≈ 3.23, większe do 3.70.
 * StyleSheet i tak pomnoży font przez computeUiScale — tu jest sam dopisek.
 */
export function mainCounterBoost(shortestSide) {
	const shortest = Number(shortestSide);
	if (!Number.isFinite(shortest) || shortest < TABLET_SHORTEST_DP) {
		return 1;
	}
	const span = Math.min(1, (shortest - TABLET_SHORTEST_DP) / 400);
	return Math.round((1.75 + span * 0.6) * 1.575 * 100) / 100;
}

export function computeUiScale(shortestSide) {
	const shortest = Number(shortestSide);
	if (!Number.isFinite(shortest) || shortest < TABLET_SHORTEST_DP) {
		return 1;
	}
	const linear = shortest / PHONE_BASE_SHORTEST_DP;
	const moderated = 1 + (linear - 1) * MODERATE_FACTOR;
	return Math.min(MAX_UI_SCALE, Math.round(moderated * 1000) / 1000);
}

export function scaleNumeric(value, scale) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
		return value;
	}
	if (scale === 1) {
		return value;
	}
	return Math.round(value * scale * 10) / 10;
}

function scaleTransform(transform, scale) {
	if (!Array.isArray(transform)) {
		return transform;
	}
	return transform.map((entry) => {
		if (!entry || typeof entry !== 'object') {
			return entry;
		}
		const next = {};
		for (const [key, value] of Object.entries(entry)) {
			next[key] =
				TRANSLATE_KEYS.has(key) && typeof value === 'number'
					? scaleNumeric(value, scale)
					: value;
		}
		return next;
	});
}

function scaleShadowOffset(offset, scale) {
	if (!offset || typeof offset !== 'object') {
		return offset;
	}
	return {
		...offset,
		width: scaleNumeric(offset.width, scale),
		height: scaleNumeric(offset.height, scale),
	};
}

/** Kolumny treści (hub, formularze) rosną mocniej niż fonty — mniej „paska telefonu” na tablecie. */
export const CONTENT_MAX_WIDTH_THRESHOLD = 280;
export const CONTENT_MAX_WIDTH_BOOST = 1.45;

function scaleForLayoutMaxWidth(value, scale) {
	if (typeof value === 'number' && Math.abs(value) >= CONTENT_MAX_WIDTH_THRESHOLD) {
		const boosted = 1 + (scale - 1) * CONTENT_MAX_WIDTH_BOOST;
		return scaleNumeric(value, boosted);
	}
	return scaleNumeric(value, scale);
}

export function scaleStyleProp(key, value, scale) {
	if (scale === 1) {
		return value;
	}
	if (key === 'transform') {
		return scaleTransform(value, scale);
	}
	if (key === 'shadowOffset' || key === 'textShadowOffset') {
		return scaleShadowOffset(value, scale);
	}
	if (key === 'maxWidth') {
		return scaleForLayoutMaxWidth(value, scale);
	}
	if (SCALABLE_KEYS.has(key)) {
		return scaleNumeric(value, scale);
	}
	return value;
}

export function scaleStyle(style, scale) {
	if (!style || typeof style !== 'object' || Array.isArray(style) || scale === 1) {
		return style;
	}
	const next = {};
	for (const [key, value] of Object.entries(style)) {
		next[key] = scaleStyleProp(key, value, scale);
	}
	return next;
}

export function scaleStyles(styles, scale) {
	if (!styles || typeof styles !== 'object' || scale === 1) {
		return styles;
	}
	const next = {};
	for (const [name, style] of Object.entries(styles)) {
		next[name] = scaleStyle(style, scale);
	}
	return next;
}
