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
import useAuth from '../../hooks/useAuth';
import {
	fetchCompetitionDetail,
	fetchSeasonStandingsPage,
} from '../../helpers/competitionsApi';
import { getSeasonUrl } from '../../helpers/apiConfig';
import DetailHeader, { STATUS_STYLES } from './DetailHeader';
import CompetitionTable from './CompetitionTable';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const STANDINGS_COLUMNS = [
	{ key: 'place', label: '#', width: 36 },
	{ key: 'player', label: 'Zawodnik', width: 140, align: 'left', player: true },
	{ key: 'points', label: 'Pkt', width: 44 },
	{ key: 'countMax', label: '180', width: 40 },
	{ key: 'count170Plus', label: '170+', width: 44 },
	{ key: 'countQf', label: 'QF', width: 36 },
	{ key: 'countHf', label: 'HF', width: 36 },
	{ key: 'bestQf', label: 'Best QF', width: 64 },
	{ key: 'bestHf', label: 'Best HF', width: 64 },
];

function mapStandingRows(items) {
	return (items ?? []).map((row) => ({
		...row,
		player: {
			text: row.playerName,
			playerId: row.userId ? row.playerId : null,
			name: row.playerName,
		},
		bestQf: row.bestQf != null ? `${row.bestQf} lotek` : '—',
		bestHf: row.bestHf ?? '—',
	}));
}

const SeasonDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const seasonId = route.params?.id;
	const [data, setData] = useState(null);
	const [standings, setStandings] = useState([]);
	const [standingsPage, setStandingsPage] = useState(1);
	const [standingsHasMore, setStandingsHasMore] = useState(false);
	const [loadingMoreStandings, setLoadingMoreStandings] = useState(false);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(
		async ({ soft } = {}) => {
			if (!auth?.accessToken || !seasonId) {
				setError('Brak danych sezonu.');
				setLoading(false);
				return;
			}
			if (!soft) setLoading(true);

			const result = await fetchCompetitionDetail(getSeasonUrl(seasonId), auth.accessToken);
			if (result.error) {
				setError(result.error);
				if (!soft) {
					setData(null);
					setStandings([]);
					setStandingsHasMore(false);
					setStandingsPage(1);
				}
			} else {
				setError('');
				setData(result.data);
				setStandings(result.data?.standings ?? []);
				setStandingsHasMore(Boolean(result.data?.standingsHasMore));
				setStandingsPage(1);
			}
			setLoading(false);
			setRefreshing(false);
		},
		[auth?.accessToken, seasonId],
	);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	const onLoadMoreStandings = async () => {
		if (!auth?.accessToken || !seasonId || loadingMoreStandings || !standingsHasMore) {
			return;
		}
		setLoadingMoreStandings(true);
		const nextPage = standingsPage + 1;
		const result = await fetchSeasonStandingsPage(seasonId, auth.accessToken, nextPage);
		if (!result.error) {
			setStandings((prev) => [...prev, ...result.items]);
			setStandingsHasMore(result.hasMore);
			setStandingsPage(nextPage);
		}
		setLoadingMoreStandings(false);
	};

	const openPlayer = (playerId, name) => {
		navigation.navigate('PlayerProfile', { playerId, name });
	};

	if (loading) {
		return <ScreenLoading />;
	}

	const season = data?.season;
	const organization = data?.organization;
	const standingsRows = mapStandingRows(standings);

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={() => {
						setRefreshing(true);
						void load({ soft: true });
					}}
					colors={[colors.accent]}
				/>
			}
		>
			{error ? <Text style={styles.error}>{error}</Text> : null}

			{season ? (
				<>
					<DetailHeader
						title={season.name}
						breadcrumb={
							organization
								? [
										{
											label: organization.name,
											onPress: () =>
												navigation.navigate('OrganizationDetail', { id: organization.id }),
										},
										{ label: 'Sezon' },
									]
								: []
						}
						meta={[
							{ label: 'Start', value: season.startDate || '—' },
							{ label: 'Koniec', value: season.endDate || '—' },
							{ label: 'Aktualizacja', value: season.updatedAt || '—' },
						]}
					/>

					<Text style={styles.sectionTitle}>Tabela sezonu</Text>
					<CompetitionTable
						columns={STANDINGS_COLUMNS}
						rows={standingsRows}
						emptyText="Brak wyników w sezonie — pojawią się po zakończeniu turniejów."
						onPlayerPress={openPlayer}
					/>
					{standingsHasMore ? (
						<Pressable
							style={[styles.loadMore, loadingMoreStandings && styles.loadMoreDisabled]}
							onPress={onLoadMoreStandings}
							disabled={loadingMoreStandings}
						>
							<Text style={styles.loadMoreText}>
								{loadingMoreStandings ? 'Ładowanie…' : 'Załaduj więcej'}
							</Text>
						</Pressable>
					) : null}

					<Text style={styles.sectionTitle}>Turnieje</Text>
					{data?.canManage ? (
						<Pressable
							style={styles.manageButton}
							onPress={() => navigation.navigate('CreateTournament', { seasonId })}
						>
							<Text style={styles.manageButtonText}>Nowy turniej</Text>
						</Pressable>
					) : null}
					{(data?.tournaments ?? []).length === 0 ? (
						<Text style={styles.empty}>Brak turniejów.</Text>
					) : (
						(data?.tournaments ?? []).map((tournament) => {
							const statusStyle =
								STATUS_STYLES[tournament.statusVariant] ?? STATUS_STYLES.finished;
							return (
								<Pressable
									key={tournament.id}
									style={styles.linkCard}
									onPress={() =>
										navigation.navigate('TournamentDetail', { id: tournament.id })
									}
								>
									<View style={styles.cardHeader}>
										<Text style={styles.linkCardText}>{tournament.name}</Text>
										{tournament.statusLabel ? (
											<View
												style={[styles.badge, { backgroundColor: statusStyle.bg }]}
											>
												<Text style={[styles.badgeText, { color: statusStyle.text }]}>
													{tournament.statusLabel}
												</Text>
											</View>
										) : null}
									</View>
									{tournament.date ? (
										<Text style={styles.cardSub}>Data: {tournament.date}</Text>
									) : (
										<Text style={styles.cardSub}>Data rozgrywek: nie ustawiono</Text>
									)}
								</Pressable>
							);
						})
					)}
				</>
			) : null}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, paddingBottom: 40 },
	centered: {
		flex: 1,
		backgroundColor: colors.bg,
		justifyContent: 'center',
		alignItems: 'center',
	},
	error: { color: colors.dangerText, marginBottom: 16, fontSize: 14 },
	sectionTitle: {
		marginTop: 8,
		marginBottom: 12,
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	empty: { color: colors.textMuted, fontSize: 14 },
	loadMore: {
		marginTop: 4,
		marginBottom: 8,
		alignItems: 'center',
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
	},
	loadMoreDisabled: { opacity: 0.6 },
	loadMoreText: { color: colors.text, fontSize: 15, fontWeight: '600' },
	linkCard: {
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 10,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 10,
	},
	linkCardText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
	cardSub: { marginTop: 6, color: colors.textMuted, fontSize: 13 },
	badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
	badgeText: { fontSize: 11, fontWeight: '600' },
	manageButton: {
		marginBottom: 12,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	manageButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
});

export default SeasonDetailScreen;
