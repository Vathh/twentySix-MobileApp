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
import { fetchCompetitionDetail } from '../../helpers/competitionsApi';
import { getLeagueDivisionUrl } from '../../helpers/apiConfig';
import DetailHeader from './DetailHeader';
import CompetitionTable from './CompetitionTable';
import CompetitionTabs from './CompetitionTabs';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';
import { formatAverage, hasAverage } from '../../helpers/formatAverage';

function standingsColumns(allowsDraws) {
	const columns = [
		{ key: 'place', label: '#', width: 36 },
		{ key: 'player', label: 'Zawodnik', width: 140, align: 'left', player: true },
		{ key: 'played', label: 'M', width: 36 },
		{ key: 'wins', label: 'W', width: 36 },
	];
	if (allowsDraws) {
		columns.push({ key: 'draws', label: 'R', width: 36 });
	}
	columns.push({ key: 'losses', label: 'P', width: 36 });
	if (allowsDraws) {
		columns.push({ key: 'points', label: 'Pkt', width: 40 });
	}
	columns.push({ key: 'unitDiff', label: '+/−', width: 44 });
	return columns;
}

function mapStandingRows(items) {
	return (items ?? []).map((row) => ({
		...row,
		place: row.needsTiebreak ? `${row.place}*` : String(row.place),
		player: {
			text: row.playerName,
			playerId: row.userId ? row.playerId : null,
			name: row.playerName,
			subtitle: hasAverage(row.average) ? formatAverage(row.average) : null,
		},
		unitDiff: row.unitDiff > 0 ? `+${row.unitDiff}` : String(row.unitDiff),
	}));
}

function mapHighlightRows(items) {
	return (items ?? []).map((row) => ({
		...row,
		player: {
			text: row.playerName,
			playerId: row.userId ? row.playerId : null,
			name: row.playerName,
		},
		bestCheckout: row.bestCheckout ?? '—',
	}));
}

const highlightColumns = [
	{ key: 'player', label: 'Zawodnik', width: 140, align: 'left', player: true },
	{ key: 'count180', label: '180', width: 44 },
	{ key: 'count170Plus', label: '170+', width: 48 },
	{ key: 'bestCheckout', label: 'Checkout', width: 72 },
];

function formatDivisionMeta(division) {
	if (!division) {
		return [];
	}
	const sets = Number(division.setsToWinMatch) || 1;
	const legs = Number(division.legsToWinSet) || 1;
	const format =
		sets > 1
			? `${division.startingScore} · do ${legs} legów / ${sets} setów`
			: `${division.startingScore} · do ${legs} legów`;
	const meta = [{ label: 'Format', value: format }];
	if ((division.position ?? 0) > 0) {
		const parts = [`Awans: ${division.promoteDirect} bezpośredni`];
		if ((division.promotePlayoff ?? 0) > 0) {
			parts.push(`+ ${division.promotePlayoff} baraż`);
		}
		meta.push({ label: 'Awans', value: parts.join(' ') });
	}
	return meta;
}

const LeagueDivisionDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const leagueId = route.params?.leagueId;
	const divisionId = route.params?.divisionId;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [activeSeasonId, setActiveSeasonId] = useState(null);

	const load = useCallback(
		async ({ soft } = {}) => {
			if (!auth?.accessToken || !leagueId || !divisionId) {
				setError('Brak danych szczebla.');
				setLoading(false);
				return;
			}
			if (!soft) setLoading(true);

			const result = await fetchCompetitionDetail(
				getLeagueDivisionUrl(leagueId, divisionId),
				auth.accessToken,
			);
			if (result.error) {
				setError(result.error);
				if (!soft) setData(null);
			} else {
				setError('');
				setData(result.data);
				setActiveSeasonId((current) => current ?? result.data?.seasons?.[0]?.id ?? null);
			}
			setLoading(false);
			setRefreshing(false);
		},
		[auth?.accessToken, leagueId, divisionId],
	);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	if (loading) {
		return <ScreenLoading />;
	}

	const league = data?.league;
	const organization = data?.organization;
	const division = data?.division;
	const activeSeason = data?.activeSeason;
	const seasons = data?.seasons ?? [];
	const selectedSeason =
		seasons.find((season) => season.id === activeSeasonId) ?? seasons[0] ?? null;
	const seasonTabs = seasons.map((season) => ({
		key: String(season.id),
		label: season.name,
	}));
	const columns = standingsColumns(Boolean(selectedSeason?.allowsDraws));

	const openPlayer = (playerId, name) => {
		navigation.navigate('PlayerProfile', { playerId, name });
	};

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

			{division ? (
				<>
					<DetailHeader
						title={division.name}
						eyebrow={`Szczebel ligowy${league?.name ? ` · ${league.name}` : ''}`}
						breadcrumb={[
							organization
								? {
										label: organization.name,
										onPress: () =>
											navigation.navigate('OrganizationDetail', { id: organization.id }),
									}
								: null,
							league
								? {
										label: league.name,
										onPress: () => navigation.navigate('LeagueDetail', { id: league.id }),
									}
								: null,
							{ label: 'Szczebel' },
						].filter(Boolean)}
						meta={formatDivisionMeta(division)}
					/>

					{activeSeason ? (
						<Pressable
							style={styles.liveLink}
							onPress={() =>
								navigation.navigate('LeagueSeasonDetail', { id: activeSeason.id })
							}
						>
							<Text style={styles.liveLinkText}>
								Trwa sezon {activeSeason.name} — poniżej archiwum zakończonych sezonów.
							</Text>
						</Pressable>
					) : null}

					{seasons.length === 0 ? (
						<Text style={styles.empty}>
							Tabela pojawi się po zakończeniu pierwszego sezonu na tym szczeblu.
						</Text>
					) : null}

					{seasons.length > 1 ? (
						<CompetitionTabs
							tabs={seasonTabs}
							activeKey={String(selectedSeason?.id ?? '')}
							onChange={(key) => setActiveSeasonId(Number(key))}
						/>
					) : null}

					{selectedSeason ? (
						<View>
							{seasons.length <= 1 ? (
								<Text style={styles.sectionTitle}>{selectedSeason.name}</Text>
							) : null}
							{selectedSeason.champion ? (
								<Text style={styles.champion}>
									Mistrz szczebla: {selectedSeason.champion.playerName}
								</Text>
							) : null}
							<CompetitionTable
								columns={columns}
								rows={mapStandingRows(selectedSeason.standings)}
								emptyText="Brak zawodników na tym szczeblu."
								onPlayerPress={openPlayer}
							/>
							<Text style={styles.sectionTitle}>Osiągnięcia</Text>
							<CompetitionTable
								columns={highlightColumns}
								rows={mapHighlightRows(selectedSeason.highlights)}
								emptyText="Brak zapisanych 180 i checkoutów w tym sezonie."
								onPlayerPress={openPlayer}
							/>
							<Pressable
								onPress={() =>
									navigation.navigate('LeagueSeasonDetail', { id: selectedSeason.id })
								}
							>
								<Text style={styles.seasonLink}>Pełny sezon {selectedSeason.name}</Text>
							</Pressable>
						</View>
					) : null}
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
		marginTop: 16,
		marginBottom: 12,
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	champion: {
		marginBottom: 12,
		color: colors.text,
		fontSize: 14,
		fontWeight: '600',
	},
	empty: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
	seasonLink: {
		marginTop: 8,
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	liveLink: {
		alignSelf: 'flex-start',
		marginTop: -8,
		marginBottom: 16,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: colors.successMuted,
	},
	liveLinkText: { color: colors.successSoftText, fontSize: 12, fontWeight: '700' },
});

export default LeagueDivisionDetailScreen;
