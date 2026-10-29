import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getTournamentUrl } from '../../helpers/apiConfig';
import DetailHeader from './DetailHeader';
import ScreenLoading from '../Common/ScreenLoading';
import CompetitionTabs from './CompetitionTabs';
import CompetitionTable from './CompetitionTable';
import GroupRefereeLine from './GroupRefereeLine';
import PlayoffBracket from './PlayoffBracket';
import TournamentAchievements from './TournamentAchievements';
import TabletLoginCard from '../Tournament/TabletLoginCard';
import TournamentRosterPanel from '../Tournament/TournamentRosterPanel';
import { applyTournamentJoin } from '../../helpers/tournamentManageApi';
import { colors } from '../../theme/colors';
import { buildGroupMatrix } from '../../helpers/groupMatrix';
import { useTournamentCatalogLive } from '../../hooks/useTournamentCatalogLive';
import { formatAverage, hasAverage } from '../../helpers/formatAverage';

const TAB_LABELS = {
	results: 'Wyniki',
	groups: 'Grupy',
	playoff: 'Playoff',
	achievements: 'Osiągnięcia',
};

const RESULTS_COLUMNS_BASE = [
	{ key: 'place', label: '#', width: 40, pinned: true },
	{ key: 'player', label: 'Zawodnik', width: 120, align: 'left', player: true },
	{ key: 'stageLabel', label: 'Etap', fitContent: true, align: 'left' },
];

const TournamentDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const tournamentId = route.params?.id;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [activeTab, setActiveTab] = useState('results');
	const [tabletLogin, setTabletLogin] = useState(null);
	const [joinBusy, setJoinBusy] = useState(false);

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
				setTabletLogin(result.data?.tabletLogin ?? null);
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

	const applyJoin = async () => {
		setJoinBusy(true);
		setError('');
		const result = await applyTournamentJoin(auth?.accessToken, tournamentId);
		setJoinBusy(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		void load({ soft: true });
	};

	const liveStatus = data?.tournament?.status === 'group' || data?.tournament?.status === 'playoff';
	useTournamentCatalogLive({
		tournamentId,
		enabled: liveStatus,
		accessToken: auth?.accessToken,
		setData,
		onReload: () => {
			void load({ soft: true });
		},
	});

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

	const openGroupGame = (game) => {
		if (game?.id == null) return;
		navigation.navigate('GameDetail', { type: 'group', gameId: game.id });
	};

	const openPlayoffGame = (game) => {
		if (game?.id == null) return;
		navigation.navigate('GameDetail', { type: 'playoff', gameId: game.id });
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
		cols.splice(2, 0, { key: 'average', label: 'Średnia', width: 72 });
		if (showStageInResults) {
			cols.push(RESULTS_COLUMNS_BASE[2]);
		}
		return cols;
	})();

	const resultsRows = (data?.results ?? []).map((row) => ({
		...row,
		average: hasAverage(row.average) ? formatAverage(row.average) : '—',
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

					{data?.canManage && !tournament.isStarted ? (
						<TournamentRosterPanel tournamentId={tournamentId} navigation={navigation} />
					) : null}

					{!data?.canManage && !tournament.isStarted && data?.roster ? (
						<View style={styles.rosterPublic}>
							<Text style={styles.sectionTitle}>Skład</Text>
							<Text style={styles.rosterCount}>
								{data.roster.participantCount} / min. {data.roster.minPlayers}
							</Text>
							{(data.roster.participants ?? []).length === 0 ? (
								<Text style={styles.empty}>Jeszcze nikt nie jest w składzie.</Text>
							) : (
								(data.roster.participants ?? []).map((person) => (
									<Text key={`${person.kind}-${person.name}`} style={styles.rosterName}>
										{person.name}{person.kind === 'guest' ? ' · gość' : ''}
									</Text>
								))
							)}
							{data.join?.alreadyParticipant ? (
								<Text style={styles.rosterNote}>Jesteś w składzie tego turnieju.</Text>
							) : null}
							{data.join?.alreadyPending ? (
								<Text style={styles.rosterNote}>Zgłoszenie wysłane. Czekasz na decyzję organizatora.</Text>
							) : null}
							{data.join?.canApply ? (
								<Pressable style={styles.manageButton} onPress={applyJoin} disabled={joinBusy}>
									<Text style={styles.manageButtonText}>
										{joinBusy ? 'Wysyłanie…' : 'Zgłoś się'}
									</Text>
								</Pressable>
							) : null}
						</View>
					) : null}

					{data?.canManage && tabletLogin ? (
						<TabletLoginCard
							login={tabletLogin}
							accessToken={auth?.accessToken}
							tournamentId={tournamentId}
							onCodeChange={setTabletLogin}
						/>
					) : null}

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
							{liveStatus ? <Text style={styles.liveNote}>Na żywo</Text> : null}

							{activeTab === 'results' ? (
								<CompetitionTable
									columns={resultsColumns}
									rows={resultsRows}
									emptyText="Brak wyników — pojawią się po odpadnięciu zawodników z turnieju."
									onPlayerPress={openPlayer}
									showHorizontalScroll
									freezePlayerColumn
									hugContent
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
													onGameDetailPress={openGroupGame}
													showHorizontalScroll
													freezePlayerColumn
												/>
												<GroupRefereeLine games={group.games} />
											</View>
										);
									})
								)
							) : null}

							{activeTab === 'playoff' ? (
								(data?.consolationPlayoff ?? []).length > 0 ? (
									<>
										<Text style={styles.sectionTitle}>Drabinka główna</Text>
										<PlayoffBracket
											rounds={data?.playoff ?? []}
											onPlayerPress={openPlayer}
											onGamePress={openPlayoffGame}
										/>
										<Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
											Drabinka pocieszenia
										</Text>
										<PlayoffBracket
											rounds={data.consolationPlayoff}
											onPlayerPress={openPlayer}
											onGamePress={openPlayoffGame}
										/>
									</>
								) : (
									<PlayoffBracket
										rounds={data?.playoff ?? []}
										onPlayerPress={openPlayer}
										onGamePress={openPlayoffGame}
									/>
								)
							) : null}

							{activeTab === 'achievements' ? (
								<TournamentAchievements rows={data?.achievements ?? []} />
							) : null}
						</>
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
	empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
	groupBlock: { marginBottom: 20 },
	liveNote: {
		marginTop: -4,
		marginBottom: 12,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.accent,
	},
	sectionTitle: {
		marginBottom: 10,
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	sectionTitleSpaced: {
		marginTop: 24,
	},
	manageButton: {
		marginTop: 16,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	manageButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
	rosterPublic: { marginTop: 16 },
	rosterCount: { color: colors.text, fontWeight: '700', marginBottom: 8 },
	rosterName: { color: colors.text, fontSize: 15, paddingVertical: 4 },
	rosterNote: { color: colors.textMuted, marginTop: 8 },
});

export default TournamentDetailScreen;
