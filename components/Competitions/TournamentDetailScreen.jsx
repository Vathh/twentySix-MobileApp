import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchCompetitionDetail } from '../../helpers/competitionsApi';
import { getTournamentUrl } from '../../helpers/apiConfig';
import DetailHeader from './DetailHeader';
import ScreenLoading from '../Common/ScreenLoading';
import CompetitionTabs from './CompetitionTabs';
import CompetitionTable from './CompetitionTable';
import PlayoffBracket from './PlayoffBracket';
import { colors } from '../../theme/colors';

const TAB_LABELS = {
	results: 'Wyniki',
	groups: 'Grupy',
	playoff: 'Playoff',
	achievements: 'Osiągnięcia',
};

const RESULTS_COLUMNS_BASE = [
	{ key: 'place', label: '#', width: 40 },
	{ key: 'player', label: 'Zawodnik', width: 150, align: 'left', player: true },
	{ key: 'stageLabel', label: 'Etap', width: 120, align: 'left' },
];

const TournamentDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const tournamentId = route.params?.id;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [activeTab, setActiveTab] = useState('results');

	const load = useCallback(
		async ({ soft } = {}) => {
			if (!auth?.accessToken || !tournamentId) {
				setError('Brak danych turnieju.');
				setLoading(false);
				return;
			}
			if (!soft) setLoading(true);

			const result = await fetchCompetitionDetail(
				getTournamentUrl(tournamentId),
				auth.accessToken,
			);
			if (result.error) {
				setError(result.error);
				if (!soft) setData(null);
			} else {
				setError('');
				setData(result.data);
			}
			setLoading(false);
			setRefreshing(false);
		},
		[auth?.accessToken, tournamentId],
	);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	const tabs = useMemo(
		() =>
			(data?.availableTabs ?? []).map((key) => ({
				key,
				label: TAB_LABELS[key] ?? key,
			})),
		[data?.availableTabs],
	);

	useEffect(() => {
		if (tabs.length === 0) return;
		if (!tabs.some((t) => t.key === activeTab)) {
			setActiveTab(tabs[0].key);
		}
	}, [tabs, activeTab]);

	const openPlayer = (playerId, name) => {
		navigation.navigate('PlayerProfile', { playerId, name });
	};

	if (loading) {
		return <ScreenLoading />;
	}

	const tournament = data?.tournament;
	const breadcrumb = [];
	if (data?.organization) {
		breadcrumb.push({
			label: data.organization.name,
			onPress: () => navigation.navigate('OrganizationDetail', { id: data.organization.id }),
		});
	}
	if (data?.season) {
		breadcrumb.push({
			label: data.season.name,
			onPress: () => navigation.navigate('SeasonDetail', { id: data.season.id }),
		});
	}
	if (breadcrumb.length > 0) {
		breadcrumb.push({ label: 'Turniej' });
	}

	const showStageInResults = tournament?.showStageInResults !== false;
	const resultsColumns = (() => {
		const cols = [
			RESULTS_COLUMNS_BASE[0],
			RESULTS_COLUMNS_BASE[1],
		];
		if (tournament?.tracksSeasonPoints) {
			cols.push({ key: 'points', label: 'Pkt', width: 48 });
		}
		if (showStageInResults) {
			cols.push(RESULTS_COLUMNS_BASE[2]);
		}
		return cols;
	})();

	const resultsRows = (data?.results ?? []).map((row) => ({
		...row,
		player: {
			text: row.playerName,
			playerId: row.userId ? row.playerId : null,
			name: row.playerName,
		},
	}));

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

			{tournament ? (
				<>
					<DetailHeader
						title={tournament.name}
						statusLabel={tournament.statusLabel}
						statusVariant={tournament.statusVariant}
						eyebrow={data?.season ? null : 'Turniej jednorazowy'}
						breadcrumb={breadcrumb}
						meta={[{ label: 'Data rozgrywek', value: tournament.date || '—' }]}
					/>

					{tabs.length === 0 ? (
						<Text style={styles.empty}>
							Turniej jeszcze się nie rozpoczął. Wyniki i tabele pojawią się po starcie.
						</Text>
					) : (
						<>
							<CompetitionTabs
								tabs={tabs}
								activeKey={activeTab}
								onChange={setActiveTab}
							/>

							{activeTab === 'results' ? (
								<CompetitionTable
									columns={resultsColumns}
									rows={resultsRows}
									emptyText="Brak wyników — pojawią się po odpadnięciu zawodników z turnieju."
									onPlayerPress={openPlayer}
								/>
							) : null}

							{activeTab === 'groups' ? (
								(data?.groups ?? []).length === 0 ? (
									<Text style={styles.empty}>Brak grup.</Text>
								) : (
									(data?.groups ?? []).map((group) => {
										const matrix = buildGroupMatrix(group);
										return (
											<View key={group.groupNumber} style={styles.groupBlock}>
												<Text style={styles.sectionTitle}>
													Grupa {group.groupNumber}
												</Text>
												<CompetitionTable
													columns={matrix.columns}
													rows={matrix.rows}
													emptyText="Brak tabeli."
													onPlayerPress={openPlayer}
													showHorizontalScroll
												/>
											</View>
										);
									})
								)
							) : null}

							{activeTab === 'playoff' ? (
								<PlayoffBracket
									rounds={data?.playoff ?? []}
									onPlayerPress={openPlayer}
								/>
							) : null}

							{activeTab === 'achievements' ? (
								(data?.achievements ?? []).length === 0 ? (
									<Text style={styles.empty}>Brak osiągnięć.</Text>
								) : (
									(data?.achievements ?? []).map((row) => (
										<View key={row.playerId ?? row.playerName} style={styles.achCard}>
											<Text style={styles.achName}>{row.playerName}</Text>
											<Text style={styles.achLine}>
												180: {row.max} · 170+: {row.oneSeventy}
											</Text>
											{row.qf?.length ? (
												<Text style={styles.achLine}>
													QF: {row.qf.join(', ')} lotek
												</Text>
											) : null}
											{row.hf?.length ? (
												<Text style={styles.achLine}>HF: {row.hf.join(', ')}</Text>
											) : null}
										</View>
									))
								)
							) : null}
						</>
					)}
				</>
			) : null}
		</ScrollView>
	);
};

