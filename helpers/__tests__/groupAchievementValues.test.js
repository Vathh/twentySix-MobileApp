import { groupAchievementValues } from '../groupAchievementValues.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const qf = groupAchievementValues([9, 12, 9, 9, 15, 12], 'asc');
assert(qf.length === 3, 'three unique qf values');
assert(qf[0].value === 9 && qf[0].count === 3, '9 three times, fewest darts first');
assert(qf[1].value === 12 && qf[1].count === 2, '12 twice');
assert(qf[2].value === 15 && qf[2].count === 1, '15 once');

const hf = groupAchievementValues([100, 120, 100, 140], 'desc');
assert(hf.map((item) => item.value).join(',') === '140,120,100', 'hf highest first');
assert(hf.find((item) => item.value === 100).count === 2, '100 twice');

assert(groupAchievementValues(null).length === 0, 'null is empty');
assert(groupAchievementValues([0, -1, 'x']).length === 0, 'invalid values dropped');

console.log('groupAchievementValues tests ok');
