/**
 * Lokalny stan otwartej próby eventu: pozycja, wyniki slotów i bieżąca sesja ćwiczenia z lotkami.
 * Crash / utrata sieci nie kasują — po restarcie wznawiamy to samo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

let tail = Promise.resolve();

function exclusive(task) {
	const run = tail.then(task, task);
	tail = run.then(() => undefined, () => undefined);
	return run;
}

export function hangingEventKey(userId) {
	return `@twentysix/training-hanging-event/${userId ?? 'device'}`;
}

export async function loadHangingEvent(userId) {
	const raw = await AsyncStorage.getItem(hangingEventKey(userId));
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : null;
	} catch {
		return null;
	}
}

export function saveHangingEvent(userId, hang) {
	return exclusive(async () => {
		if (!hang) {
			await AsyncStorage.removeItem(hangingEventKey(userId));
			return null;
		}
		await AsyncStorage.setItem(hangingEventKey(userId), JSON.stringify(hang));
		return hang;
	});
}

export function clearHangingEvent(userId) {
	return exclusive(async () => {
		await AsyncStorage.removeItem(hangingEventKey(userId));
		return null;
	});
}

export function emptyEventHang(event, clientAttemptId, inputMode, serverAttempt) {
	const items = (Array.isArray(event?.items) ? event.items : []).filter((row) => row?.kind === 'exercise');
	return {
		clientAttemptId,
		definitionId: event.id,
		event,
		serverAttempt: serverAttempt ?? null,
		index: 0,
		total: items.length,
		inputMode: inputMode ?? null,
		results: [],
		exerciseSession: null,
		phase: items.length > 0 ? 'running' : 'summary',
		completedAt: null,
		summary: null,
		updatedAt: Date.now(),
	};
}
