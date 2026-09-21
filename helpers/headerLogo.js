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

export function introLogotypFitScale(introBox, slotWidth, slotHeight) {
	const contentW = introBox.width * INTRO_CONTENT_WIDTH_RATIO;
	const contentH = introBox.height * INTRO_CONTENT_HEIGHT_RATIO;
	return Math.max(slotWidth / contentW, slotHeight / contentH);
}

/** Kadrowanie intro-26 do slotu logotypu w headerze — ten sam math co wlot. */
export function introLogotypSlotLayout(windowWidth, slotWidth, slotHeight, introBox) {
	const box = introBox ?? introLogotypSizeForWidth(introLogotypMaxWidth(windowWidth));
	return {
		introBox: box,
		scale: introLogotypFitScale(box, slotWidth, slotHeight),
		left: (slotWidth - box.width) / 2,
		top: (slotHeight - box.height) / 2,
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
