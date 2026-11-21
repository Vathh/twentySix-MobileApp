import AsyncStorage from '@react-native-async-storage/async-storage';

let tail = Promise.resolve();

function exclusive(task) {
	const run = tail.then(task, task);
	tail = run.then(() => undefined, () => undefined);
	return run;
}

export function hangingPlanKey(userId) {
	return `@twentysix/training-hanging-plan/${userId ?? 'device'}`;
}

export async function loadHangingPlan(userId) {
	const raw = await AsyncStorage.getItem(hangingPlanKey(userId));
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

export function saveHangingPlan(userId, hang) {
	return exclusive(async () => {
		if (!hang) {
			await AsyncStorage.removeItem(hangingPlanKey(userId));
			return null;
		}
		await AsyncStorage.setItem(hangingPlanKey(userId), JSON.stringify(hang));
		return hang;
	});
}

export function clearHangingPlan(userId) {
	return exclusive(async () => {
		await AsyncStorage.removeItem(hangingPlanKey(userId));
		return null;
	});
}
