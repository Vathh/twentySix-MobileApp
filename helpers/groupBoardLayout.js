const STANDING_KEYS = ['gamesWon', 'gamesLost', 'matchUnitsDifference', 'points', 'place'];

const STANDING_MIN = {
	gamesWon: 34,
	gamesLost: 34,
	matchUnitsDifference: 56,
	points: 40,
	place: 64,
};

function scaled(value, scale) {
	if (scale === 1) {
		return value;
	}
	return Math.round(value * scale * 10) / 10;
}

function isMatchColumn(column) {
	return String(column.key).startsWith('vs_');
}

function columnMin(column, scale, playerWidth) {
	if (column.key === 'player') {
		return playerWidth;
	}
	if (isMatchColumn(column)) {
		return scaled(48, scale);
	}
	return scaled(STANDING_MIN[column.key] ?? 40, scale);
}

function pack(columns, availablePx, scale, playerWidth, shortenPlace, lockPlayer) {
	const mins = columns.map((column) => columnMin(column, scale, playerWidth));
	const sum = mins.reduce((total, width) => total + width, 0);
	const needsScroll = sum > availablePx + 1;
	const widthsPx = mins.slice();
	if (!needsScroll && columns.length > 1) {
		const extra = availablePx - sum;
		if (!lockPlayer) {
			widthsPx[0] += extra * 0.4;
		}
		const share = (lockPlayer ? extra : extra * 0.6) / (columns.length - 1);
		for (let index = 1; index < widthsPx.length; index += 1) {
			widthsPx[index] += share;
		}
	}
	return {
		needsScroll,
		columns: columns.map((column, index) => ({
			...column,
			width: widthsPx[index] / scale,
			label: shortenPlace && column.key === 'place' ? 'Poz' : column.label,
		})),
	};
}

/**
 * Układ tabeli grupy na ekranie sędziego.
 * Wąski ekran: nazwisko + siatka albo nazwisko + kolumny wyniku.
 * Szeroki ekran: cała tabela, gdy mieści się bez poziomego scrolla.
 */
export function layoutGroupBoard(columns, availablePx, scale = 1) {
	const list = Array.isArray(columns) ? columns : [];
	const width = Number(availablePx);
	const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
	const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
	const playerWidth = Math.min(
		scaled(180, safeScale),
		Math.max(scaled(120, safeScale), safeWidth * 0.34),
	);
	const player = list.filter((column) => column.key === 'player');
	const matches = list.filter(isMatchColumn);
	const standings = list.filter((column) => STANDING_KEYS.includes(column.key));
	const full = pack(list, safeWidth, safeScale, playerWidth, false);
	return {
		showAll: list.length > 0 && !full.needsScroll,
		full,
		matches: pack([...player, ...matches], safeWidth, safeScale, playerWidth, false, true),
		standings: pack([...player, ...standings], safeWidth, safeScale, playerWidth, true, true),
	};
}
