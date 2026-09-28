/** Pełne logo.svg: logotyp (920) + kreska/odstęp + napis, canvas 3180×580. */
export const HEADER_LOGO_SRC_WIDTH = 3180;
export const HEADER_LOGO_SRC_HEIGHT = 580;
/** Lewa część logo — przekreślone 26 (logotyp.svg). */
export const LOGOTYP_SRC_WIDTH = 920;
export const LOGOTYP_SRC_HEIGHT = 580;

export const HEADER_LOGO_HEIGHT = 32;
const HEADER_SCALE = HEADER_LOGO_HEIGHT / HEADER_LOGO_SRC_HEIGHT;
export const HEADER_LOGO_WIDTH = HEADER_LOGO_SRC_WIDTH * HEADER_SCALE;
export const HEADER_LOGOTYP_WIDTH = LOGOTYP_SRC_WIDTH * HEADER_SCALE;
export const HEADER_LOGO_REST_WIDTH = HEADER_LOGO_WIDTH - HEADER_LOGOTYP_WIDTH;

/** Proporcje intro-logotyp.svg (przekreślone 26 na kwadratowym kadrze). */
export const INTRO_LOGOTYP_SRC_WIDTH = 1267;
export const INTRO_LOGOTYP_SRC_HEIGHT = 1253;

export function introLogotypMaxWidth(windowWidth, maxPx = 300) {
	return Math.min(windowWidth * 0.72, maxPx);
}

export function introLogotypSizeForWidth(width) {
	return {
		width,
		height: width * (INTRO_LOGOTYP_SRC_HEIGHT / INTRO_LOGOTYP_SRC_WIDTH),
	};
}

export function settledIntroLogotypXml(svgXml) {
	return sanitizeSvgXml(
		svgXml.replace(/stroke-dashoffset:\s*5000/g, 'stroke-dashoffset: 0'),
	);
}

export const INTRO_CONTENT_WIDTH_RATIO = LOGOTYP_SRC_WIDTH / INTRO_LOGOTYP_SRC_WIDTH;
export const INTRO_CONTENT_HEIGHT_RATIO = LOGOTYP_SRC_HEIGHT / INTRO_LOGOTYP_SRC_HEIGHT;

/**
 * Kadr logotyp.svg (920×580) w intro-logotyp.svg.
 * Nie jest wyśrodkowany w kwadracie — niżej i bardziej w lewo.
 */
export const INTRO_LOGOTYP_CONTENT_X = 150.05107;
export const INTRO_LOGOTYP_CONTENT_Y = 341.22724;

/** Przesunięcie, żeby środek 26 z intro pokrył się ze slotem logo, nie ze środkiem kwadratu. */
export function introLogotypContentShift(introBox, scale) {
	const contentX = introBox.width * (INTRO_LOGOTYP_CONTENT_X / INTRO_LOGOTYP_SRC_WIDTH);
	const contentY = introBox.height * (INTRO_LOGOTYP_CONTENT_Y / INTRO_LOGOTYP_SRC_HEIGHT);
	const centeredX = (introBox.width * (1 - INTRO_CONTENT_WIDTH_RATIO)) / 2;
	const centeredY = (introBox.height * (1 - INTRO_CONTENT_HEIGHT_RATIO)) / 2;
	return {
		x: (centeredX - contentX) * scale,
		y: (centeredY - contentY) * scale,
	};
}

export function introLogotypFitScale(introBox, slotWidth, slotHeight) {
	const contentW = introBox.width * INTRO_CONTENT_WIDTH_RATIO;
	const contentH = introBox.height * INTRO_CONTENT_HEIGHT_RATIO;
	return Math.max(slotWidth / contentW, slotHeight / contentH);
}

/** Kadrowanie intro-26 do slotu logotypu w headerze — ten sam math co wlot. */
export function introLogotypSlotLayout(windowWidth, slotWidth, slotHeight, introBox) {
	const box = introBox ?? introLogotypSizeForWidth(introLogotypMaxWidth(windowWidth));
	const scale = introLogotypFitScale(box, slotWidth, slotHeight);
	const shift = introLogotypContentShift(box, scale);
	return {
		introBox: box,
		scale,
		left: (slotWidth - box.width) / 2 + shift.x,
		top: (slotHeight - box.height) / 2 + shift.y,
	};
}

export function sanitizeSvgXml(xml) {
	if (!xml) {
		return xml;
	}
	return xml
		.replace(/\s+mask=["']none["']/gi, '')
		.replace(/mask=["']url\(#([^"']+)\)["']/gi, 'mask="#$1"');
}
