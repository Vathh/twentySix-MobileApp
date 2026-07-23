import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { PUSH_TOKENS_API_URL } from '../apiConfig';

const ANDROID_CHANNEL_ID = 'invitations';

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

function projectId() {
	return (
		Constants.easConfig?.projectId
		?? Constants.expoConfig?.extra?.eas?.projectId
		?? null
	);
}

async function ensureAndroidChannel() {
	if (Platform.OS !== 'android') {
		return;
	}

	await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
		name: 'Zaproszenia',
		importance: Notifications.AndroidImportance.HIGH,
		vibrationPattern: [0, 250, 250, 250],
		lightColor: '#F59E0B',
	});
}

/**
 * Prosi o uprawnienia, pobiera Expo Push Token i rejestruje go w API.
 * @returns {Promise<string|null>} token albo null (emulator / brak zgody / błąd)
 */
export async function registerPushToken(accessToken) {
	if (!accessToken || !Device.isDevice) {
		return null;
	}

	try {
		await ensureAndroidChannel();

		const { status: existing } = await Notifications.getPermissionsAsync();
		let finalStatus = existing;
		if (existing !== 'granted') {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}
		if (finalStatus !== 'granted') {
			return null;
		}

		const id = projectId();
		if (!id) {
			console.warn('[push] Brak EAS projectId — nie można pobrać push tokena');
			return null;
		}

		const push = await Notifications.getExpoPushTokenAsync({ projectId: id });
		const token = push?.data;
		if (!token) {
			return null;
		}

		const platform =
			Platform.OS === 'ios' || Platform.OS === 'android'
				? Platform.OS
				: 'unknown';

		const res = await fetch(PUSH_TOKENS_API_URL, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				token,
				platform,
				deviceName: Device.modelName ?? undefined,
			}),
		});

		if (!res.ok) {
			console.warn('[push] Rejestracja tokena nieudana', res.status);
			return null;
		}

		return token;
	} catch (e) {
		console.warn('[push] registerPushToken', e?.message ?? e);
		return null;
	}
}
