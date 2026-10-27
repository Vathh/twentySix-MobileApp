import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchPlayerFeed } from '../../helpers/feedApi';
import FeedPost from '../Activity/FeedPost';
import { colors } from '../../theme/colors';

const ProfileFeed = ({ playerId, accessToken }) => {
	const [items, setItems] = useState([]);
	const [cursor, setCursor] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(
		async (appendCursor) => {
			const result = await fetchPlayerFeed(accessToken, playerId, appendCursor);
			if (!result.ok) {
				setError(result.message || 'Nie udało się wczytać tablicy.');
				return;
			}
			const next = Array.isArray(result.data?.items) ? result.data.items : [];
			setItems((current) => (appendCursor ? [...current, ...next] : next));
			setCursor(result.data?.nextCursor ?? null);
			setError('');
		},
		[accessToken, playerId],
	);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			setLoading(true);
			await load(null);
			if (!cancelled) setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [load]);

	const loadMore = async () => {
		if (!cursor || loadingMore) return;
		setLoadingMore(true);
		await load(cursor);
		setLoadingMore(false);
	};

	if (loading) {
		return (
			<View style={styles.empty}>
				<ActivityIndicator color={colors.accent} />
			</View>
		);
	}

	return (
		<View style={styles.wrap}>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{items.length === 0 ? (
				<View style={styles.empty}>
					<Text style={styles.emptyText}>Na tej tablicy nie ma jeszcze historii.</Text>
				</View>
			) : (
				<View style={styles.list}>
					{items.map((item) => (
						<FeedPost key={String(item.id)} item={item} accessToken={accessToken} />
					))}
				</View>
			)}
			{cursor ? (
				<Pressable
					style={({ pressed }) => [
						styles.loadMore,
						loadingMore && styles.disabled,
						pressed && !loadingMore && styles.loadMorePressed,
					]}
					onPress={loadMore}
					disabled={loadingMore}
				>
					{loadingMore ? (
						<ActivityIndicator color={colors.accent} />
					) : (
						<Text style={styles.loadMoreText}>Starsze</Text>
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
	list: {
		gap: 10,
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
		textAlign: 'center',
	},
	error: {
		color: colors.dangerText,
		marginBottom: 8,
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

export default ProfileFeed;
