const LOGO_XML = require('../assets/logo.svg');
const INTRO_LOGOTYP_XML = require('../assets/intro-logotyp.svg');

let logoXml = null;
let introLogotypXml = null;

function asXml(mod) {
	if (typeof mod === 'string' && mod.includes('<svg')) {
		return mod;
	}
	if (mod && typeof mod.default === 'string' && mod.default.includes('<svg')) {
		return mod.default;
	}
	return '';
}

export async function preloadSvgAssets() {
	logoXml = asXml(LOGO_XML);
	introLogotypXml = asXml(INTRO_LOGOTYP_XML);
	if (!logoXml || !introLogotypXml) {
		throw new Error('svg assets missing from js bundle');
	}
}

export function getLogoXml() {
	return logoXml;
}

export function getIntroLogotypXml() {
	return introLogotypXml;
}
