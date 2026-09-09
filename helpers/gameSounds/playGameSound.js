import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wouldWinMatch } from '../matchFormat/matchFormatScoring';

const SETTINGS_KEY = '@match_settings';

const EVENT_SOURCES = {
	click: require('../../assets/sounds/click.wav'),
	gameon: require('../../assets/sounds/gameon.mp3'),
	gameshot: require('../../assets/sounds/gameshot.mp3'),
	gameshotandthematch: require('../../assets/sounds/gameshotandthematch.mp3'),
};

const PLAYER_OPTIONS = {
	keepAudioSessionActive: true,
	updateInterval: 1000,
};

let audioModePromise = null;
let clickPlayer = null;
let voicePlayer = null;
let voiceSourceKey = null;
let soundsEnabled = true;
let soundVolume = 1;
let prefsReady = false;

function clampVolume(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return 1;
	}
	return Math.max(0, Math.min(1, n));
}

function effectiveVolume() {
	if (!soundsEnabled) {
		return 0;
	}
	return soundVolume;
}

function applyVolumeToPlayers() {
	const volume = effectiveVolume();
	if (clickPlayer) {
		clickPlayer.volume = volume;
	}
	if (voicePlayer) {
		voicePlayer.volume = volume;
	}
}

export function applySoundPrefs({ enabled, volume } = {}) {
	if (typeof enabled === 'boolean') {
		soundsEnabled = enabled;
	}
	if (volume != null) {
		soundVolume = clampVolume(volume);
	}
	prefsReady = true;
	applyVolumeToPlayers();
}

async function ensurePrefs() {
	if (prefsReady) {
		return;
	}
	try {
		const json = await AsyncStorage.getItem(SETTINGS_KEY);
		if (json) {
			const parsed = JSON.parse(json);
			applySoundPrefs({
				enabled: parsed.soundsEnabled !== false,
				volume: parsed.soundVolume ?? 1,
			});
			return;
		}
	} catch (error) {
		console.warn('gameSounds prefs', error);
	}
	prefsReady = true;
}

function ensureAudioMode() {
	if (!audioModePromise) {
		audioModePromise = setAudioModeAsync({
			playsInSilentMode: true,
			interruptionMode: 'mixWithOthers',
			shouldPlayInBackground: false,
			allowsRecording: false,
		}).catch((error) => {
			audioModePromise = null;
			console.warn('gameSounds audio mode', error);
		});
	}
	return audioModePromise;
}

function getClickPlayer() {
	if (!clickPlayer) {
		clickPlayer = createAudioPlayer(EVENT_SOURCES.click, PLAYER_OPTIONS);
		clickPlayer.volume = effectiveVolume();
	}
	return clickPlayer;
}

function getVoicePlayer() {
	if (!voicePlayer) {
		voicePlayer = createAudioPlayer(EVENT_SOURCES.gameon, PLAYER_OPTIONS);
		voicePlayer.volume = effectiveVolume();
		voiceSourceKey = 'gameon';
	}
	return voicePlayer;
}

async function replay(player, source, sourceKey) {
	try {
		await ensurePrefs();
		const volume = effectiveVolume();
		if (volume <= 0) {
			return;
		}
		await ensureAudioMode();
		if (sourceKey != null && voiceSourceKey !== sourceKey) {
			player.replace(source);
			voiceSourceKey = sourceKey;
		}
		player.volume = volume;
		await player.seekTo(0);
		player.play();
	} catch (error) {
		console.warn('gameSounds play', error);
	}
}

export function playClick() {
	void replay(getClickPlayer(), EVENT_SOURCES.click, null);
}

/** Głos (wynik wizyty) — źródło z lazy chunka, nie z mapy eventów. */
export function playVoiceSource(source, sourceKey) {
	if (!source) {
		return;
	}
	void replay(getVoicePlayer(), source, sourceKey);
}

export function playGameOn() {
	void replay(getVoicePlayer(), EVENT_SOURCES.gameon, 'gameon');
}

export function playCheckoutWin(matchWon) {
	if (matchWon) {
		void replay(
			getVoicePlayer(),
			EVENT_SOURCES.gameshotandthematch,
			'gameshotandthematch',
		);
		return;
	}
	void replay(getVoicePlayer(), EVENT_SOURCES.gameshot, 'gameshot');
}

export function playCheckoutWinSound(playerState, matchFormat) {
	playCheckoutWin(wouldWinMatch(playerState, matchFormat));
}
