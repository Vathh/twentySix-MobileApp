import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ProfileGameHistoryItem from './ProfileGameHistoryItem';
import { fetchPlayerGames } from '../../helpers/playerProfileApi';
import { cardToneStyle } from '../../helpers/profileTones';
import { colors } from '../../theme/colors';

const ProfileGameHistory = ({ playerId, accessToken, initialItems, initialHasMore }) => {
	const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);
	const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const loadMore = async () => {
		if (loading || !hasMore) return;
		setLoading(true);
		setError('');
		const nextPage = page + 1;
		const result = await fetchPlayerGames(playerId, accessToken, nextPage);
		if (!result.ok) {
			setError(result.message || 'Nie udało się wczytać historii.');
			setLoading(false);
			return;
		}
		const nextItems = Array.isArray(result.data?.items) ? result.data.items : [];
		setItems((prev) => [...prev, ...nextItems]);
		setHasMore(Boolean(result.data?.has_more));
		setPage(nextPage);
		setLoading(false);
	};

	return (
		<View style={styles.wrap}>
			<Text style={styles.sectionLabel}>Ostatnie mecze</Text>
			{items.length === 0 ? (
				<View style={styles.empty}>
					<Text style={styles.emptyText}>Brak meczów w historii.</Text>
				</View>
			) : (
				<View style={[styles.group, cardToneStyle(colors.accent)]}>
					{items.map((item, index) => (
						<ProfileGameHistoryItem
							key={`${item?.type || 'g'}-${item?.id || index}-${item?.date || index}`}
							item={item}
							first={index === 0}
							last={index === items.length - 1}
						/>
					))}
				</View>
			)}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{hasMore ? (
				<Pressable
					style={({ pressed }) => [
						styles.loadMore,
						loading && styles.disabled,
						pressed && !loading && styles.loadMorePressed,
					]}
					onPress={loadMore}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color={colors.accent} />
					) : (
						<Text style={styles.loadMoreText}>Załaduj więcej</Text>
					)}
				</Pressable>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		paddingBottom: 24,
	},
	sectionLabel: {
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	group: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
		backgroundColor: colors.bgElevated,
	},
	empty: {
		paddingVertical: 28,
		paddingHorizontal: 16,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
	},
	emptyText: {
		color: colors.textMuted,
		fontSize: 13,
	},
	error: {
		color: colors.dangerText,
		marginTop: 8,
		textAlign: 'center',
	},
	loadMore: {
		marginTop: 12,
		alignItems: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
	},
	loadMorePressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	loadMoreText: {
		color: colors.text,
		fontWeight: '600',
		fontSize: 15,
	},
	disabled: {
		opacity: 0.7,
	},
});

export default ProfileGameHistory;
