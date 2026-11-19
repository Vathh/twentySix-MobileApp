import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import useAuth from '../../hooks/useAuth';
import { flushTrainingOutbox } from '../../helpers/training/trainingSessionStore';

/** Po zalogowaniu i po powrocie sieci ukończona sesja schodzi na serwer sama. */
export default function TrainingSessionSync() {
	const { auth } = useAuth();
	const userId = auth?.userId;
	const accessToken = auth?.accessToken;

	useEffect(() => {
		if (!accessToken) {
			return undefined;
		}
		flushTrainingOutbox(userId, accessToken);
		const unsubscribe = NetInfo.addEventListener((state) => {
			if (state.isConnected) {
				flushTrainingOutbox(userId, accessToken);
			}
		});
		return unsubscribe;
	}, [userId, accessToken]);

	return null;
}
