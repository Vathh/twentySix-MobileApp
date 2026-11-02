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
import GroupRefereeLine from './GroupRefereeLine';
import PlayoffBracket from './PlayoffBracket';
import TournamentAchievements from './TournamentAchievements';
import TabletLoginCard from '../Tournament/TabletLoginCard';
import TournamentRosterPanel from '../Tournament/TournamentRosterPanel';
import TournamentPublicRoster from '../Tournament/TournamentPublicRoster';
import { applyTournamentJoin } from '../../helpers/tournamentManageApi';
import { useTournamentRosterLive } from '../../hooks/useTournamentRosterLive';
import { colors } from '../../theme/colors';
import ManageLinks from './ManageLinks';
import { buildGroupMatrix } from '../../helpers/groupMatrix';
import { useTournamentCatalogLive } from '../../hooks/useTournamentCatalogLive';
import { formatAverage, hasAverage } from '../../helpers/formatAverage';

function placesLabel(count) {
	const n = Number(count) || 0;
	if (n === 1) return '1 pozycja';
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return `${n} pozycje`;
	}
	return `${n} pozycji`;
}

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
	const [bracketKey, setBracketKey] = useState(null);

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

	const brackets = useMemo(
		() => (Array.isArray(data?.playoffBrackets) ? data.playoffBrackets : []),
		[data?.playoffBrackets],
	);
	useEffect(() => {
		if (brackets.length === 0) return;
		if (!brackets.some((bracket) => bracket.key === bracketKey)) {
			setBracketKey(brackets[0].key);
		}
	}, [brackets, bracketKey]);

	const liveStatus = data?.tournament?.status === 'group' || data?.tournament?.status === 'playoff';
	const plannedForPlayer = Boolean(data?.tournament && !data.tournament.isStarted && !data?.canManage);
	useTournamentRosterLive({
		tournamentId,
		enabled: plannedForPlayer,
		onReload: () => {
			void load({ soft: true });
		},
	});
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

					{data?.canManage ? (
						<ManageLinks
							actions={[
								{
									label: 'Administratorzy',
									onPress: () => navigation.navigate('PeopleManage', {
										mode: 'tournament-admins',
										id: tournamentId,
									}),
								},
								...(tournament.status === 'group' || tournament.status === 'playoff'
									? [{
										label: 'Anuluj rozgrywki',
										danger: true,
										onPress: () => navigation.navigate('ConfirmAction', {
											mode: 'cancel',
											entity: 'tournament',
											id: tournamentId,
											name: tournament.name,
										}),
									}]
									: []),
								{
									label: 'Usuń turniej',
									danger: true,
									onPress: () => navigation.navigate('ConfirmAction', {
										mode: 'delete',
										entity: 'tournament',
										id: tournamentId,
										name: tournament.name,
										seasonId: data?.season?.id ?? null,
										organizationId: data?.organization?.id ?? null,
									}),
								},
							]}
						/>
					) : null}

					{(data?.admins ?? []).length > 0 ? (
						<Text style={styles.admins}>
							Prowadzą: {data.admins.map((person) => person.name).join(', ')}
						</Text>
					) : null}

					{data?.canManage && !tournament.isStarted ? (
						<TournamentRosterPanel tournamentId={tournamentId} navigation={navigation} />
					) : null}

					{!data?.canManage && !tournament.isStarted ? (
						<TournamentPublicRoster
							roster={data?.roster}
							join={data?.join}
							busy={joinBusy}
							onApply={applyJoin}
						/>
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
										const highlight = group.playoffHighlight;
										const showAdvance = Boolean(
											highlight?.complete && highlight.advanceCount > 0,
										);
										return (
											<View key={group.groupNumber} style={styles.groupBlock}>
												<Text style={styles.sectionTitle}>
													Grupa {group.groupNumber}
												</Text>
												{showAdvance ? (
													<Text style={styles.advanceHint}>
														Awans do playoff: {placesLabel(highlight.advanceCount)}
													</Text>
												) : null}
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
								<>
									{brackets.length > 0 ? (
										<>
											<CompetitionTabs
												tabs={brackets.map((bracket) => ({
													key: bracket.key,
													label: bracket.label,
												}))}
												activeKey={bracketKey || brackets[0].key}
												onChange={setBracketKey}
											/>
											<PlayoffBracket
												rounds={
													(brackets.find((bracket) => bracket.key === (bracketKey || brackets[0].key))
														?? brackets[0]
													).rounds
												}
												onPlayerPress={openPlayer}
												onGamePress={openPlayoffGame}
											/>
										</>
									) : (data?.consolationPlayoff ?? []).length > 0 ? (
										<>
											<Text style={styles.sectionTitle}>Drabinka główna</Text>
											<PlayoffBracket
												rounds={data?.playoff ?? []}
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
									)}
									{(data?.consolationPlayoff ?? []).length > 0 ? (
										<>
											<Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
												Drabinka pocieszenia
											</Text>
											<PlayoffBracket
												rounds={data.consolationPlayoff}
												onPlayerPress={openPlayer}
												onGamePress={openPlayoffGame}
											/>
										</>
									) : null}
								</>
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
	admins: {
		marginTop: -8,
		marginBottom: 16,
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
	},
	advanceHint: {
		marginTop: -4,
		marginBottom: 8,
		color: colors.success,
		fontSize: 13,
		fontWeight: '600',
	},
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
});

export default TournamentDetailScreen;
