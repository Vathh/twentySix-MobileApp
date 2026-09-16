const CX = 450;
const CY = 450;
const RINGS = [
	{ inner: 0, outer: 60, keys: ['170'] },
	{ inner: 60, outer: 140, keys: ['161', '164', '167'] },
	{ inner: 140, outer: 210, keys: ['151', '152', '153', '154', '155', '156', '157', '158', '160'] },
	{ inner: 210, outer: 275, keys: rangeKeys(138, 150) },
	{ inner: 275, outer: 325, keys: rangeKeys(121, 137) },
	{ inner: 325, outer: 372, keys: rangeKeys(100, 120) },
];

function rangeKeys(from, to) {
	const keys = [];
	for (let n = from; n <= to; n += 1) keys.push(String(n));
	return keys;
}

/**
 * Trafienie klina w kole 900×900 przeskalowanym do `size`.
 * @returns {string|null}
 */
export function checkoutAtPoint(locationX, locationY, size) {
	if (!size || locationX == null || locationY == null) return null;
	const x = (locationX / size) * 900;
	const y = (locationY / size) * 900;
	const dx = x - CX;
	const dy = y - CY;
	const r = Math.hypot(dx, dy);
	if (r > 372) return null;

	let t = Math.atan2(dy, dx) + Math.PI / 2;
	if (t < 0) t += Math.PI * 2;

	const ring = RINGS.find((row) => r >= row.inner && r < row.outer) ?? RINGS[RINGS.length - 1];
	const count = ring.keys.length;
	const idx = Math.min(count - 1, Math.floor((t / (Math.PI * 2)) * count));
	return ring.keys[idx] ?? null;
}
