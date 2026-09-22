import assert from 'node:assert/strict';
import {
	MAX_UI_SCALE,
	computeUiScale,
	mainCounterBoost,
	scaleNumeric,
	scaleStyle,
	scaleStyles,
} from '../uiScaleMath.js';

assert.equal(computeUiScale(390), 1);
assert.equal(computeUiScale(428), 1);
assert.equal(computeUiScale(599), 1);
assert.equal(computeUiScale(0), 1);
assert.equal(computeUiScale(Number.NaN), 1);

const sevenInch = computeUiScale(600);
assert.ok(sevenInch > 1 && sevenInch < 1.2, `7" scale ${sevenInch}`);

const tenInch = computeUiScale(800);
assert.ok(tenInch >= 1.3 && tenInch <= 1.36, `10" scale ${tenInch}`);

assert.equal(computeUiScale(1400), MAX_UI_SCALE);

assert.equal(mainCounterBoost(390), 1);
assert.equal(mainCounterBoost(599), 1);
assert.equal(mainCounterBoost(600), 2.76);
assert.ok(mainCounterBoost(800) > 3.1 && mainCounterBoost(800) < 3.4, `10" counter ${mainCounterBoost(800)}`);
assert.equal(mainCounterBoost(1200), 3.7);

assert.equal(scaleNumeric(16, 1), 16);
assert.equal(scaleNumeric(0, 2), 0);
assert.equal(scaleNumeric(-8, 2), -16);
assert.equal(scaleNumeric(10, 1.336), 13.4);

const scaled = scaleStyle(
	{
		fontSize: 16,
		padding: 12,
		flex: 1,
		opacity: 0.5,
		zIndex: 4,
		marginTop: 0,
		transform: [{ translateY: 10 }, { scale: 1.2 }],
		shadowOffset: { width: 0, height: 2 },
	},
	2,
);
assert.equal(scaled.fontSize, 32);
assert.equal(scaled.padding, 24);
assert.equal(scaled.flex, 1);
assert.equal(scaled.opacity, 0.5);
assert.equal(scaled.zIndex, 4);
assert.equal(scaled.marginTop, 0);
assert.equal(scaled.transform[0].translateY, 20);
assert.equal(scaled.transform[1].scale, 1.2);
assert.equal(scaled.shadowOffset.height, 4);

assert.deepEqual(scaleStyles({ a: { fontSize: 10 } }, 1), { a: { fontSize: 10 } });

const column = scaleStyle({ maxWidth: 400, fontSize: 16 }, 1.336);
assert.ok(column.maxWidth > 400 * 1.336, `content column ${column.maxWidth}`);
assert.equal(column.fontSize, 21.4);

const chip = scaleStyle({ maxWidth: 140 }, 1.336);
assert.equal(chip.maxWidth, 187);

console.log('uiScaleMath tests passed');
