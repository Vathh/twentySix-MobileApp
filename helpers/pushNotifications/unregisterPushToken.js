import { PUSH_TOKENS_API_URL } from '../apiConfig';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

/**
 * Usuwa token z API (np. przy wylogowaniu).
 */
export async function unregisterPushToken(accessToken, expoPushToken) {
	if (!accessToken || !expoPushToken) {
		return;
	}

	try {
		await fetch(PUSH_TOKENS_API_URL, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ token: expoPushToken }),
		});
	} catch {
		// sieć opcjonalna — sesja i tak jest czyszczona lokalnie
	}
}

/**
 * Pobiera token bieżącego urządzenia i usuwa go z API.
 */
export async function unregisterCurrentDevicePushToken(accessToken) {
	if (!accessToken || !Device.isDevice) {
		return;
	}

	try {
		const projectId =
			Constants.easConfig?.projectId
			?? Constants.expoConfig?.extra?.eas?.projectId
			?? null;
		if (!projectId) {
			return;
		}

		const push = await Notifications.getExpoPushTokenAsync({ projectId });
		await unregisterPushToken(accessToken, push?.data);
	} catch {
		// ignore
	}
}
