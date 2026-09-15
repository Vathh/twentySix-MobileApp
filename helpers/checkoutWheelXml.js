import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

const WHEEL_MODULE = require('../assets/checkout_wheel.svg');
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

async function readAssetText(moduleId) {
	const [asset] = await Asset.loadAsync(moduleId);
	const uri = asset.localUri || asset.uri;
	if (!uri) {
		throw new Error('checkout wheel has no uri');
	}
	if (uri.startsWith('file:') || uri.startsWith('/')) {
		try {
			return await new File(uri).text();
		} catch (error) {
			console.warn('checkout wheel file read', error);
		}
	}
	const response = await fetch(uri);
	if (!response.ok) {
		throw new Error(`checkout wheel fetch ${response.status}`);
	}
	return response.text();
}

export async function loadCheckoutWheelXml() {
	if (baseXml) return baseXml;
	if (!loadPromise) {
		loadPromise = readAssetText(WHEEL_MODULE)
			.then((xml) => {
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
	if (n >= 15) return 'apex';
	if (n >= 10) return 'bright';
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

function insertAfterShape(inner, extrasXml) {
	const match = inner.match(/<(?:circle|path)\b[^>]*\/?>/i);
	if (!match) return inner + extrasXml;
	const at = inner.indexOf(match[0]) + match[0].length;
	return inner.slice(0, at) + extrasXml + inner.slice(at);
}

/** Algorytm pęknięć 1:1 z weba (a6f5923). */
function buildCracks(checkout, bbox, kind) {
	const n = Number(checkout);
	const cx = bbox.x + bbox.width / 2;
	const cy = bbox.y + bbox.height / 2;
	const originX = n === 170 ? CX : cx + (CX - cx) * 0.12;
	const originY = n === 170 ? CY : cy + (CY - cy) * 0.12;
	const span = Math.min(bbox.width, bbox.height);
	const isDiamond = kind === 'diamond';
	const count = isDiamond ? (n === 170 ? 10 : 9) : 8;
	const parts = [];
	for (let i = 0; i < count; i += 1) {
		const seed = n * 13 + i * 97;
		const ang = hash01(seed) * Math.PI * 2;
		const bend = (hash01(seed + 3) - 0.5) * 0.55;
		const inner = span * (0.06 + hash01(seed + 1) * 0.1);
		const outer = span * (0.4 + hash01(seed + 2) * 0.34);
		const x1 = originX + Math.cos(ang) * inner;
		const y1 = originY + Math.sin(ang) * inner;
		const x2 = originX + Math.cos(ang + bend) * outer;
		const y2 = originY + Math.sin(ang + bend) * outer;
		const steps = 4 + Math.floor(hash01(seed + 4) * 3);
		const amp = span * (isDiamond ? 0.038 : 0.052);
		parts.push(strokePath(
			polylineD(jaggedLine(x1, y1, x2, y2, steps, amp, seed)),
			isDiamond ? '#ecfeff' : '#bae6fd',
			isDiamond ? (i % 3 === 0 ? 0.95 : 0.5) : (i % 2 === 0 ? 1.1 : 0.65),
			isDiamond ? 0.78 : 0.64,
		));
		if (hash01(seed + 8) > 0.28) {
			const mid = 0.42 + hash01(seed + 9) * 0.28;
			const mx = x1 + (x2 - x1) * mid;
			const my = y1 + (y2 - y1) * mid;
			const bang = ang + (hash01(seed + 10) > 0.5 ? 0.75 : -0.75);
			const blen = outer * 0.38;
			parts.push(strokePath(
				polylineD(jaggedLine(mx, my, mx + Math.cos(bang) * blen, my + Math.sin(bang) * blen, 3, amp * 0.7, seed + 20)),
				isDiamond ? '#ffffff' : '#7dd3fc',
				isDiamond ? 0.45 : 0.55,
				0.58,
			));
		}
	}
	if (!isDiamond) {
		for (let i = 0; i < 2; i += 1) {
			const seed = n * 19 + i * 41;
			const ang = hash01(seed) * Math.PI * 2;
			parts.push(strokePath(
				polylineD(jaggedLine(
					originX,
					originY,
					originX + Math.cos(ang) * span * (0.42 + i * 0.1),
					originY + Math.sin(ang) * span * (0.42 + i * 0.1),
					5,
					span * 0.04,
					seed,
				)),
				'#0c4a6e',
				0.9,
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

/** Iso-kontury jednego pola — jak słoje, nigdy się nie przecinają. */
function woodRingPoint(knotX, knotY, rot, aspect, r0, theta, warpAmp, warpK, warpPhase) {
	const r = r0 * (1 + warpAmp * Math.sin(warpK * theta + warpPhase) + warpAmp * 0.35 * Math.sin(warpK * 2 * theta + warpPhase * 1.7));
	const lx = r * Math.cos(theta);
	const ly = r * aspect * Math.sin(theta);
	const c = Math.cos(rot);
	const s = Math.sin(rot);
	return [knotX + lx * c - ly * s, knotY + lx * s + ly * c];
}

function woodRingPoints(knotX, knotY, rot, aspect, r0, theta0, span, samples, warpAmp, warpK, warpPhase) {
	const pts = [];
	for (let i = 0; i <= samples; i += 1) {
		const t = i / samples;
		pts.push(woodRingPoint(knotX, knotY, rot, aspect, r0, theta0 + span * t, warpAmp, warpK, warpPhase));
	}
	return pts;
}

function fadeRingParts(pts) {
	if (pts.length < 8) return [{ pts, mul: 1 }];
	const a = Math.max(2, Math.floor(pts.length * 0.16));
	return [
		{ pts: pts.slice(0, a + 2), mul: 0.55 },
		{ pts: pts.slice(a, pts.length - a), mul: 1 },
		{ pts: pts.slice(pts.length - a - 2), mul: 0.55 },
	];
}

/** Słoje: zagnieżdżone niepełne owale + dłuższe łuki z tej samej rodziny. */
function buildWood(checkout, bbox) {
	const n = Number(checkout);
	const span = Math.max(bbox.width, bbox.height);
	const knotX = bbox.x + bbox.width * (hash01(n) * 1.55 - 0.28);
	const knotY = bbox.y + bbox.height * (hash01(n + 1) * 1.55 - 0.28);
	const rot = -0.42 + (hash01(n + 2) - 0.5) * 0.28;
	const aspect = 0.42 + hash01(n + 3) * 0.22;
	const warpAmp = 0.07 + hash01(n + 4) * 0.08;
	const warpK = hash01(n + 5) > 0.5 ? 2 : 3;
	const warpPhase = hash01(n + 6) * Math.PI * 2;
	const ringCount = 10;
	const rMin = span * 0.08;
	const rMax = span * 1.4;
	const gap = (rMax - rMin) / ringCount;
	const parts = [];

	for (let i = 0; i < ringCount; i += 1) {
		const seed = n * 31 + i * 17;
		const r0 = rMin + (i + 0.5) * gap + (hash01(seed) - 0.5) * gap * 0.22;
		const longArc = hash01(seed + 1) > 0.38;
		const theta0 = hash01(seed + 2) * Math.PI * 2;
		const thetaSpan = longArc
			? 2.6 + hash01(seed + 3) * 2.4
			: 0.9 + hash01(seed + 3) * 1.2;
		const samples = longArc ? 22 : 14;
		const pts = woodRingPoints(knotX, knotY, rot, aspect, r0, theta0, thetaSpan, samples, warpAmp, warpK, warpPhase);
		const dark = hash01(seed + 4) > 0.42;
		const thick = longArc ? 1.15 + hash01(seed + 5) * 0.85 : 1.45 + hash01(seed + 5) * 1.25;
		const baseOp = dark ? 0.72 : 0.58;
		const color = dark ? '#1a0804' : '#fdba74';
		fadeRingParts(pts).forEach((part) => {
			if (part.pts.length < 2) return;
			parts.push(strokePath(smoothPathD(part.pts), color, thick, baseOp * part.mul));
		});
	}

	if (hash01(n + 9) > 0.35) {
		const kx = knotX;
		const ky = knotY;
		const rx = 2.4 + hash01(n + 10) * 2.6;
		const ry = rx * (0.45 + hash01(n + 11) * 0.25);
		const deg = (rot * 180 / Math.PI).toFixed(1);
		parts.push(
			`<ellipse cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="#1a0804" opacity="0.4" transform="rotate(${deg} ${kx.toFixed(1)} ${ky.toFixed(1)})" />`,
		);
	}

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
			const colored = paintFills(inner, brush);
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
