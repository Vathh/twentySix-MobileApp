import React, { useCallback, useState } from 'react';
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { fetchCompetitionPage } from '../../helpers/competitionsApi';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';
import { STATUS_STYLES } from './DetailHeader';

/**
 * Wspólna lista katalogu Rozgrywek (organizacji / sezony / turnieje).
 *
 * @param {{
 *   title: string,
 *   emptyTitle: string,
 *   emptyDescription: string,
 *   icon?: string,
 *   buildUrl: (page: number) => string,
 *   detailRoute: string,
 *   navigation: object,
 * }} props
 */
const CompetitionList = ({
	title,
	emptyTitle,
	emptyDescription,
	icon,
	buildUrl,
	detailRoute,
	navigation,
}) => {
	const { auth } = useAuth();
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');

	const loadPage = useCallback(
		async (nextPage, { append, soft } = {}) => {
			if (!auth?.accessToken) {
				setItems([]);
				setHasMore(false);
				setError('Brak autoryzacji.');
				setLoading(false);
				return;
			}

			if (append) {
				setLoadingMore(true);
			} else if (!soft) {
				setLoading(true);
			}

			const result = await fetchCompetitionPage(buildUrl, auth.accessToken, nextPage);

			if (result.error) {
				if (!append) {
					setItems([]);
					setHasMore(false);
				}
				setError(result.error);
			} else {
				setError('');
				setItems((prev) => (append ? [...prev, ...result.items] : result.items));
				setHasMore(result.hasMore);
				setPage(nextPage);
			}

			setLoading(false);
			setLoadingMore(false);
			setRefreshing(false);
		},
		[auth?.accessToken, buildUrl],
	);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			void loadPage(1, { append: false });
		}, [loadPage]),
	);

	const onRefresh = () => {
		setRefreshing(true);
		void loadPage(1, { append: false, soft: true });
	};

	const onLoadMore = () => {
		if (loadingMore || !hasMore) return;
		void loadPage(page + 1, { append: true });
	};

	if (loading) {
		return <ScreenLoading />;
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
			}
		>
			<View style={styles.form}>
				<Text style={styles.sectionLabel}>{title}</Text>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				{!error && items.length === 0 ? (
					<View style={styles.empty}>
						{icon ? (
							<View style={styles.emptyIcon}>
								<Ionicons name={icon} size={26} color={colors.accent} />
							</View>
						) : null}
						<Text style={styles.emptyTitle}>{emptyTitle}</Text>
						<Text style={styles.emptyDescription}>{emptyDescription}</Text>
					</View>
				) : null}

				{items.map((item) => {
					const subtitle = item.subtitle_missing
						? 'Data rozgrywek: nie ustawiono'
						: item.subtitle || null;
					const statusStyle = item.status_variant
						? STATUS_STYLES[item.status_variant] ?? STATUS_STYLES.finished
						: null;

					return (
						<Pressable
							key={item.id}
							accessibilityRole="button"
							accessibilityLabel={item.title}
							style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
							onPress={() => {
								if (detailRoute && navigation) {
									navigation.navigate(detailRoute, { id: item.id });
								}
							}}
						>
							{icon ? (
								<View style={styles.cardIcon}>
									<Ionicons name={icon} size={20} color={colors.accent} />
								</View>
							) : null}
							<View style={styles.cardBody}>
								<View style={styles.cardHeader}>
									<Text style={styles.cardTitle}>{item.title}</Text>
									{item.status_label && statusStyle ? (
										<View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
											<Text style={[styles.badgeText, { color: statusStyle.text }]}>
												{item.status_label}
											</Text>
										</View>
									) : null}
								</View>
								{subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
							</View>
							<Ionicons name="chevron-forward" size={18} color={colors.textDim} />
						</Pressable>
					);
				})}

				{hasMore ? (
					<Pressable
						style={({ pressed }) => [
							styles.loadMore,
							loadingMore && styles.loadMoreDisabled,
							pressed && !loadingMore && styles.cardPressed,
						]}
						onPress={onLoadMore}
						disabled={loadingMore}
					>
						<Text style={styles.loadMoreText}>
							{loadingMore ? 'Ładowanie…' : 'Załaduj więcej'}
						</Text>
					</Pressable>
				) : null}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		flexGrow: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		paddingBottom: 40,
	},
	form: {
		alignItems: 'stretch',
		width: '100%',
		maxWidth: 400,
	},
	sectionLabel: {
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	error: {
		color: colors.dangerText,
		marginBottom: 16,
		fontSize: 14,
	},
	empty: {
		marginTop: 24,
		paddingVertical: 28,
		paddingHorizontal: 16,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		borderRadius: 10,
	},
	emptyIcon: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
		marginBottom: 14,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 6,
		textAlign: 'center',
	},
	emptyDescription: {
		fontSize: 13,
		lineHeight: 19,
		color: colors.textMuted,
		textAlign: 'center',
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		paddingVertical: 14,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		borderRadius: 10,
		gap: 12,
	},
	cardPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	cardIcon: {
		width: 40,
		height: 40,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	cardBody: {
		flex: 1,
		minWidth: 0,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 10,
	},
	cardTitle: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
	},
	cardSubtitle: {
		marginTop: 3,
		fontSize: 13,
		color: colors.textMuted,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '600',
	},
	loadMore: {
		marginTop: 2,
		alignItems: 'center',
		paddingVertical: 14,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
	},
	loadMoreDisabled: {
		opacity: 0.6,
	},
	loadMoreText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '600',
	},
});

export default CompetitionList;
