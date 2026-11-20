import { isClockKey } from './clockGroup.js';

function formatDuration(seconds) {
	const value = Number(seconds);
	if (!Number.isFinite(value) || value <= 0) {
		return '';
	}
	if (value % 60 === 0) {
		return `${value / 60} min`;
	}
	return `${value} s`;
}

export function trainingMeta(item) {
	if (!item) {
		return '';
	}
	const parts = [];
	const clock = isClockKey(item.exerciseKey);
	if (item.difficultyLabel) {
		parts.push(item.difficultyLabel);
	}
	if (item.declaredMinutes) {
		parts.push(`${item.declaredMinutes} min`);
	} else if (!clock && item.durationSeconds) {
		const duration = formatDuration(item.durationSeconds);
		if (duration) {
			parts.push(duration);
		}
	} else if (!clock && item.dartCount && item.exerciseKey !== 'nine_darts') {
		parts.push(`${item.dartCount} lotek`);
	}
	if (item.mechanicLabel) {
		parts.push(item.mechanicLabel);
	}
	return parts.join(' · ');
}
