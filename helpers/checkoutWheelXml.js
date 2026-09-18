const WHEEL_XML = require('../assets/checkout_wheel.svg');
const CX = 450;
const CY = 450;

const LEVEL_BRUSH = {
	locked: { fill: '#16161a', stroke: '#0c0c0f', strokeWidth: 1.25, label: '#52525b' },
	iron: {
		fill: '#27272a',
		stroke: '#0c0c0f',
		strokeWidth: 1.25,
		label: '#e4e4e7',
		innerStroke: { color: '#a1a1aa', width: 0.85 },
		sheen: 0.48,
		shade: 0.34,
		recess: 4.6,
	},
	bronze: {
		fill: '#7c2d12',
		stroke: '#0c0c0f',
		strokeWidth: 1.25,
		label: '#fed7aa',
		sheen: 0.58,
		wood: true,
		shade: 0.30,
		recess: 4.2,
	},
	gold: {
		fill: '#ffc400',
		stroke: '#0c0c0f',
		strokeWidth: 1.25,
		label: '#3a2400',
		sheen: 0.55,
		sheenGold: true,
		molten: true,
		shade: 0.16,
	},
	bright: {
		fill: '#0369a1',
		stroke: '#0c0c0f',
		strokeWidth: 1.25,
		label: '#e0f2fe',
		innerStroke: { color: '#7dd3fc', width: 1 },
		sheen: 0.72,
		cracks: 'ice',
		shade: 0.24,
		recess: 3.0,
	},
	apex: {
		fill: '#c4e4f2',
		stroke: '#0c0c0f',
		strokeWidth: 1.25,
		label: '#0c4a6e',
		sheen: 0.82,
		cracks: 'diamond',
		sparkle: true,
		shade: 0.18,
		recess: 2.6,
	},
};

const SHARED_DEFS = `
<radialGradient id="cw-sheen" gradientUnits="userSpaceOnUse" cx="450" cy="450" r="430">
  <stop offset="0%" stop-color="#fffaf2" stop-opacity="0.02" />
  <stop offset="38%" stop-color="#f8edd4" stop-opacity="0.05" />
  <stop offset="70%" stop-color="#f8edd4" stop-opacity="0.1" />
  <stop offset="100%" stop-color="#05040a" stop-opacity="0.07" />
</radialGradient>
<radialGradient id="cw-sheen-gold" gradientUnits="userSpaceOnUse" cx="450" cy="450" r="430">
  <stop offset="0%" stop-color="#fff3b0" stop-opacity="0.05" />
  <stop offset="42%" stop-color="#ffd24a" stop-opacity="0.18" />
  <stop offset="72%" stop-color="#ffcc00" stop-opacity="0.28" />
  <stop offset="100%" stop-color="#ffb300" stop-opacity="0.08" />
</radialGradient>
<radialGradient id="cw-pit-fade" gradientUnits="userSpaceOnUse" cx="450" cy="450" r="375">
  <stop offset="0%" stop-color="#1c140e" stop-opacity="0.54" />
  <stop offset="42%" stop-color="#2a1810" stop-opacity="0.46" />
  <stop offset="72%" stop-color="#6b4524" stop-opacity="0.36" />
  <stop offset="100%" stop-color="#05040a" stop-opacity="0.20" />
</radialGradient>
<linearGradient id="cw-caustic" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
  <stop offset="44%" stop-color="#ffffff" stop-opacity="0" />
  <stop offset="50%" stop-color="#ffffff" stop-opacity="0.55" />
  <stop offset="56%" stop-color="#ffffff" stop-opacity="0" />
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
</linearGradient>
<radialGradient id="cw-milk" gradientUnits="userSpaceOnUse" cx="450" cy="428" r="410">
  <stop offset="0%" stop-color="#fffaf4" stop-opacity="0.24" />
  <stop offset="42%" stop-color="#f3e6d4" stop-opacity="0.11" />
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03" />
</radialGradient>
`.replace(/\n\s*/g, '');

let baseXml = null;
let loadPromise = null;

export async function loadCheckoutWheelXml() {
	if (baseXml) return baseXml;
	if (!loadPromise) {
		loadPromise = Promise.resolve()
			.then(() => {
				const xml = typeof WHEEL_XML === 'string' ? WHEEL_XML : WHEEL_XML?.default;
				if (typeof xml !== 'string' || !xml.includes('<svg')) {
					throw new Error('checkout wheel missing from js bundle');
				}
				baseXml = stripInkscape(xml);
				return baseXml;
			})
			.catch((error) => {
				loadPromise = null;
				throw error;
			});
	}
	return loadPromise;
}

