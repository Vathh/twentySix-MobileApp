import { formatAverage } from './formatAverage';

export const CAREER_WINDOWS = [
	{ key: '30d', label: '1 mies.' },
	{ key: '90d', label: '3 mies.' },
	{ key: '180d', label: '6 mies.' },
	{ key: '365d', label: '12 mies.' },
	{ key: 'all', label: 'Całość' },
];

export const CAREER_SOURCES = [
	{ key: 'all', label: 'Wszystkie' },
	{ key: 'tournament', label: 'Turnieje' },
	{ key: 'quick', label: 'Szybkie' },
];

export const FORM_HIGHLIGHTS = [
	{ key: 'highest_hf', label: 'Najwyższy checkout' },
	{ key: 'fastest_qf', label: 'Najszybsza lotka' },
	{ key: 'count_max', label: '180' },
	{ key: 'count_170_plus', label: '170+' },
	{ key: 'count_hf', label: 'Checkout 100+' },
	{ key: 'count_qf', label: 'Szybkie lotki' },
];

export const CAREER_DETAIL_ROWS = [
	{ key: 'games', label: 'Mecze' },
	{ key: 'avg_three_darts', label: 'Średnia 3 lotki' },
	{ key: 'highest_hf', label: 'Najwyższy checkout' },
	{ key: 'fastest_qf', label: 'Najszybsza lotka' },
	{ key: 'count_max', label: '180' },
	{ key: 'count_170_plus', label: '170+' },
	{ key: 'count_hf', label: 'Checkout 100+' },
	{ key: 'count_qf', label: 'Szybkie lotki' },
];

export function formatFormValue(stats, key) {
	if (key === 'fastest_qf') {
		return stats?.fastest_qf != null ? `${stats.fastest_qf} lotek` : '–';
	}
	if (key === 'avg_three_darts') {
		return formatAverage(stats?.avg_three_darts).replace('-', '–');
	}
	if (key === 'highest_hf') {
		return stats?.highest_hf != null ? String(stats.highest_hf) : '–';
	}
	const raw = stats?.[key];
	if (raw == null || raw === '') return '–';
	return String(raw);
}

export function formatWinRate(played, wins) {
	const p = Number(played) || 0;
	const w = Number(wins) || 0;
	if (p <= 0) return '–';
	return `${(Math.round((1000 * w) / p) / 10).toFixed(1)}%`;
}

export function formatDelta(value) {
	if (value == null || Number(value) === 0) return null;
	const n = Number(value);
	if (Number.isNaN(n)) return null;
	const sign = n > 0 ? '+' : '';
	return `vs poprz. okno ${sign}${n.toFixed(2)}`;
}

export function gameTypeLabel(type) {
	if (type === 'quick') return 'Szybkie';
	if (type === 'group' || type === 'playoff') return 'Turniej';
	if (type === 'league') return 'Liga';
	if (type === 'training') return 'Trening';
	return type || '–';
}

export function gameTypeTone(type) {
	if (type === 'quick') return 'quick';
	if (type === 'league') return 'league';
	if (type === 'training') return 'training';
	if (type === 'group' || type === 'playoff') return 'tournament';
	return 'muted';
}

export function resultLabel(result) {
	if (result === 'wygrana') return 'Wygrana';
	if (result === 'porażka') return 'Porażka';
	return result || '–';
}

export function formatScore(score) {
	return score ? String(score).replace(/ : /g, '–') : '';
}

export function historyDate(formatted) {
	return String(formatted || '').split(' ')[0] || '–';
}

export function historyTime(formatted) {
	return String(formatted || '').split(' ')[1] || '';
}
