import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const KEEP_AWAKE_TAG = 'twentysix-training-play';

/**
 * Trzyma ekran włączony podczas aktywnej sesji treningowej (ćwiczenie / plan / wyzwanie / event).
 */
export default function useTrainingKeepAwake(active) {
	const isFocused = useIsFocused();

	useEffect(() => {
		if (!active || !isFocused) {
			void deactivateKeepAwake(KEEP_AWAKE_TAG);
			return undefined;
		}
		void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
		return () => {
			void deactivateKeepAwake(KEEP_AWAKE_TAG);
		};
	}, [active, isFocused]);
}
