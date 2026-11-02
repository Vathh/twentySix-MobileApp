import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { getCurrentAccessToken } from '../../helpers/authTokenHolder';
import { fetchCompetitionPage } from '../../helpers/competitionsApi';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';
import ScreenLoading from '../Common/ScreenLoading';
import PlayerAvatar from '../Common/PlayerAvatar';
import { STATUS_STYLES } from './DetailHeader';

function statsLine(item) {
	if (!Array.isArray(item?.stats) || item.stats.length === 0) {
		return null;
	}
	const parts = item.stats
		.filter((stat) => stat && stat.value != null && stat.label)
		.map((stat) => `${stat.value} ${stat.label}`);
	return parts.length > 0 ? parts.join(' · ') : null;
}

function ChipRow({ options, value, onChange }) {
	if (!options || options.length === 0) {
		return null;
	}
	return (
		<View style={styles.chips}>
			{options.map((option) => {
				const active = option.key === value;
				return (
					<Pressable
						key={option.key || 'all'}
						style={[styles.chip, active && styles.chipOn]}
						onPress={() => onChange(option.key)}
					>
						<Text style={[styles.chipText, active && styles.chipTextOn]}>{option.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

/**
 * Wspólna lista katalogu Rozgrywek (organizacji / sezony / turnieje).
 *
 * @param {{
 *   title: string,
 *   emptyTitle: string,
 *   emptyDescription: string,
 *   icon?: string,
 *   searchPlaceholder?: string,
 *   sortOptions?: Array<{ key: string, label: string }>,
 *   statusOptions?: Array<{ key: string, label: string }>,
 *   buildUrl: (page: number, filters?: { q?: string, sort?: string, status?: string }) => string,
 *   detailRoute: string,
 *   navigation: object,
 *   onCreate?: () => void,
 *   createLabel?: string,
 * }} props
 */
const CompetitionList = ({
	title,
	emptyTitle,
	emptyDescription,
	icon,
	searchPlaceholder = 'Szukaj',
	sortOptions = [],
	statusOptions = [],
	buildUrl,
	detailRoute,
	navigation,
	onCreate,
	createLabel = 'Nowa organizacja',
}) => {
	const { auth } = useAuth();
	const [items, setItems] = useState([]);
	const [summary, setSummary] = useState('');
	const [canCreate, setCanCreate] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [draft, setDraft] = useState('');
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState('activity');
	const [status, setStatus] = useState('');
	const requestSeqRef = useRef(0);
	const hasLoadedRef = useRef(false);
	const accessTokenRef = useRef(auth?.accessToken);
	accessTokenRef.current = auth?.accessToken;
	const sessionGate = auth?.accessToken ? 'in' : 'out';

	useEffect(() => {
		const timer = setTimeout(() => setQuery(draft.trim()), 300);
		return () => clearTimeout(timer);
	}, [draft]);

	const loadPage = useCallback(
		async (nextPage, { append, soft } = {}) => {
			const token = accessTokenRef.current;
			if (!token) {
				setItems([]);
				setHasMore(false);
				setSummary('');
				setCanCreate(false);
				setError('Brak autoryzacji.');
				setLoading(false);
				return;
			}

			const seq = ++requestSeqRef.current;
			if (append) {
				setLoadingMore(true);
			} else if (!soft && !hasLoadedRef.current) {
				setLoading(true);
			}

			const filters = { q: query, sort, status };
			const result = await fetchCompetitionPage(
				(pageNumber) => buildUrl(pageNumber, filters),
				token,
				nextPage,
			);

			if (seq !== requestSeqRef.current) {
				return;
			}
			const currentToken = getCurrentAccessToken();
			if (currentToken && token !== currentToken) {
				setLoading(false);
				setLoadingMore(false);
				setRefreshing(false);
				return;
			}

			if (result.error) {
				if (!append) {
					setItems([]);
					setHasMore(false);
					setSummary('');
					setCanCreate(false);
				}
				setError(result.error);
			} else {
				setError('');
				setItems((prev) => (append ? [...prev, ...result.items] : result.items));
				setHasMore(result.hasMore);
				if (!append) {
					setSummary(result.summary || '');
					setCanCreate(Boolean(result.canCreate));
				}
				setPage(nextPage);
				hasLoadedRef.current = true;
			}

			setLoading(false);
			setLoadingMore(false);
			setRefreshing(false);
		},
		[buildUrl, query, sort, status],
	);

	useFocusEffect(
		useCallback(() => {
			if (!accessTokenRef.current) return undefined;
			void loadPage(1, { append: false, soft: hasLoadedRef.current });
			return () => {
				requestSeqRef.current += 1;
			};
		}, [loadPage, sessionGate]),
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

	const filtered = Boolean(query || status);
	const shownEmptyTitle = filtered ? 'Brak wyników' : emptyTitle;
	const shownEmptyDescription = filtered
		? 'Zmień frazę albo filtr, żeby zobaczyć więcej.'
		: emptyDescription;

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			keyboardShouldPersistTaps="handled"
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
			}
		>
			<View style={styles.form}>
				<Text style={styles.sectionLabel}>{title}</Text>
				{canCreate && onCreate ? (
					<Pressable style={styles.createButton} onPress={onCreate}>
						<Text style={styles.createButtonText}>{createLabel}</Text>
					</Pressable>
				) : null}

				<TextInput
					style={styles.search}
					value={draft}
					onChangeText={setDraft}
					placeholder={searchPlaceholder}
					placeholderTextColor={colors.placeholder}
					autoCapitalize="none"
					autoCorrect={false}
					clearButtonMode="while-editing"
				/>
				<ChipRow options={statusOptions} value={status} onChange={setStatus} />
				<ChipRow options={sortOptions} value={sort} onChange={setSort} />
				{summary ? <Text style={styles.summary}>{summary}</Text> : null}

				{error ? <Text style={styles.error}>{error}</Text> : null}

				{!error && items.length === 0 ? (
					<View style={styles.empty}>
						{icon ? (
							<View style={styles.emptyIcon}>
								<Ionicons name={icon} size={scaleSize(26)} color={colors.accent} />
							</View>
						) : null}
						<Text style={styles.emptyTitle}>{shownEmptyTitle}</Text>
						<Text style={styles.emptyDescription}>{shownEmptyDescription}</Text>
					</View>
				) : null}

				{items.map((item) => {
					const subtitle = item.subtitle_missing
						? 'Data rozgrywek: nie ustawiono'
						: item.subtitle || null;
					const statusStyle = item.status_variant
						? STATUS_STYLES[item.status_variant] ?? STATUS_STYLES.finished
						: null;
					const counts = statsLine(item);
					const showAvatar = Boolean(item.logoUrl || item.initials);

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
							{showAvatar ? (
								<PlayerAvatar
									name={item.name || item.title}
									initials={item.initials}
									avatarUrl={item.logoUrl}
									size={40}
									rounded={10}
								/>
							) : icon ? (
								<View style={styles.cardIcon}>
									<Ionicons name={icon} size={scaleSize(20)} color={colors.accent} />
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
								{item.tournamentCountLabel ? (
									<Text style={styles.cardMeta}>{item.tournamentCountLabel}</Text>
								) : null}
								{counts ? <Text style={styles.cardMeta}>{counts}</Text> : null}
							</View>
							<Ionicons name="chevron-forward" size={scaleSize(18)} color={colors.textDim} />
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
	createButton: {
		marginBottom: 12,
		backgroundColor: colors.accent,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	createButtonText: {
		color: colors.onAccent,
		fontWeight: '700',
		fontSize: 15,
	},
	sectionLabel: {
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	search: {
		marginBottom: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		color: colors.text,
		fontSize: 15,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 10,
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
	},
	chipOn: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accent,
	},
	chipText: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
	chipTextOn: {
		color: colors.accent,
	},
	summary: {
		marginBottom: 12,
		color: colors.textMuted,
		fontSize: 13,
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
	cardMeta: {
		marginTop: 3,
		fontSize: 12,
		color: colors.textSecondary,
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
