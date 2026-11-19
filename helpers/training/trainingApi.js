import { apiRequest } from '../apiClient';
import {
	TRAINING_FAVORITES_URL,
	TRAINING_SESSIONS_URL,
	trainingCatalogUrl,
	trainingDefinitionUrl,
	trainingExerciseFavoriteUrl,
	trainingExerciseUrl,
	trainingFavoriteUrl,
} from '../apiConfig';

export const FAVORITE_ADDED = 'Dodano do Ulubionych';
export const FAVORITE_REMOVED = 'Usunięto z Ulubionych';

export function fetchTrainingFavorites(accessToken) {
	return apiRequest(TRAINING_FAVORITES_URL, { accessToken });
}

export function fetchTrainingCatalog(accessToken, kind) {
	return apiRequest(trainingCatalogUrl(kind), { accessToken });
}

export function fetchTrainingDefinition(accessToken, id) {
	const numeric = typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id));
	const url = numeric ? trainingDefinitionUrl(id) : trainingExerciseUrl(id);
	return apiRequest(url, { accessToken });
}

export function addTrainingFavorite(accessToken, id, kind) {
	return apiRequest(TRAINING_FAVORITES_URL, {
		method: 'POST',
		accessToken,
		json: true,
		body: kind === 'exercise' ? { exerciseKey: id } : { definitionId: id },
	});
}

export function removeTrainingFavorite(accessToken, id, kind) {
	const url = kind === 'exercise' ? trainingExerciseFavoriteUrl(id) : trainingFavoriteUrl(id);
	return apiRequest(url, {
		method: 'DELETE',
		accessToken,
	});
}

export function completeTrainingSession(accessToken, body) {
	return apiRequest(TRAINING_SESSIONS_URL, {
		method: 'POST',
		accessToken,
		json: true,
		body,
	});
}

export function reorderTrainingFavorites(accessToken, kind, ids) {
	return apiRequest(TRAINING_FAVORITES_URL, {
		method: 'PUT',
		accessToken,
		json: true,
		body: kind === 'exercises' ? { kind, exerciseKeys: ids } : { kind, definitionIds: ids },
	});
}
