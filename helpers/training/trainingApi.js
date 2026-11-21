import { apiRequest } from '../apiClient';
import {
	TRAINING_ANALYSIS_URL,
	TRAINING_FAVORITES_URL,
	TRAINING_GOALS_URL,
	TRAINING_HISTORY_URL,
	TRAINING_RECORDS_URL,
	TRAINING_SESSIONS_URL,
	trainingCatalogUrl,
	trainingChallengeAttemptsUrl,
	trainingChallengePublicationUrl,
	trainingChallengeRankingUrl,
	trainingChallengeUrl,
	trainingDefinitionUrl,
	trainingEventAbortUrl,
	trainingEventAttemptsUrl,
	trainingEventClassificationUrl,
	trainingEventCompleteUrl,
	trainingEventCurrentAttemptUrl,
	trainingExerciseFavoriteUrl,
	trainingExerciseUrl,
	trainingFavoriteUrl,
	trainingSessionPublishUrl,
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
	if (numeric) {
		return apiRequest(trainingDefinitionUrl(id), { accessToken });
	}
	if (id === 'fifty_four_dart') {
		return apiRequest(trainingChallengeUrl(id), { accessToken });
	}
	return apiRequest(trainingExerciseUrl(id), { accessToken });
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

export function fetchTrainingHistory(accessToken, { kinds, days, beforeCompletedAt, beforeId } = {}) {
	const params = new URLSearchParams();
	if (Array.isArray(kinds) && kinds.length > 0) {
		params.set('kinds', kinds.join(','));
	}
	if (days === 7 || days === 30 || days === 90) {
		params.set('days', String(days));
	}
	if (beforeCompletedAt && beforeId) {
		params.set('beforeCompletedAt', beforeCompletedAt);
		params.set('beforeId', String(beforeId));
	}
	const query = params.toString();
	const url = query ? `${TRAINING_SESSIONS_URL}?${query}` : TRAINING_SESSIONS_URL;
	return apiRequest(url, { accessToken });
}

export function fetchTrainingHistoryDetail(accessToken, id) {
	return apiRequest(`${TRAINING_SESSIONS_URL}/${id}`, { accessToken });
}

export function deleteTrainingHistory(accessToken) {
	return apiRequest(TRAINING_HISTORY_URL, {
		method: 'DELETE',
		accessToken,
	});
}

export function fetchTrainingRecords(accessToken) {
	return apiRequest(TRAINING_RECORDS_URL, { accessToken });
}

export function fetchTrainingGoals(accessToken) {
	return apiRequest(TRAINING_GOALS_URL, { accessToken });
}

export function fetchTrainingAnalysis(accessToken) {
	return apiRequest(TRAINING_ANALYSIS_URL, { accessToken });
}

export function fetchChallengeRanking(accessToken, definitionId, { offset = 0, limit = 10 } = {}) {
	const params = new URLSearchParams();
	params.set('offset', String(offset));
	params.set('limit', String(limit));
	return apiRequest(`${trainingChallengeRankingUrl(definitionId)}?${params}`, { accessToken });
}

export function fetchChallengeAttempts(accessToken, definitionId, {
	sort = 'newest',
	days,
	beforeCompletedAt,
	beforeId,
} = {}) {
	const params = new URLSearchParams();
	if (sort === 'best' || sort === 'newest') {
		params.set('sort', sort);
	}
	if (days === 7 || days === 30 || days === 90) {
		params.set('days', String(days));
	}
	if (beforeCompletedAt && beforeId) {
		params.set('beforeCompletedAt', beforeCompletedAt);
		params.set('beforeId', String(beforeId));
	}
	const query = params.toString();
	const url = query
		? `${trainingChallengeAttemptsUrl(definitionId)}?${query}`
		: trainingChallengeAttemptsUrl(definitionId);
	return apiRequest(url, { accessToken });
}

export function publishChallengeSession(accessToken, sessionId) {
	return apiRequest(trainingSessionPublishUrl(sessionId), {
		method: 'POST',
		accessToken,
	});
}

export function withdrawChallengePublication(accessToken, definitionId) {
	return apiRequest(trainingChallengePublicationUrl(definitionId), {
		method: 'DELETE',
		accessToken,
	});
}

export function startEventAttempt(accessToken, definitionId, clientAttemptId) {
	return apiRequest(trainingEventAttemptsUrl(definitionId), {
		method: 'POST',
		accessToken,
		json: true,
		body: { clientAttemptId },
	});
}

export function fetchCurrentEventAttempt(accessToken, definitionId) {
	return apiRequest(trainingEventCurrentAttemptUrl(definitionId), { accessToken });
}

export function completeEventAttempt(accessToken, definitionId, clientAttemptId, body) {
	return apiRequest(trainingEventCompleteUrl(definitionId, clientAttemptId), {
		method: 'POST',
		accessToken,
		json: true,
		body,
	});
}

export function abortEventAttempt(accessToken, definitionId, clientAttemptId) {
	return apiRequest(trainingEventAbortUrl(definitionId, clientAttemptId), {
		method: 'POST',
		accessToken,
	});
}

export function fetchEventClassification(accessToken, definitionId) {
	return apiRequest(trainingEventClassificationUrl(definitionId), { accessToken });
}

export function reorderTrainingFavorites(accessToken, kind, ids) {
	return apiRequest(TRAINING_FAVORITES_URL, {
		method: 'PUT',
		accessToken,
		json: true,
		body: kind === 'exercises' ? { kind, exerciseKeys: ids } : { kind, definitionIds: ids },
	});
}
