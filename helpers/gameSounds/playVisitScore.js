import { playVoiceSource } from './playGameSound';

const chunkPromises = {};

function loadScoreChunk(n) {
	if (n <= 60) {
		if (!chunkPromises.low) {
			chunkPromises.low = import('./scoreSources0to60');
		}
		return chunkPromises.low;
	}
	if (n <= 100) {
		if (!chunkPromises.mid) {
			chunkPromises.mid = import('./scoreSources61to100');
		}
		return chunkPromises.mid;
	}
	if (n <= 180) {
		if (!chunkPromises.high) {
			chunkPromises.high = import('./scoreSources101to180');
		}
		return chunkPromises.high;
	}
	return null;
}

export function playVisitScore(score) {
	const n = Number(score);
	if (!Number.isInteger(n) || n < 0) {
		return;
	}
	const load = loadScoreChunk(n);
	if (!load) {
		return;
	}
	void load
		.then(({ SCORE_SOUND_SOURCES }) => {
			const source = SCORE_SOUND_SOURCES[n];
			if (!source) {
				return;
			}
			playVoiceSource(source, `score:${n}`);
		})
		.catch((error) => {
			console.warn('gameSounds score chunk', error);
		});
}
