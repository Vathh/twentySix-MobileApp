import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchFollowState, setFollow } from '../../helpers/feedApi';
import { colors } from '../../theme/colors';

const FollowButton = ({ accessToken, subjectType, subjectKey }) => {
	const [state, setState] = useState(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (!accessToken || !subjectKey) return;
		const result = await fetchFollowState(accessToken, subjectType, String(subjectKey));
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
		const result = await setFollow(accessToken, subjectType, String(subjectKey), !state.following);
		setBusy(false);
		if (!result.ok) {
			Alert.alert('Tablica', result.data?.message || 'Nie udało się zmienić obserwowania.');
			return;
		}
		setState(result.data);
	};

	const following = !!state.following;

	return (
		<Pressable
			style={[styles.button, following ? styles.following : styles.follow]}
			onPress={toggle}
			disabled={busy}
			accessibilityRole="button"
		>
			{busy ? (
				<ActivityIndicator color={following ? colors.textSecondary : colors.accent} size="small" />
			) : (
				<View style={styles.content}>
					<Ionicons
						name={following ? 'eye-off-outline' : 'eye-outline'}
						size={16}
						color={following ? colors.textSecondary : colors.accent}
					/>
					<Text style={[styles.text, following ? styles.followingText : styles.followText]}>
						{following ? 'Przestań obserwować' : 'Obserwuj'}
					</Text>
				</View>
			)}
		</Pressable>
	);
};

const styles = StyleSheet.create({
	button: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	follow: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: colors.accent,
	},
	following: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: colors.border,
	},
	text: {
		fontWeight: '600',
		fontSize: 13,
	},
	followText: {
		color: colors.accent,
	},
	followingText: {
		color: colors.textSecondary,
	},
});

export default FollowButton;
