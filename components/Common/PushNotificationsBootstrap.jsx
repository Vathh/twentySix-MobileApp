import usePushNotifications from '../../hooks/usePushNotifications';

/** Rejestracja push + listener tap → Zaproszenia (musi być pod AuthProvider). */
export default function PushNotificationsBootstrap() {
	usePushNotifications();
	return null;
}
