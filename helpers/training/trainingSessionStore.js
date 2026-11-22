import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeTrainingSession } from './trainingApi';
import { rememberSyncedHistory } from './trainingHistoryCache';
import { serverToHistoryItem } from './trainingHistoryMerge';
import {
	applySyncOutcome,
	enqueueCompletion,
	sessionBody,
	syncOutcome,
	syncReason,
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

export function clearTrainingOutbox(userId) {
	return exclusive(async () => {
		await AsyncStorage.removeItem(trainingOutboxKey(userId));
		return [];
	});
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
		const outcome = syncOutcome(response);
		const reason = syncReason(response);
		next = applySyncOutcome(next, item.clientSessionId, outcome, reason);
		if (outcome === 'synced') {
			const serverId = response?.data?.id ?? item.id;
			next = next.map((row) => (
				row?.clientSessionId === item.clientSessionId
					? { ...row, id: serverId, sync: 'synced', syncReason: null }
					: row
			));
			const card = serverToHistoryItem({
				id: serverId,
				clientSessionId: item.clientSessionId,
				kind: item.exerciseKey ? 'exercise' : (item.kind || 'plan'),
				kindLabel: undefined,
				name: item.name,
				definitionId: item.definitionId ?? response?.data?.definitionId ?? null,
				exerciseKey: item.exerciseKey ?? response?.data?.exerciseKey ?? null,
				completedAt: item.completedAt,
				score: item.score,
				stats: item.stats,
			});
			if (card) {
				await rememberSyncedHistory(userId, [card]);
			}
		}
	}
	await saveTrainingOutbox(userId, next);
	return next;
}
