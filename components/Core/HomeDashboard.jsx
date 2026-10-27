import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import { fetchFeed } from '../../helpers/feedApi';
import FeedPost from '../Activity/FeedPost';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

const HomeDashboard = ({ navigation }) => {
	const { auth } = useAuth();
	const [items, setItems] = useState([]);
	const [cursor, setCursor] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(
		async ({ refresh = false, appendCursor = null } = {}) => {
			if (!auth?.accessToken) {
				setLoading(false);
				return;
			}
			const result = await fetchFeed(auth.accessToken, appendCursor);
			if (!result.ok) {
				setError(result.data?.message || 'Nie udało się wczytać tablicy.');
				return;
			}
			const next = result.data?.items ?? [];
			setItems((current) => (appendCursor ? [...current, ...next] : next));
			setCursor(result.data?.nextCursor ?? null);
			setError('');
		},
		[auth?.accessToken],
	);

	const reload = useCallback(async () => {
		setRefreshing(true);
		await load({ refresh: true });
		setRefreshing(false);
		setLoading(false);
	}, [load]);

	React.useEffect(() => {
		void (async () => {
			setLoading(true);
			await load();
			setLoading(false);
		})();
	}, [load]);

	const openPlay = () => {
		navigation.getParent()?.navigate('Graj');
	};

	return (
		<FlatList
			style={styles.list}
			contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.content}
			data={items}
			keyExtractor={(item) => String(item.id)}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={reload} colors={[colors.accent]} />
			}
			onEndReached={() => {
				if (!cursor || loadingMore || loading) return;
				setLoadingMore(true);
				void load({ appendCursor: cursor }).finally(() => setLoadingMore(false));
			}}
			ListHeaderComponent={
				error ? <Text style={styles.error}>{error}</Text> : null
			}
			ListEmptyComponent={
				loading ? (
					<ActivityIndicator color={colors.accent} />
				) : (
					<View style={styles.emptyBox}>
						<Text style={styles.emptyTitle}>Na razie cisza</Text>
						<Text style={styles.emptyText}>
							Zagraj albo dołącz do organizacji, a historie pojawią się tutaj.
						</Text>
						<Pressable style={styles.play} onPress={openPlay} accessibilityRole="button">
							<Text style={styles.playText}>Graj</Text>
						</Pressable>
					</View>
				)
			}
			ListFooterComponent={
				loadingMore ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : null
			}
			renderItem={({ item }) => (
				<FeedPost item={item} accessToken={auth?.accessToken} />
			)}
		/>
	);
};

const styles = StyleSheet.create({
	list: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		padding: scaleSize(16),
		gap: scaleSize(10),
	},
	emptyContent: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: scaleSize(24),
	},
	emptyBox: {
		alignItems: 'center',
		gap: scaleSize(8),
	},
	emptyTitle: {
		color: colors.text,
		fontSize: scaleSize(18),
		fontWeight: '700',
	},
	emptyText: {
		color: colors.textMuted,
		textAlign: 'center',
		fontSize: scaleSize(14),
	},
	play: {
		marginTop: scaleSize(8),
		backgroundColor: colors.accent,
		borderRadius: scaleSize(8),
		paddingVertical: scaleSize(10),
		paddingHorizontal: scaleSize(18),
	},
	playText: {
		color: colors.bgDeep,
		fontWeight: '700',
	},
	error: {
		color: colors.danger,
		marginBottom: scaleSize(8),
	},
	footer: {
		marginVertical: scaleSize(12),
	},
});

export default HomeDashboard;
