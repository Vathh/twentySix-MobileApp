import {
	FEED_MUTES_URL,
	FEED_PREFERENCES_URL,
	FEED_URL,
	getActivityCommentsUrl,
	getActivityReactionUrl,
	getCommentReactionUrl,
	getCommentUrl,
	getPlayerFeedUrl,
} from './apiConfig';
import { apiRequest } from './apiClient';

export function fetchFeed(accessToken, cursor) {
	const url = cursor ? `${FEED_URL}?cursor=${encodeURIComponent(cursor)}` : FEED_URL;
	return apiRequest(url, { accessToken });
}

export function fetchPlayerFeed(accessToken, playerId, cursor) {
	const base = getPlayerFeedUrl(playerId);
	const url = cursor ? `${base}?cursor=${encodeURIComponent(cursor)}` : base;
	return apiRequest(url, { accessToken });
}

export function fetchFeedPreferences(accessToken) {
	return apiRequest(FEED_PREFERENCES_URL, { accessToken });
}

export function updateFeedPreferences(accessToken, body) {
	return apiRequest(FEED_PREFERENCES_URL, {
		method: 'PUT',
		accessToken,
		json: true,
		body,
	});
}

export function fetchMuteState(accessToken, subjectType, subjectKey) {
	const url = `${FEED_MUTES_URL}?subjectType=${encodeURIComponent(subjectType)}&subjectKey=${encodeURIComponent(subjectKey)}`;
	return apiRequest(url, { accessToken });
}

export function fetchActivityComments(accessToken, activityId) {
	return apiRequest(getActivityCommentsUrl(activityId), { accessToken });
}

export function addActivityComment(accessToken, activityId, body, parentId = null) {
	return apiRequest(getActivityCommentsUrl(activityId), {
		method: 'POST',
		accessToken,
		json: true,
		body: { body, parentId },
	});
}

export function deleteActivityComment(accessToken, commentId) {
	return apiRequest(getCommentUrl(commentId), {
		method: 'DELETE',
		accessToken,
	});
}

export function setActivityReaction(accessToken, activityId, kind) {
	return apiRequest(getActivityReactionUrl(activityId), {
		method: 'PUT',
		accessToken,
		json: true,
		body: { kind },
	});
}

export function setCommentReaction(accessToken, commentId, kind) {
	return apiRequest(getCommentReactionUrl(commentId), {
		method: 'PUT',
		accessToken,
		json: true,
		body: { kind },
	});
}

export function setFeedMute(accessToken, subjectType, subjectKey, muted) {
	return apiRequest(FEED_MUTES_URL, {
		method: muted ? 'POST' : 'DELETE',
		accessToken,
		json: true,
		body: { subjectType, subjectKey },
	});
}
