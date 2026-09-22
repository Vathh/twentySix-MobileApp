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
import { getLeagueSeasonUrl } from '../../helpers/apiConfig';
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

function gameScoreText(game) {
	if (game.status === 'finished') {
		return `${game.player1Score} : ${game.player2Score}`;
	}
	if (game.status === 'voided') {
		return 'anulowany';
	}
	return 'vs';
}

function calendarHint(season) {
	if (season.calendarMode !== 'matchdays') {
		return null;
	}
	if (season.matchdayPlanning === 'fixed_length' && season.matchdayLengthLabel) {
		return `kolejka: ${season.matchdayLengthLabel}`;
	}
	if (season.matchdayPlanning === 'equal_span') {
		return 'kolejki z równego podziału sezonu';
	}
	return null;
}

const PlayerName = ({ player, onPress }) => {
	const canOpen = Boolean(player?.userId && player?.id && onPress);
	if (!canOpen) {
		return <Text style={styles.gameName}>{player?.name ?? '—'}</Text>;
	}
	return (
		<Pressable onPress={() => onPress(player.id, player.name)}>
			<Text style={styles.gameNameLink}>{player.name}</Text>
		</Pressable>
	);
};

const GameSide = ({ player, average, onPress, align }) => (
	<View style={[styles.gameSide, align === 'right' && styles.gameSideRight]}>
		<PlayerName player={player} onPress={onPress} />
		{hasAverage(average) ? (
			<Text style={[styles.gameAverage, align === 'right' && styles.gameAverageRight]}>
				{formatAverage(average)}
			</Text>
		) : null}
	</View>
);

const GameRow = ({ game, onPlayerPress }) => (
	<View style={styles.gameRow}>
		<GameSide player={game.player1} average={game.player1Average} onPress={onPlayerPress} align="right" />
		<Text style={styles.gameScore}>{gameScoreText(game)}</Text>
		<GameSide player={game.player2} average={game.player2Average} onPress={onPlayerPress} />
		{game.isThirdPlace ? <Text style={styles.gameHint}>· o 3. miejsce</Text> : null}
	</View>
);

const RoundBlock = ({ round, onPlayerPress }) => {
	const [open, setOpen] = useState(round.isCurrent === true);

	return (
		<View style={styles.roundWrap}>
			<Pressable style={styles.roundHeader} onPress={() => setOpen((prev) => !prev)}>
				<Text style={styles.roundTitle}>
					Kolejka {round.roundNumber} · {round.windowLabel}
					{round.isCurrent ? <Text style={styles.roundNow}> · teraz</Text> : null}
				</Text>
				<Text style={styles.roundChevron}>{open ? '▴' : '▾'}</Text>
			</Pressable>
			{open
				? (round.games ?? []).map((game) => (
						<GameRow key={game.id} game={game} onPlayerPress={onPlayerPress} />
					))
				: null}
		</View>
	);
};

const GamesListBlock = ({ games, onPlayerPress }) => {
	const [open, setOpen] = useState(false);
	if (!games?.length) {
		return null;
	}

	return (
		<View style={styles.roundWrap}>
			<Pressable style={styles.roundHeader} onPress={() => setOpen((prev) => !prev)}>
				<Text style={styles.roundTitle}>Lista meczów</Text>
				<Text style={styles.roundChevron}>{open ? '▴' : '▾'}</Text>
			</Pressable>
			{open
				? games.map((game) => (
						<GameRow key={game.id} game={game} onPlayerPress={onPlayerPress} />
					))
				: null}
		</View>
	);
};

const LeagueSeasonDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const seasonId = route.params?.id;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [activeDivisionId, setActiveDivisionId] = useState(null);

	const load = useCallback(
		async ({ soft } = {}) => {
			if (!auth?.accessToken || !seasonId) {
				setError('Brak danych sezonu ligowego.');
				setLoading(false);
				return;
			}
			if (!soft) setLoading(true);

			const result = await fetchCompetitionDetail(getLeagueSeasonUrl(seasonId), auth.accessToken);
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
		[auth?.accessToken, seasonId],
	);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	if (loading) {
		return <ScreenLoading />;
	}

	const season = data?.season;
	const league = data?.league;
	const organization = data?.organization;
	const hint = season ? calendarHint(season) : null;
	const columns = standingsColumns(Boolean(season?.allowsDraws));
	const divisions = data?.divisions ?? [];
	const selectedDivision =
		divisions.find((division) => division.id === activeDivisionId) ?? divisions[0] ?? null;
	const divisionTabs = divisions.map((division) => ({
		key: String(division.id),
		label: division.name,
	}));

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

			{season ? (
				<>
					<DetailHeader
						title={season.name}
						eyebrow={`Sezon ligowy · ${season.statusLabel}`}
						statusLabel={season.statusLabel}
						statusVariant={season.statusVariant}
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
							{ label: 'Sezon' },
						].filter(Boolean)}
						meta={[
							{ label: 'Kalendarz', value: season.calendarModeLabel },
							...(hint ? [{ label: 'Kolejki', value: hint }] : []),
							{ label: 'Każdy z każdym', value: `× ${season.roundsEach}` },
							{ label: 'Format', value: season.formatLabel },
							{
								label: 'Termin',
								value:
									season.startDate && season.endDate
										? `${season.startDate} – ${season.endDate}`
										: '—',
							},
						]}
					/>

					{divisions.length > 1 ? (
						<CompetitionTabs
							tabs={divisionTabs}
							activeKey={String(selectedDivision?.id ?? '')}
							onChange={(key) => setActiveDivisionId(Number(key))}
						/>
					) : null}

					{selectedDivision ? (
						<View key={selectedDivision.id} style={styles.division}>
							{divisions.length <= 1 ? (
								<Text style={styles.sectionTitle}>{selectedDivision.name}</Text>
							) : null}
							<CompetitionTable
								columns={columns}
								rows={mapStandingRows(selectedDivision.standings)}
								emptyText="Brak zawodników na tym szczeblu."
								onPlayerPress={openPlayer}
							/>
							{(selectedDivision.rounds ?? []).map((round) => (
								<RoundBlock key={round.id} round={round} onPlayerPress={openPlayer} />
							))}
							<GamesListBlock games={selectedDivision.games} onPlayerPress={openPlayer} />
						</View>
					) : null}

					{(data?.tiebreakGames ?? []).length > 0 ? (
						<>
							<Text style={styles.sectionTitle}>Dogrywki</Text>
							{(data?.tiebreakGames ?? []).map((game) => (
								<GameRow key={game.id} game={game} onPlayerPress={openPlayer} />
							))}
						</>
					) : null}

					{(data?.playoffGames ?? []).length > 0 ? (
						<>
							<Text style={styles.sectionTitle}>Baraże</Text>
							{(data?.playoffGames ?? []).map((game) => (
								<GameRow key={game.id} game={game} onPlayerPress={openPlayer} />
							))}
						</>
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
	division: { marginBottom: 8 },
	roundWrap: { marginTop: 10 },
	roundHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	roundTitle: { flex: 1, color: colors.textMuted, fontSize: 13 },
	roundNow: { color: colors.accent, fontSize: 13, fontWeight: '700' },
	roundChevron: { color: colors.textMuted, fontSize: 12, marginLeft: 8 },
	gameRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
	},
	gameName: { color: colors.text, fontSize: 14, fontWeight: '600' },
	gameNameLink: { color: colors.accent, fontSize: 14, fontWeight: '600' },
	gameScore: { color: colors.textSecondary, fontSize: 14, fontVariant: ['tabular-nums'] },
	gameSide: { maxWidth: '42%' },
	gameSideRight: { alignItems: 'flex-end' },
	gameAverage: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 11,
		fontVariant: ['tabular-nums'],
	},
	gameAverageRight: { textAlign: 'right' },
	gameHint: { color: colors.textMuted, fontSize: 12 },
});

export default LeagueSeasonDetailScreen;
