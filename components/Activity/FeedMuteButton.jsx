import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMuteState, setFeedMute } from '../../helpers/feedApi';
import { colors } from '../../theme/colors';

const FeedMuteButton = ({ accessToken, subjectType, subjectKey }) => {
	const [state, setState] = useState(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (!accessToken || !subjectKey) return;
		const result = await fetchMuteState(accessToken, subjectType, String(subjectKey));
		if (result.ok) {
			setState(result.data);
		}
	}, [accessToken, subjectType, subjectKey]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	if (!state?.allowed) {
		return null;
	}

	const toggle = async () => {
		if (busy) return;
		setBusy(true);
		const result = await setFeedMute(accessToken, subjectType, String(subjectKey), !state.muted);
		setBusy(false);
		if (!result.ok) {
			Alert.alert('Tablica', result.data?.message || 'Nie udało się zmienić wyciszenia.');
			return;
		}
		setState(result.data);
	};

	const label = state.muted ? 'Przywróć na stronie głównej' : 'Wycisz na stronie głównej';

	return (
		<Pressable style={styles.button} onPress={toggle} disabled={busy} accessibilityRole="button">
			{busy ? (
				<ActivityIndicator color={colors.accent} size="small" />
			) : (
				<Text style={styles.text}>{label}</Text>
			)}
		</Pressable>
	);
};

const styles = StyleSheet.create({
	button: {
		alignSelf: 'flex-start',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: colors.accentMuted,
	},
	text: {
		color: colors.accent,
		fontWeight: '600',
		fontSize: 13,
	},
});

export default FeedMuteButton;
