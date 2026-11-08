import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { fetchBlockedUsers, unblockFeedUser } from '../../helpers/feedApi';
import { colors } from '../../theme/colors';

const BlockedUsersScreen = () => {
	const { auth } = useAuth();
	const [people, setPeople] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const load = useCallback(async () => {
		const result = await fetchBlockedUsers(auth?.accessToken);
		if (!result.ok) {
			setError(result.data?.message || 'Nie udało się wczytać listy.');
			return;
		}
		setPeople(Array.isArray(result.data?.blocked) ? result.data.blocked : []);
		setError('');
	}, [auth?.accessToken]);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			setLoading(true);
			await load();
			if (!cancelled) setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [load]);

	const unblock = async (userId) => {
		const result = await unblockFeedUser(auth?.accessToken, userId);
		if (!result.ok) {
			setError(result.data?.message || 'Nie udało się odblokować.');
			return;
		}
		setPeople((current) => current.filter((person) => person.userId !== userId));
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={colors.accent} />
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{people.length === 0 ? (
				<Text style={styles.empty}>Nikogo nie blokujesz.</Text>
			) : (
				people.map((person) => (
					<View key={String(person.userId)} style={styles.row}>
						<Text style={styles.name}>{person.name}</Text>
						<Pressable onPress={() => unblock(person.userId)} accessibilityRole="button">
							<Text style={styles.unblock}>Odblokuj</Text>
						</Pressable>
					</View>
				))
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
		padding: 16,
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bg,
	},
	empty: {
		color: colors.textMuted,
		fontSize: 14,
	},
	error: {
		color: colors.danger,
		marginBottom: 12,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	name: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	unblock: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
});

export default BlockedUsersScreen;
