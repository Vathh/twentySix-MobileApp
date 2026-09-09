import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

const LOGO_MODULE = require('../assets/logo.svg');
const INTRO_LOGOTYP_MODULE = require('../assets/intro-logotyp.svg');

let logoXml = null;
let introLogotypXml = null;
let preloadPromise = null;

async function readAssetText(moduleId) {
	const [asset] = await Asset.loadAsync(moduleId);
	const uri = asset.localUri || asset.uri;
	if (!uri) {
		throw new Error('svg asset has no uri');
	}
	if (uri.startsWith('file:') || uri.startsWith('/')) {
		try {
			return await new File(uri).text();
		} catch (error) {
			console.warn('svg file read', error);
		}
	}
	const response = await fetch(uri);
	if (!response.ok) {
		throw new Error(`svg asset fetch ${response.status}`);
	}
	return response.text();
}

export async function preloadSvgAssets() {
	if (logoXml && introLogotypXml) {
		return;
	}
	if (!preloadPromise) {
		preloadPromise = Promise.all([
			readAssetText(LOGO_MODULE),
			readAssetText(INTRO_LOGOTYP_MODULE),
		])
			.then(([logo, intro]) => {
				logoXml = logo;
				introLogotypXml = intro;
			})
			.catch((error) => {
				preloadPromise = null;
				throw error;
			});
	}
	await preloadPromise;
}

export function getLogoXml() {
	return logoXml;
}

export function getIntroLogotypXml() {
	return introLogotypXml;
}