function shortPlayerLabel(name) {
	const text = String(name ?? '').trim();
	if (text.length <= 10) return text || '—';
	return `${text.slice(0, 9)}…`;
}

function matrixScoreForRow(game, rowPlayerId) {
	if (!game) return '—';
	if (game.status === 'scheduled') return '—';
	const s1 = game.score1 ?? 0;
	const s2 = game.score2 ?? 0;
	if (Number(game.player1?.id) === Number(rowPlayerId)) {
		return `${s1} - ${s2}`;
	}
	return `${s2} - ${s1}`;
}

function buildGroupMatrix(group) {
	const standings = group.standings ?? [];
	const games = group.games ?? [];
	const byPair = new Map();
	games.forEach((game) => {
		const a = game.player1?.id;
		const b = game.player2?.id;
		if (a == null || b == null) return;
		byPair.set(`${a}-${b}`, game);
		byPair.set(`${b}-${a}`, game);
	});

	const columns = [
		{ key: 'player', label: 'Zawodnik', width: 120, align: 'left', player: true },
		...standings.map((row) => ({
			key: `vs_${row.playerId}`,
			label: shortPlayerLabel(row.playerName),
			width: 64,
		})),
		{ key: 'gamesWon', label: 'W', width: 36 },
		{ key: 'gamesLost', label: 'L', width: 36 },
		{ key: 'matchUnitsDifference', label: 'Wynik', width: 52 },
		{ key: 'points', label: 'Pkt', width: 40 },
		{ key: 'place', label: 'Pozycja', width: 58 },
	];

	const rows = standings.map((row) => {
		const next = {
			key: `p-${row.playerId}`,
			player: {
				text: row.playerName,
				playerId: row.userId ? row.playerId : null,
				name: row.playerName,
			},
			gamesWon: row.gamesWon,
			gamesLost: row.gamesLost,
			matchUnitsDifference: row.matchUnitsDifference,
			points: row.points,
			place: row.place,
		};
		standings.forEach((col) => {
			if (row.playerId === col.playerId) {
				next[`vs_${col.playerId}`] = 'X';
				return;
			}
			next[`vs_${col.playerId}`] = matrixScoreForRow(
				byPair.get(`${row.playerId}-${col.playerId}`),
				row.playerId,
			);
		});
		return next;
	});

	return { columns, rows };
}

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
	empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
	groupBlock: { marginBottom: 20 },
	sectionTitle: {
		marginBottom: 10,
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	achCard: {
		padding: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 10,
	},
	achName: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
	achLine: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});

export default TournamentDetailScreen;
