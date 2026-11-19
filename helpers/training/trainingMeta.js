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
	if (item.difficultyLabel) {
		parts.push(item.difficultyLabel);
	}
	if (item.declaredMinutes) {
		parts.push(`${item.declaredMinutes} min`);
	} else if (item.durationSeconds) {
		const duration = formatDuration(item.durationSeconds);
		if (duration) {
			parts.push(duration);
		}
	} else if (item.dartCount) {
		parts.push(`${item.dartCount} lotek`);
	}
	if (item.mechanicLabel) {
		parts.push(item.mechanicLabel);
	}
	return parts.join(' · ');
}