function stripInkscape(xml) {
	return String(xml || '')
		.replace(/^<\?xml[^>]*>\s*/i, '')
		.replace(/<sodipodi:namedview[\s\S]*?\/>/gi, '')
		.replace(/\s+xmlns:(sodipodi|inkscape)="[^"]*"/g, '')
		.replace(/\s+(sodipodi|inkscape):[a-z-]+="[^"]*"/gi, '');
}

function levelFromHits(times) {
	const n = Number(times) || 0;
	if (n >= 10) return 'apex';
	if (n >= 7) return 'bright';
	if (n >= 5) return 'gold';
	if (n >= 3) return 'bronze';
	if (n >= 1) return 'iron';
	return 'locked';
}

function tagAttr(tag, name) {
	const match = String(tag).match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
	return match ? match[1] : '';
}

function findShapeTag(inner) {
	const circle = inner.match(/<circle\b[^>]*\/?>/i);
	if (circle) return circle[0];
	const path = inner.match(/<path\b[^>]*\/?>/i);
	return path ? path[0] : '';
}

function parsePathGeom(d) {
	const tokens = String(d).match(/[MLAZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
	const points = [];
	const radii = [];
	let i = 0;
	let cmd = '';
	while (i < tokens.length) {
		const token = tokens[i];
		if (/^[MLAZz]$/i.test(token)) {
			cmd = token.toUpperCase();
			i += 1;
			continue;
		}
		if (cmd === 'M' || cmd === 'L') {
			points.push({ x: Number(tokens[i]), y: Number(tokens[i + 1]) });
			i += 2;
			cmd = 'L';
		} else if (cmd === 'A') {
			radii.push(Number(tokens[i]));
			points.push({ x: Number(tokens[i + 5]), y: Number(tokens[i + 6]) });
			i += 7;
		} else {
			i += 1;
		}
	}
	return { points, radii };
}

function smallestArc(angles) {
	if (angles.length === 0) return { a0: 0, a1: Math.PI / 3 };
	const sorted = angles.map((a) => (a + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b);
	let maxGap = 0;
	let from = 0;
	for (let i = 0; i < sorted.length; i += 1) {
		const next = i === sorted.length - 1 ? sorted[0] + Math.PI * 2 : sorted[i + 1];
		const gap = next - sorted[i];
		if (gap > maxGap) {
			maxGap = gap;
			from = i;
		}
	}
	const a0 = sorted[(from + 1) % sorted.length];
	return { a0, a1: a0 + (Math.PI * 2 - maxGap) };
}

function shapeBBox(shapeTag, checkout) {
	if (Number(checkout) === 170 || /^<circle\b/i.test(shapeTag)) {
		const r = Number(tagAttr(shapeTag, 'r')) || 60;
		return { x: CX - r, y: CY - r, width: r * 2, height: r * 2 };
	}
	const { points, radii } = parsePathGeom(tagAttr(shapeTag, 'd'));
	const rOuter = Math.max(...radii, 80);
	const rInner = Math.min(...radii, rOuter - 24);
	const { a0, a1 } = smallestArc(points.map((p) => Math.atan2(p.y - CY, p.x - CX)));
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const add = (x, y) => {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	};
	for (let s = 0; s <= 8; s += 1) {
		const a = a0 + (s / 8) * (a1 - a0);
		add(CX + Math.cos(a) * rOuter, CY + Math.sin(a) * rOuter);
		add(CX + Math.cos(a) * rInner, CY + Math.sin(a) * rInner);
	}
	return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function clipShapeTag(tag) {
	return String(tag)
		.replace(/\s+id="[^"]*"/i, '')
		.replace(/\s+class="[^"]*"/i, '')
		.replace(/\s+style="[^"]*"/i, '')
		.replace(/\s+fill(:[^=]*)?="[^"]*"/i, '')
		.replace(/\s+stroke="[^"]*"/i, '')
		.replace(/\s+stroke-width="[^"]*"/i, '')
		.replace(/\s+stroke-linejoin="[^"]*"/i, '')
		.replace(/\s+stroke-dasharray="[^"]*"/i, '');
}

function hash01(n) {
	const x = Math.sin(n * 127.1) * 43758.5453;
	return x - Math.floor(x);
}

function polylineD(pts) {
	return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

function jaggedLine(x1, y1, x2, y2, steps, amp, seed) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy) || 1;
	const nx = -dy / len;
	const ny = dx / len;
	const pts = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		const j = i === 0 || i === steps ? 0 : (hash01(seed + i * 17) - 0.5) * 2 * amp;
		pts.push([x1 + dx * t + nx * j, y1 + dy * t + ny * j]);
	}
	return pts;
}

/** Pęknięcia w środku klina; na cienkich pierścieniach gęściej i grubiej. */
function ringGeometry(checkout) {
	const n = Number(checkout);
	if (n === 170) return { r0: 0, r1: 60, count: 1 };
	if (n >= 161) return { r0: 60, r1: 140, count: 3 };
	if (n >= 151) return { r0: 140, r1: 210, count: 9 };
	if (n >= 138) return { r0: 210, r1: 275, count: 13 };
	if (n >= 121) return { r0: 275, r1: 325, count: 17 };
	return { r0: 325, r1: 372, count: 21 };
}

function crackField(checkout, bbox) {
	const n = Number(checkout);
	const ring = ringGeometry(n);
	const thick = ring.r1 - ring.r0;
	const midR = (ring.r0 + ring.r1) / 2;
	const chord = midR * ((Math.PI * 2) / ring.count);
	const span = Math.max(thick, chord * 0.72, 32);
	const extra = ring.count >= 21 ? 6 : ring.count >= 17 ? 4 : ring.count >= 13 ? 2 : 0;
	const boost = Math.min(2.35, Math.max(1, 90 / thick));
	if (n === 170) {
		return {
			originX: CX, originY: CY, span, radialAng: 0, extra: 0, polar: false,
			boost, r0: 0, r1: 60, halfA: Math.PI, tiles: 1,
		};
	}
	const cx = bbox.x + bbox.width / 2;
	const cy = bbox.y + bbox.height / 2;
	const radialAng = Math.atan2(cy - CY, cx - CX);
	return {
		originX: CX + Math.cos(radialAng) * midR,
		originY: CY + Math.sin(radialAng) * midR,
		span,
		radialAng,
		extra,
		polar: true,
		boost,
		r0: ring.r0,
		r1: ring.r1,
		halfA: Math.PI / ring.count,
		tiles: ring.count,
	};
}

function crackBudget(field, isDiamond, checkout) {
	const tiles = field.tiles || 1;
	const extra = isDiamond
		? (tiles >= 21 ? 2 : tiles >= 17 ? 1 : 0)
		: (tiles >= 21 ? 3 : tiles >= 17 ? 1 : 0);
	const base = isDiamond ? (Number(checkout) === 170 ? 8 : 7) : 6;
	return {
		count: base + extra,
		boost: isDiamond ? field.boost : Math.min(1.65, field.boost),
		forkAt: isDiamond ? 0.38 : 0.55,
		inclusions: isDiamond ? 0 : (tiles >= 17 ? 1 : 2),
	};
}

function crackAngle(seed, radialAng, polar) {
	if (!polar) {
		return hash01(seed) * Math.PI * 2;
	}
	const lane = Math.floor(hash01(seed + 11) * 4);
	const spread = lane < 2 ? 0.42 : 0.28;
	const base = radialAng + [0, Math.PI, Math.PI / 2, -Math.PI / 2][lane];
	return base + (hash01(seed) - 0.5) * spread;
}

function crackStart(field, seed) {
	if (!field.polar) {
		return { x: field.originX, y: field.originY };
	}
	const tA = (hash01(seed + 15) - 0.5) * 1.55 * field.halfA;
	const tR = 0.22 + hash01(seed + 16) * 0.56;
	const r = field.r0 + tR * (field.r1 - field.r0);
	const a = field.radialAng + tA;
	return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
}

function wanderPoints(x, y, angle, steps, stepLen, wander, seed) {
	const pts = [[x, y]];
	let a = angle;
	let px = x;
	let py = y;
	for (let i = 0; i < steps; i += 1) {
		a += (hash01(seed + i * 3) - 0.5) * wander;
		px += Math.cos(a) * stepLen;
		py += Math.sin(a) * stepLen;
		pts.push([px, py]);
	}
	return pts;
}

function smoothPathD(pts) {
	if (pts.length < 2) return '';
	let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
	for (let i = 1; i < pts.length - 1; i += 1) {
		const xc = (pts[i][0] + pts[i + 1][0]) / 2;
		const yc = (pts[i][1] + pts[i + 1][1]) / 2;
		d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${xc.toFixed(1)},${yc.toFixed(1)}`;
	}
	const last = pts[pts.length - 1];
	d += ` T${last[0].toFixed(1)},${last[1].toFixed(1)}`;
	return d;
}

function strokePath(d, stroke, width, opacity, extra = '') {
	return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"${extra} />`;
}

function paintFills(inner, brush) {
	return inner
		.replace(/fill="#25252d"/gi, `fill="${brush.fill}"`)
		.replace(/fill:#25252d/gi, `fill:${brush.fill}`)
		.replace(/stroke="#2e2e38"/gi, `stroke="${brush.stroke}"`)
		.replace(/stroke:#2e2e38/gi, `stroke:${brush.stroke}`)
		.replace(/stroke-width="1\.5(?:047)?"/gi, `stroke-width="${brush.strokeWidth}"`)
		.replace(/fill="#f4f4f5"/gi, `fill="${brush.label}"`);
}

/** RN SvgXml nie dziedziczy text-anchor / baseline z rodzica — bez tego liczby jadą w prawo i w dół. */
function centerLabels(inner) {
	return String(inner).replace(/<text\b([^>]*)>/gi, (_full, attrs) => {
		const next = String(attrs)
			.replace(/\s+text-anchor="[^"]*"/gi, '')
			.replace(/\s+dominant-baseline="[^"]*"/gi, '')
			.replace(/\s+alignment-baseline="[^"]*"/gi, '')
			.replace(/\s+font-size="(\d+(?:\.\d+)?)px"/gi, ' font-size="$1"');
		return `<text${next} text-anchor="middle" dominant-baseline="central" alignment-baseline="middle">`;
	});
}

function insertAfterShape(inner, extrasXml) {
	const match = inner.match(/<(?:circle|path)\b[^>]*\/?>/i);
	if (!match) return inner + extrasXml;
	const at = inner.indexOf(match[0]) + match[0].length;
	return inner.slice(0, at) + extrasXml + inner.slice(at);
}

/** Pęknięcia lodu / diamentu — start w klinie, gęstość rośnie na zewnątrz. */
function buildCracks(checkout, bbox, kind) {
	const n = Number(checkout);
	const field = crackField(n, bbox);
	const { span, radialAng, polar } = field;
	const isDiamond = kind === 'diamond';
	const { count, boost, forkAt, inclusions } = crackBudget(field, isDiamond, n);
	const parts = [];
	for (let i = 0; i < count; i += 1) {
		const seed = n * 13 + i * 97;
		const start = crackStart(field, seed);
		const ang = crackAngle(seed, radialAng, polar);
		const bend = (hash01(seed + 3) - 0.5) * 0.45;
		const inner = span * (0.02 + hash01(seed + 1) * 0.05);
		const outer = span * (0.42 + hash01(seed + 2) * 0.4);
		const x1 = start.x + Math.cos(ang) * inner;
		const y1 = start.y + Math.sin(ang) * inner;
		const x2 = start.x + Math.cos(ang + bend) * outer;
		const y2 = start.y + Math.sin(ang + bend) * outer;
		const steps = 4 + Math.floor(hash01(seed + 4) * 3);
		const amp = span * (isDiamond ? 0.038 : 0.052) * boost;
		const wide = (isDiamond ? (i % 3 === 0 ? 0.95 : 0.5) : (i % 2 === 0 ? 1.1 : 0.65)) * boost;
		parts.push(strokePath(
			polylineD(jaggedLine(x1, y1, x2, y2, steps, amp, seed)),
			isDiamond ? (i % 3 === 0 ? '#ffffff' : '#7dd3fc') : '#bae6fd',
			wide,
			isDiamond ? 0.86 : 0.72,
		));
		if (hash01(seed + 8) > forkAt) {
			const mid = 0.42 + hash01(seed + 9) * 0.28;
			const mx = x1 + (x2 - x1) * mid;
			const my = y1 + (y2 - y1) * mid;
			const bang = ang + (hash01(seed + 10) > 0.5 ? 0.75 : -0.75);
			const blen = outer * 0.38;
			parts.push(strokePath(
				polylineD(jaggedLine(mx, my, mx + Math.cos(bang) * blen, my + Math.sin(bang) * blen, 3, amp * 0.7, seed + 20)),
				isDiamond ? '#ffffff' : '#7dd3fc',
				(isDiamond ? 0.45 : 0.55) * boost,
				0.62,
			));
		}
	}
	if (!isDiamond) {
		for (let i = 0; i < inclusions; i += 1) {
			const seed = n * 19 + i * 41;
			const start = crackStart(field, seed + 3);
			const ang = crackAngle(seed, radialAng, polar);
			parts.push(strokePath(
				polylineD(jaggedLine(
					start.x,
					start.y,
					start.x + Math.cos(ang) * span * (0.42 + i * 0.1),
					start.y + Math.sin(ang) * span * (0.42 + i * 0.1),
					5,
					span * 0.04,
					seed,
				)),
				'#0c4a6e',
				0.9 * boost,
				0.32,
				' class="is-inclusion" mix-blend-mode="multiply"',
			));
		}
	}
	return parts.join('');
}

function buildMolten(checkout, bbox) {
	const n = Number(checkout);
	const cx = bbox.x + bbox.width / 2;
	const cy = bbox.y + bbox.height / 2;
	const span = Math.min(bbox.width, bbox.height);
	const parts = [];
	const pours = 4 + Math.floor(hash01(n) * 2);
	for (let i = 0; i < pours; i += 1) {
		const seed = n * 17 + i * 53;
		const startAng = hash01(seed) * Math.PI * 2;
		const startR = span * (0.08 + hash01(seed + 1) * 0.22);
		const x0 = cx + Math.cos(startAng) * startR;
		const y0 = cy + Math.sin(startAng) * startR;
		const heading = startAng + (hash01(seed + 2) - 0.5) * 1.8;
		const steps = 7 + Math.floor(hash01(seed + 3) * 6);
		const stepLen = span * (0.06 + hash01(seed + 4) * 0.05);
		const wander = 0.55 + hash01(seed + 5) * 0.45;
		const d = smoothPathD(wanderPoints(x0, y0, heading, steps, stepLen, wander, seed));
		const thick = 1.5 + hash01(seed + 6) * 2.2;
		parts.push(strokePath(d, i % 2 === 0 ? '#fff3b0' : '#ffe566', thick, 0.55 + hash01(seed + 7) * 0.16, ' mix-blend-mode="overlay"'));
		parts.push(strokePath(d, '#7a4e00', thick * 0.7, 0.28 + hash01(seed + 8) * 0.12, ' mix-blend-mode="multiply"'));
	}
	const pools = 3 + Math.floor(hash01(n + 9) * 2);
	for (let i = 0; i < pools; i += 1) {
		const seed = n * 29 + i * 71;
		const ang = hash01(seed) * Math.PI * 2;
		const r = span * (0.12 + hash01(seed + 1) * 0.28);
		const px = cx + Math.cos(ang) * r;
		const py = cy + Math.sin(ang) * r;
		parts.push(
			`<ellipse cx="${px}" cy="${py}" rx="${2.8 + hash01(seed + 2) * 4.5}" ry="${1.5 + hash01(seed + 3) * 2.6}" fill="${hash01(seed + 4) > 0.5 ? '#fff8d0' : '#ffd54a'}" opacity="${0.32 + hash01(seed + 5) * 0.18}" mix-blend-mode="overlay" transform="rotate(${(hash01(seed + 6) * 180).toFixed(1)} ${px} ${py})" />`,
		);
	}
	return parts.join('');
}

function valueNoise(x, y, seed) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const u = fx * fx * (3 - 2 * fx);
	const v = fy * fy * (3 - 2 * fy);
	const a = hash01(ix * 12.9898 + iy * 78.233 + seed * 37.719);
	const b = hash01((ix + 1) * 12.9898 + iy * 78.233 + seed * 37.719);
	const c = hash01(ix * 12.9898 + (iy + 1) * 78.233 + seed * 37.719);
	const d = hash01((ix + 1) * 12.9898 + (iy + 1) * 78.233 + seed * 37.719);
	return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function woodFbm(x, y, seed) {
	return valueNoise(x, y, seed) * 0.62 + valueNoise(x * 2.03, y * 2.03, seed + 11) * 0.38;
}

/** Dwie rodziny confocalne: min() — mogą się stykać, nie przecinają. */
function woodField(x, y, knot) {
	const big = Math.hypot(x - knot.ax, y - knot.ay) + Math.hypot(x - knot.bx, y - knot.by);
	const small = Math.hypot(x - knot.cx, y - knot.cy) + Math.hypot(x - knot.dx, y - knot.dy);
	const n = woodFbm(x * 0.028, y * 0.028, 13) - 0.5;
	return Math.min(big, small) + n * knot.warp;
}

function lerpPt(x0, y0, v0, x1, y1, v1, level) {
	const d = v1 - v0;
	const t = Math.abs(d) < 1e-6 ? 0.5 : (level - v0) / d;
	return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
}

function keyPt(p) {
	return `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
}

function stitchSegments(segs) {
	const unused = segs.map((s) => ({ a: s[0], b: s[1], used: false }));
	const byKey = new Map();
	const add = (key, idx, end) => {
		const list = byKey.get(key);
		if (list) list.push({ idx, end });
		else byKey.set(key, [{ idx, end }]);
	};
	unused.forEach((s, idx) => {
		add(keyPt(s.a), idx, 'a');
		add(keyPt(s.b), idx, 'b');
	});

	const polylines = [];
	const walk = (startIdx, fromEnd) => {
		const pts = [];
		let idx = startIdx;
		let end = fromEnd;
		while (idx >= 0 && !unused[idx].used) {
			const seg = unused[idx];
			seg.used = true;
			const nextPt = end === 'a' ? seg.b : seg.a;
			const startPt = end === 'a' ? seg.a : seg.b;
			if (pts.length === 0) pts.push(startPt);
			pts.push(nextPt);
			const hits = (byKey.get(keyPt(nextPt)) || []).filter((h) => !unused[h.idx].used);
			if (hits.length === 0) break;
			idx = hits[0].idx;
			end = hits[0].end;
		}
		return pts;
	};

	unused.forEach((seg, idx) => {
		if (seg.used) return;
		const forward = walk(idx, 'a');
		polylines.push(forward.length >= 2 ? forward : [seg.a, seg.b]);
	});
	return polylines;
}

function contourLevel(bbox, level, knot) {
	const pad = 6;
	const x0 = bbox.x - pad;
	const y0 = bbox.y - pad;
	const w = bbox.width + pad * 2;
	const h = bbox.height + pad * 2;
	const cols = Math.max(10, Math.round(w / 5));
	const rows = Math.max(10, Math.round(h / 5));
	const grid = [];
	for (let j = 0; j <= rows; j += 1) {
		const row = [];
		const y = y0 + (j / rows) * h;
		for (let i = 0; i <= cols; i += 1) {
			row.push(woodField(x0 + (i / cols) * w, y, knot));
		}
		grid.push(row);
	}

	const segs = [];
	for (let j = 0; j < rows; j += 1) {
		for (let i = 0; i < cols; i += 1) {
			const xA = x0 + (i / cols) * w;
			const yA = y0 + (j / rows) * h;
			const xB = x0 + ((i + 1) / cols) * w;
			const yB = y0 + ((j + 1) / rows) * h;
			const v0 = grid[j][i];
			const v1 = grid[j][i + 1];
			const v2 = grid[j + 1][i + 1];
			const v3 = grid[j + 1][i];
			const code = (v0 >= level ? 1 : 0)
				| (v1 >= level ? 2 : 0)
				| (v2 >= level ? 4 : 0)
				| (v3 >= level ? 8 : 0);
			if (code === 0 || code === 15) continue;
			const top = () => lerpPt(xA, yA, v0, xB, yA, v1, level);
			const right = () => lerpPt(xB, yA, v1, xB, yB, v2, level);
			const bottom = () => lerpPt(xA, yB, v3, xB, yB, v2, level);
			const left = () => lerpPt(xA, yA, v0, xA, yB, v3, level);
			const edges = [];
			if (code === 1 || code === 14) edges.push([left(), top()]);
			else if (code === 2 || code === 13) edges.push([top(), right()]);
			else if (code === 3 || code === 12) edges.push([left(), right()]);
			else if (code === 4 || code === 11) edges.push([right(), bottom()]);
			else if (code === 5) edges.push([left(), top()], [right(), bottom()]);
			else if (code === 6 || code === 9) edges.push([top(), bottom()]);
			else if (code === 7 || code === 8) edges.push([left(), bottom()]);
			else if (code === 10) edges.push([top(), right()], [left(), bottom()]);
			edges.forEach((e) => segs.push(e));
		}
	}
	return stitchSegments(segs);
}

function fadeStroke(pts, color, width, opacity) {
	if (pts.length < 5) {
		return strokePath(smoothPathD(pts), color, width, opacity * 0.5);
	}
	const a = Math.max(2, Math.floor(pts.length * 0.2));
	return [
		strokePath(smoothPathD(pts.slice(0, a + 2)), color, width, opacity * 0.28),
		strokePath(smoothPathD(pts.slice(a, pts.length - a)), color, width, opacity),
		strokePath(smoothPathD(pts.slice(pts.length - a - 2)), color, width, opacity * 0.28),
	].join('');
}

function breakPolyline(pts, seed) {
	if (pts.length < 9) return [pts];
	const gapAt = Math.floor(pts.length * (0.18 + hash01(seed) * 0.46));
	const gapLen = Math.max(2, Math.floor(pts.length * (0.1 + hash01(seed + 1) * 0.22)));
	const left = pts.slice(0, gapAt);
	const right = pts.slice(gapAt + gapLen);
	const keep = [];
	if (left.length >= 3) keep.push(left);
	if (right.length >= 3) keep.push(right);
	if (keep.length === 2 && hash01(seed + 2) > 0.55) {
		return [keep[hash01(seed + 3) > 0.5 ? 0 : 1]];
	}
	return keep.length ? keep : [pts];
}

function slicePolyline(pts, seed) {
	if (pts.length < 6) return pts;
	const take = Math.max(4, Math.floor(pts.length * (0.16 + hash01(seed) * 0.28)));
	const start = Math.floor(hash01(seed + 1) * Math.max(1, pts.length - take));
	return pts.slice(start, start + take);
}

/** Więcej owalów, w tym małe sęki z boku — stykają się, nie przecinają. */
function buildWood(checkout, bbox) {
	const n = Number(checkout);
	const span = Math.max(bbox.width, bbox.height);
	const rot = -0.5 + (hash01(n + 2) - 0.5) * 0.9;
	const cx = bbox.x + bbox.width * (0.28 + hash01(n) * 0.44);
	const cy = bbox.y + bbox.height * (0.28 + hash01(n + 1) * 0.44);
	const half = span * (0.11 + hash01(n + 3) * 0.13);
	const rot2 = rot + 0.7 + hash01(n + 5) * 0.9;
	const tiny = span * (0.035 + hash01(n + 6) * 0.04);
	const sx = bbox.x + bbox.width * (0.08 + hash01(n + 7) * 0.84);
	const sy = bbox.y + bbox.height * (0.08 + hash01(n + 8) * 0.84);
	const knot = {
		ax: cx + Math.cos(rot) * half,
		ay: cy + Math.sin(rot) * half,
		bx: cx - Math.cos(rot) * half,
		by: cy - Math.sin(rot) * half,
		cx: sx + Math.cos(rot2) * tiny,
		cy: sy + Math.sin(rot2) * tiny,
		dx: sx - Math.cos(rot2) * tiny,
		dy: sy - Math.sin(rot2) * tiny,
		warp: 3.2,
	};
	const lo = tiny * 2 + 1.5;
	const parts = [];
	const paint = (pts, seed, width, opacity) => {
		breakPolyline(pts, seed).forEach((frag, fi) => {
			if (frag.length < 3) return;
			parts.push(fadeStroke(frag, '#050201', width, opacity * (fi === 0 ? 1 : 0.82)));
		});
	};

	[0.04, 0.09, 0.15, 0.22, 0.32, 0.44, 0.58, 0.74, 0.92].forEach((t, i) => {
		contourLevel(bbox, lo + span * t, knot).forEach((pts, pi) => {
			if (pts.length < 3) return;
			paint(pts, n * 17 + i * 31 + pi * 9, i < 3 ? 1.05 : (i % 2 === 0 ? 1.3 : 1.0), i < 3 ? 0.82 : 0.9);
		});
	});

	[0.07, 0.12, 0.26, 0.38, 0.51, 0.66].forEach((t, i) => {
		contourLevel(bbox, lo + span * t, knot).forEach((pts, pi) => {
			if (pts.length < 6) return;
			const frag = slicePolyline(pts, n * 23 + i * 41 + pi * 13);
			if (frag.length < 4) return;
			parts.push(fadeStroke(frag, '#050201', 0.85, 0.7));
		});
	});
	return parts.join('');
}

function buildSparkles(checkout, bbox) {
	const n = Number(checkout);
	const cx = bbox.x + bbox.width / 2;
	const cy = bbox.y + bbox.height / 2;
	const towardX = (CX - cx) * 0.18;
	const towardY = (CY - cy) * 0.18;
	const isBull = n === 170;
	const count = isBull ? 4 : 3;
	const parts = [];
	for (let i = 0; i < count; i += 1) {
		const ang = ((n * 0.41) + i * 2.15) % (Math.PI * 2);
		const rad = isBull ? 34 + i * 4 : Math.min(bbox.width, bbox.height) * (0.16 + i * 0.05);
		const x = (isBull ? CX : cx + towardX) + Math.cos(ang) * rad;
		const y = (isBull ? CY : cy + towardY) + Math.sin(ang) * rad;
		parts.push(`<circle cx="${x}" cy="${y}" r="${i === 0 ? 3.4 : 2.4}" fill="#ffffff" opacity="0.35" />`);
		parts.push(`<circle cx="${x}" cy="${y}" r="${i === 0 ? 1.35 : 0.95}" fill="#ecfeff" opacity="0.85" />`);
	}
	return parts.join('');
}

function atmosphereLayer() {
	const rings = [60, 140, 210, 275, 325, 360]
		.map((r) => `<circle cx="450" cy="450" r="${r}" fill="none" stroke="#4a321c" stroke-width="${r === 60 || r === 360 ? 1.6 : 1.15}" opacity="0.55" />`)
		.join('');
	let spokes = '';
	for (let i = 0; i < 24; i += 1) {
		const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
		spokes += `<line x1="${CX + Math.cos(a) * 62}" y1="${CY + Math.sin(a) * 62}" x2="${CX + Math.cos(a) * 358}" y2="${CY + Math.sin(a) * 358}" stroke="#4a321c" stroke-width="0.85" opacity="0.32" />`;
	}
	return `<g pointer-events="none" opacity="0.92"><circle cx="450" cy="450" r="372" fill="url(#cw-pit-fade)" />${rings}${spokes}</g><circle cx="450" cy="450" r="372" fill="#d4b07a" opacity="0.12" pointer-events="none" />`;
}

function injectDefs(xml, extra) {
	const body = SHARED_DEFS + extra;
	if (/<defs\b[^>]*\/>/i.test(xml)) {
		return xml.replace(/<defs\b[^>]*\/>/i, `<defs id="cw-defs">${body}</defs>`);
	}
	if (/<defs[\s\S]*?<\/defs>/i.test(xml)) {
		return xml.replace(/<\/defs>/i, `${body}</defs>`);
	}
	return xml.replace(/<svg\b[^>]*>/i, (open) => `${open}<defs id="cw-defs">${body}</defs>`);
}

/**
 * Port wyglądu z weba (commit a6f5923): te same pęknięcia, molten, sheen i atmosfera.
 * Filtry SVG (szum, lighting) pomijamy — react-native-svg ich nie odda.
 */
export function paintCheckoutWheelXml(xml, checkoutItems) {
	const hits = {};
	(checkoutItems ?? []).forEach((item) => {
		hits[String(item.key)] = Number(item.timesEarned) || 0;
	});
	const clipDefs = [];

	let painted = String(xml || '').replace(
		/<g(\b[^>]*data-checkout="(\d+)"[^>]*)>([\s\S]*?)<\/g>/g,
		(_full, attrs, checkout, inner) => {
			const n = hits[checkout] ?? 0;
			const level = levelFromHits(n);
			const brush = LEVEL_BRUSH[level];
			const nextAttrs = String(attrs)
				.replace(/data-hits="\d+"/i, `data-hits="${n}"`)
				.replace(/data-level="[^"]*"/i, `data-level="${level}"`);
			const colored = centerLabels(paintFills(inner, brush));
			if (level === 'locked') {
				return `<g${nextAttrs}>${colored}</g>`;
			}

			const shapeTag = findShapeTag(colored);
			if (!shapeTag) {
				return `<g${nextAttrs}>${colored}</g>`;
			}

			const clipId = `cw-clip-${checkout}`;
			clipDefs.push(`<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${clipShapeTag(shapeTag).replace(/\/?>$/, ' fill="#ffffff" />')}</clipPath>`);
			const bbox = shapeBBox(shapeTag, checkout);
			const extras = [];

			if (brush.shade) {
				extras.push(
					clipShapeTag(shapeTag).replace(
						/\/?>$/,
						` fill="#05040a" stroke="none" opacity="${brush.shade}" />`,
					),
				);
			}
			if (brush.recess) {
				extras.push(
					clipShapeTag(shapeTag).replace(
						/\/?>$/,
						` fill="none" stroke="#05040a" stroke-width="${brush.recess}" stroke-linejoin="round" opacity="0.72" clip-path="url(#${clipId})" />`,
					),
				);
			}
			if (brush.sheen) {
				extras.push(
					clipShapeTag(shapeTag).replace(
						/\/?>$/,
						` fill="url(#${brush.sheenGold ? 'cw-sheen-gold' : 'cw-sheen'})" stroke="none" opacity="${brush.sheen}" mix-blend-mode="${brush.sheenGold ? 'screen' : 'overlay'}" />`,
					),
				);
			}
			if (brush.innerStroke) {
				extras.push(
					clipShapeTag(shapeTag).replace(
						/\/?>$/,
						` fill="none" stroke="${brush.innerStroke.color}" stroke-width="${brush.innerStroke.width * 2}" stroke-linejoin="round" clip-path="url(#${clipId})" />`,
					),
				);
			}

			let overlay = '';
			if (brush.cracks) overlay += buildCracks(checkout, bbox, brush.cracks);
			if (brush.molten) overlay += buildMolten(checkout, bbox);
			if (overlay) {
				extras.push(`<g clip-path="url(#${clipId})" fill="none" mix-blend-mode="overlay">${overlay}</g>`);
			}
			if (brush.wood) {
				extras.push(`<g clip-path="url(#${clipId})" fill="none">${buildWood(checkout, bbox)}</g>`);
			}
			if (brush.sparkle) extras.push(buildSparkles(checkout, bbox));

			const group = `<g${nextAttrs}>${insertAfterShape(colored, extras.join(''))}</g>`;
			return group;
		},
	);

	painted = injectDefs(painted, clipDefs.join(''));
	painted = painted.replace(/<g\b[^>]*id="checkout-wheel"/i, `${atmosphereLayer()}<g id="checkout-wheel"`);
	painted = painted.replace(
		/<\/svg>\s*$/i,
		`<g pointer-events="none"><circle cx="450" cy="450" r="372" fill="url(#cw-milk)" /><circle cx="450" cy="450" r="368" fill="url(#cw-caustic)" opacity="0.20" /></g></svg>`,
	);
	return painted;
}
