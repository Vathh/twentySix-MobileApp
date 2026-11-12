import { remoteAnnouncement } from '../remoteAnnouncement.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function state({ visits = [], lastLegClose = null, status = 'in_progress' } = {}) {
	return {
		meta: {
			matchFormat: { gameType: 'x01', startingScore: 501 },
			lastLegClose,
			status,
		},
		visits,
	};
}

function visit(score, extra = {}) {
	return { score, dartsInVisit: 3, bust: false, closedLeg: false, ...extra };
}

export function runAnnounceRemoteVisitTests() {
	const mid = {
		visits: [visit(60)],
		lastLegClose: null,
		status: 'in_progress',
	};

	assert(remoteAnnouncement(null, state()) === 'silent', 'first snapshot stays quiet');
	assert(
		remoteAnnouncement(mid, state({ visits: [visit(60), visit(41)] })).score === 41,
		'spoken score of the new visit',
	);
	assert(
		remoteAnnouncement(mid, state({ visits: [visit(60), visit(0, { bust: true, score: 26 })] })).score === 0,
		'bust is spoken as zero',
	);
	assert(
		remoteAnnouncement(mid, state({
			visits: [],
			lastLegClose: { legNumber: 1 },
		})) === 'gameshot',
		'leg close with an empty next leg plays gameshot',
	);
	assert(
		remoteAnnouncement(
			{ visits: [visit(100)], lastLegClose: { legNumber: 1 }, status: 'in_progress' },
			state({ visits: [], lastLegClose: { legNumber: 2 }, status: 'finished' }),
		) === 'gameshot-match',
		'match-winning leg plays gameshot and the match',
	);
	assert(
		remoteAnnouncement(
			{ visits: [], lastLegClose: { legNumber: 2 }, status: 'in_progress' },
			state({ visits: [visit(140, { closedLeg: true })], lastLegClose: { legNumber: 1 } }),
		) === 'silent',
		'undo of a leg close does not replay gameshot',
	);
}
