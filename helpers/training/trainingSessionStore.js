import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeTrainingSession } from './trainingApi';
import {
	applySyncOutcome,
	enqueueCompletion,
	sessionBody,
	syncOutcome,
} from './trainingSessionSync';

let tail = Promise.resolve();

function exclusive(task) {
	const run = tail.then(task, task);
	tail = run.then(() => undefined, () => undefined);
	return run;
}

export function trainingOutboxKey(userId) {
	return `@twentysix/training-outbox/${userId ?? 'device'}`;
}

export async function loadTrainingOutbox(userId) {
	const raw = await AsyncStorage.getItem(trainingOutboxKey(userId));
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

async function saveTrainingOutbox(userId, items) {
	await AsyncStorage.setItem(trainingOutboxKey(userId), JSON.stringify(items));
}

export function enqueueTrainingCompletion(userId, record) {
	return exclusive(async () => {
		const next = enqueueCompletion(await loadTrainingOutbox(userId), record);
		await saveTrainingOutbox(userId, next);
		return next;
	});
}

/** Wysyła oczekujące ukończenia tego konta. 409 zostawia jeden wpis. */
export function flushTrainingOutbox(userId, accessToken) {
	return exclusive(() => sendPending(userId, accessToken));
}

async function sendPending(userId, accessToken) {
	const items = await loadTrainingOutbox(userId);
	if (!accessToken) {
		return items;
	}
	let next = items;
	for (const item of items) {
		if (!item || item.sync !== 'pending') {
			continue;
		}
		const response = await completeTrainingSession(accessToken, sessionBody(item));
		next = applySyncOutcome(next, item.clientSessionId, syncOutcome(response));
	}
	await saveTrainingOutbox(userId, next);
	return next;
}
