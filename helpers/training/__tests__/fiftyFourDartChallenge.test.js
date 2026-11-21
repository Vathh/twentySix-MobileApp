import assert from 'node:assert/strict';
import {
	STAGES,
	canPlayFiftyFourDart,
	currentTarget,
	recordFiftyFourDart,
	scoreChallenge,
	startFiftyFourSession,
	totalDarts,
} from '../fiftyFourDartChallenge.js';

assert.equal(totalDarts(), 54);
assert.deepEqual(STAGES.map((stage) => stage.id), ['shanghai_10_15', 'doubles', 'shanghai_16_20']);

assert.equal(canPlayFiftyFourDart({
	kind: 'challenge',
	challengeKey: 'fifty_four_dart',
	inactive: false,
}), true);
assert.equal(canPlayFiftyFourDart({
	kind: 'exercise',
	challengeKey: 'fifty_four_dart',
}), false);

const definition = { id: 7, name: '54-Dart Challenge', kind: 'challenge', challengeKey: 'fifty_four_dart' };
let session = startFiftyFourSession(definition, '11111111-1111-4111-8111-111111111111');
assert.equal(currentTarget(session).targetLabel, '10');
assert.equal(currentTarget(session).dartNumber, 1);

({ session } = recordFiftyFourDart(session, 'single'));
({ session } = recordFiftyFourDart(session, 'double'));
({ session } = recordFiftyFourDart(session, 'triple'));
assert.equal(currentTarget(session).targetLabel, '11');

const perfect = [];
for (const sector of ['10', '11', '12', '13', '14', '15']) {
	perfect.push({ stageId: 'shanghai_10_15', target: sector, ring: 'single' });
	perfect.push({ stageId: 'shanghai_10_15', target: sector, ring: 'double' });
	perfect.push({ stageId: 'shanghai_10_15', target: sector, ring: 'triple' });
}
for (let n = 1; n <= 20; n += 1) {
	perfect.push({ stageId: 'doubles', target: `D${n}`, ring: 'double' });
}
perfect.push({ stageId: 'doubles', target: 'Bull', ring: 'inner' });
for (const sector of ['16', '17', '18', '19', '20']) {
	perfect.push({ stageId: 'shanghai_16_20', target: sector, ring: 'single' });
	perfect.push({ stageId: 'shanghai_16_20', target: sector, ring: 'double' });
	perfect.push({ stageId: 'shanghai_16_20', target: sector, ring: 'triple' });
}
const scored = scoreChallenge(perfect);
assert.equal(scored.score, 3190);
assert.equal(scored.stages[0].score, 1140);
assert.equal(scored.stages[1].score, 1100);
assert.equal(scored.stages[2].score, 950);
assert.equal(scored.complete, true);

console.log('fiftyFourDartChallenge.test.js ok');
