import AsyncStorage from '@react-native-async-storage/async-storage';

/** Definicja otwarta na tym telefonie. Dzięki niej ćwiczenie da się dokończyć bez sieci. */
export function definitionCacheKey(userId, id) {
	return `@twentysix/training-definition/${userId ?? 'device'}/${id}`;
}

export async function loadCachedDefinition(userId, id) {
	const raw = await AsyncStorage.getItem(definitionCacheKey(userId, id));
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

export async function saveCachedDefinition(userId, definition) {
	if (!definition?.id) {
		return;
	}
	await AsyncStorage.setItem(
		definitionCacheKey(userId, definition.id),
		JSON.stringify(definition),
	);
}
