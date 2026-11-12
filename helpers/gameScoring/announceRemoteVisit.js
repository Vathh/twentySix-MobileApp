import { playCheckoutWin } from '../gameSounds/index.js';
import { playVisitScore } from '../gameSounds/playVisitScore.js';
import { remoteAnnouncement } from './remoteAnnouncement.js';

/**
 * Lektor wizyty przeciwnika (each_own): nowa kompletna wizyta z WS, nie z własnego OK.
 * Pierwszy hydrate (brak prev) — cisza, żeby nie odtwarzać historii.
 * Zamknięcie lega gra gameshot, także gdy nowy leg czyści listę wizyt.
 */
export function announceRemoteVisit(prev, nextState) {
	const announcement = remoteAnnouncement(prev, nextState);
	if (announcement === 'silent') {
		return;
	}
	if (announcement === 'gameshot') {
		playCheckoutWin(false);
		return;
	}
	if (announcement === 'gameshot-match') {
		playCheckoutWin(true);
		return;
	}
	playVisitScore(announcement.score);
}
