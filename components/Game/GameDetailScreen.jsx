import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchGameDetail } from '../../helpers/gameDetailApi';
import { formatAverage, hasAverage } from '../../helpers/formatAverage';
import { colors } from '../../theme/colors';
import PlayerAvatar from '../Common/PlayerAvatar';
import ScreenLoading from '../Common/ScreenLoading';

function statusLabel(status) {
	if (status === 'finished') return 'Zakończony';
	if (status === 'in_progress') return 'Na żywo';
	if (status === 'scheduled') return 'Zaplanowany';
	return '';
}

function showAvg(value) {
	return hasAverage(value) ? formatAverage(value) : '-';
}

function showList(values) {
	if (!Array.isArray(values) || values.length === 0) return '-';
	return values.join(', ');
}

function showInt(value) {
	return value == null || value === '' ? '-' : String(value);
}

function formatDouble(stat) {
	if (!stat?.doubleTracked || !stat?.doubleAttempts) return '-';
	return `${stat.doubleSuccesses ?? 0}/${stat.doubleAttempts}`;
}

function initialSelection(sets) {
	for (let setIndex = 0; setIndex < sets.length; setIndex += 1) {
		const legs = sets[setIndex]?.legs ?? [];
		for (let legIndex = 0; legIndex < legs.length; legIndex += 1) {
			if (!legs[legIndex]?.finished) {
				return { setIndex, legIndex };
			}
		}
	}
	const setIndex = Math.max(0, sets.length - 1);
	const legIndex = Math.max(0, (sets[setIndex]?.legs?.length ?? 1) - 1);
	return { setIndex, legIndex };
}

const STAT_SECTIONS = [
	{
		title: 'Średnia (3 lotki)',
		rows: [
			{ label: 'Cała gra', key: 'matchAverage', kind: 'avg' },
			{ label: 'Pierwsze 9 lotek', key: 'matchFirstNineAverage', kind: 'avg' },
			{ label: 'Najlepszy leg', key: 'bestLegAverage', kind: 'avg' },
			{ label: 'Aktualny leg', key: 'currentLegAverage', kind: 'avg', liveOnly: true },
		],
	},
	{
		title: 'Osiągi',
		rows: [
			{ label: 'Najlepszy leg (lotki)', key: 'bestLegThrows', kind: 'int' },
			{ label: '60+', key: 'plus60', kind: 'int' },
			{ label: '80+', key: 'plus80', kind: 'int' },
			{ label: '100+', key: 'plus100', kind: 'int' },
			{ label: '140+', key: 'plus140', kind: 'int' },
			{ label: '180', key: 'max180', kind: 'int' },
			{ label: 'HF (finish)', key: 'hf', kind: 'list' },
			{ label: 'QF (lotki)', key: 'qf', kind: 'list' },
		],
	},
];

function cellValue(player, row) {
	if (!player) return '-';
	if (row.kind === 'avg') return showAvg(player[row.key]);
	if (row.kind === 'list') return showList(player[row.key]);
	return showInt(player[row.key]);
}

function PlayerCard({ player, wins, onPress }) {
	const body = (
		<View style={[styles.playerCard, wins && styles.playerCardWin]}>
			<PlayerAvatar
				name={player?.name}
				initials={player?.initials}
				avatarUrl={player?.avatarUrl}
				size={76}
				rounded={14}
			/>
			<Text style={[styles.playerName, wins && styles.scoreWin]} numberOfLines={3}>
				{player?.name || '—'}
			</Text>
		</View>
	);

	if (!onPress) {
		return <View style={styles.playerCardWrap}>{body}</View>;
	}

	return (
		<Pressable style={styles.playerCardWrap} onPress={onPress} accessibilityRole="link">
			{body}
		</Pressable>
	);
}

function ScoreBoard({ game, navigation }) {
	const finished = game?.status === 'finished';
	const winnerId = game?.winnerId != null ? Number(game.winnerId) : null;
	const leftWins = finished && winnerId != null && winnerId === Number(game?.player1?.id);
	const rightWins = finished && winnerId != null && winnerId === Number(game?.player2?.id);

	const openPlayer = (player) => {
		if (!player?.userId || !navigation) return;
		navigation.navigate('PlayerProfile', { playerId: player.id, name: player.name });
	};

	return (
		<View style={styles.board}>
			<PlayerCard
				player={game?.player1}
				wins={leftWins}
				onPress={game?.player1?.userId ? () => openPlayer(game.player1) : null}
			/>
			<View style={styles.boardMid}>
				<View style={styles.scoreRow}>
					<Text style={[styles.boardScore, leftWins && styles.scoreWin]}>
						{game?.player1Score ?? 0}
					</Text>
					<Text style={styles.scoreSep}>:</Text>
					<Text style={[styles.boardScore, rightWins && styles.scoreWin]}>
						{game?.player2Score ?? 0}
					</Text>
				</View>
				<Text style={styles.boardFormat}>{game?.formatLabel || 'Mecz'}</Text>
				{game?.leagueMatchdayLabel ? (
					<Text style={styles.boardNote}>{game.leagueMatchdayLabel}</Text>
				) : null}
				{game?.leagueWalkoverLabel ? (
					<Text style={styles.boardNote}>{game.leagueWalkoverLabel}</Text>
				) : null}
			</View>
			<PlayerCard
				player={game?.player2}
				wins={rightWins}
				onPress={game?.player2?.userId ? () => openPlayer(game.player2) : null}
			/>
		</View>
	);
}

function StatsTable({ game }) {
	const left = game?.players?.[0];
	const right = game?.players?.[1];
	const live = game?.status === 'in_progress';

	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Statystyki meczu</Text>
			<View style={styles.stats}>
				<View style={styles.statsHead}>
					<Text style={styles.statsNameLeft} numberOfLines={2}>
						{left?.name || game?.player1?.name || '-'}
					</Text>
					<Text style={styles.statsLabel} />
					<Text style={styles.statsNameRight} numberOfLines={2}>
						{right?.name || game?.player2?.name || '-'}
					</Text>
				</View>
				{STAT_SECTIONS.map((section) => (
					<View key={section.title}>
						<Text style={styles.statsGroup}>{section.title}</Text>
						{section.rows
							.filter((row) => !row.liveOnly || live)
							.map((row) => (
								<View key={row.key} style={styles.statsRow}>
									<Text style={styles.statsValueLeft}>{cellValue(left, row)}</Text>
									<Text style={styles.statsLabel}>{row.label}</Text>
									<Text style={styles.statsValueRight}>{cellValue(right, row)}</Text>
								</View>
							))}
					</View>
				))}
			</View>
		</View>
	);
}

function VisitTable({ leg, player1Name, player2Name }) {
	const turns = leg?.turns ?? [];
	if (turns.length > 0) {
		return (
			<View style={styles.visits}>
				{turns.map((turn, index) => (
					<View key={`${turn.playerId}-${index}`} style={styles.turnRow}>
						<Text style={styles.turnName} numberOfLines={1}>
							{turn.name}
						</Text>
						<Text style={[styles.turnThrown, turn.bust && styles.bust]}>{turn.thrown}</Text>
						<Text style={styles.turnMeta}>
							zostało {turn.remaining}
							{turn.darts ? ` · ${turn.darts} lot.` : ''}
						</Text>
					</View>
				))}
			</View>
		);
	}

	const rows = leg?.visits ?? [];
	if (rows.length === 0) {
		return <Text style={styles.muted}>Brak zapisanych wizyt.</Text>;
	}

	return (
		<View style={styles.visits}>
			<View style={styles.visitNames}>
				<Text style={styles.visitName} numberOfLines={1}>
					{player1Name}
				</Text>
				<Text style={[styles.visitName, styles.visitNameRight]} numberOfLines={1}>
					{player2Name}
				</Text>
			</View>
			<View style={styles.visitHead}>
				<Text style={styles.visitHeadCell}>Rzucone</Text>
				<Text style={styles.visitHeadCell}>Zostało</Text>
				<Text style={[styles.visitHeadCell, styles.visitDarts]}>Lotki</Text>
				<Text style={styles.visitHeadCell}>Zostało</Text>
				<Text style={styles.visitHeadCell}>Rzucone</Text>
			</View>
			{rows.map((row, index) => (
				<View key={`${row.darts}-${index}`} style={styles.visitRow}>
					<Text style={[styles.visitCell, row.leftBust && styles.bust]}>{row.leftThrown}</Text>
					<Text style={styles.visitCell}>{row.leftRemaining}</Text>
					<Text style={[styles.visitCell, styles.visitDarts]}>{row.darts}</Text>
					<Text style={styles.visitCell}>{row.rightRemaining}</Text>
					<Text style={[styles.visitCell, row.rightBust && styles.bust]}>{row.rightThrown}</Text>
				</View>
			))}
		</View>
	);
}

function LegsBrowser({ game }) {
	const sets = Array.isArray(game?.sets) ? game.sets : [];
	const [selection, setSelection] = useState(() => initialSelection(sets));

	if (sets.length === 0) {
		return (
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Legi i wizyty</Text>
				<Text style={styles.muted}>Brak rozegranych legów.</Text>
			</View>
		);
	}

	const setIndex = Math.min(selection.setIndex, sets.length - 1);
	const legs = sets[setIndex]?.legs ?? [];
	const legIndex = Math.min(selection.legIndex, Math.max(0, legs.length - 1));
	const leg = legs[legIndex];
	const showSets = sets.length > 1;

	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Legi i wizyty</Text>
			{showSets ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.chipRow}
				>
					{sets.map((set, index) => {
						const on = index === setIndex;
						return (
							<Pressable
								key={set.setNumber ?? index}
								onPress={() => setSelection({ setIndex: index, legIndex: 0 })}
								style={[styles.chip, on && styles.chipOn]}
							>
								<Text style={[styles.chipText, on && styles.chipTextOn]}>
									Set {set.setNumber ?? index + 1}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>
			) : null}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.chipRow}
			>
				{legs.map((item, index) => {
					const on = index === legIndex;
					return (
						<Pressable
							key={item.legNumber ?? index}
							onPress={() => setSelection({ setIndex, legIndex: index })}
							style={[styles.chip, on && styles.chipOn]}
						>
							<Text style={[styles.chipText, on && styles.chipTextOn]}>
								Leg {item.legInSetNumber ?? index + 1}
								{item.finished ? '' : ' ·'}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
			{leg ? (
				<View style={styles.legCard}>
					<Text style={styles.legTitle}>
						Leg {leg.legInSetNumber ?? legIndex + 1}
						{leg.finished && leg.winnerName
							? ` — ${leg.winnerName}`
							: leg.finished
								? ''
								: ' (w trakcie)'}
					</Text>
					{(leg.playerStats ?? []).map((stat) => (
						<View key={stat.playerId} style={styles.legStat}>
							<Text style={styles.legStatName} numberOfLines={1}>
								{stat.name}
							</Text>
							<Text style={styles.legStatValue}>
								śr. {showAvg(stat.legAverage)} · 9 {showAvg(stat.firstNineAverage)} · max{' '}
								{showInt(stat.highestVisit)} · double {formatDouble(stat)}
							</Text>
						</View>
					))}
					<VisitTable
						leg={leg}
						player1Name={game?.player1?.name || 'Gracz 1'}
						player2Name={game?.player2?.name || 'Gracz 2'}
					/>
				</View>
			) : null}
		</View>
	);
}

const GameDetailScreen = ({ route, navigation }) => {
	const { auth } = useAuth();
	const type = route?.params?.type;
	const gameId = route?.params?.gameId;
	const [game, setGame] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const load = useCallback(async () => {
		const result = await fetchGameDetail(type, gameId, auth?.accessToken);
		if (!result.ok) {
			setGame(null);
			setError(result.message || 'Nie udało się wczytać meczu.');
		} else {
			setGame(result.data);
			setError('');
		}
		setLoading(false);
	}, [type, gameId, auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			load();
		}, [load]),
	);

	if (loading) {
		return <ScreenLoading />;
	}

	if (error || !game) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>{error || 'Nie znaleziono meczu.'}</Text>
				<Pressable
					style={styles.retry}
					onPress={() => {
						setLoading(true);
						load();
					}}
				>
					<Text style={styles.retryText}>Spróbuj ponownie</Text>
				</Pressable>
			</View>
		);
	}

	const badge = statusLabel(game.status);
	const roster = Array.isArray(game.roster) ? game.roster : [];
	const freeForAll = roster.length > 2;

	return (
		<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
			<View style={styles.metaRow}>
				<Text style={styles.badge}>{game.label || 'Mecz'}</Text>
				{badge ? (
					<Text style={[styles.status, game.status === 'in_progress' && styles.statusLive]}>
						{badge}
					</Text>
				) : null}
			</View>
			{game.subtitle ? <Text style={styles.subtitle}>{game.subtitle}</Text> : null}
			{freeForAll ? <Text style={styles.title}>Wynik meczu</Text> : null}
			{freeForAll ? (
				<View style={styles.scoreCard}>
					<Text style={styles.format}>{game.formatLabel || 'Mecz'}</Text>
					{roster.map((player) => (
						<View key={player.id} style={styles.rosterRow}>
							<Text style={styles.rosterPlace}>{player.place}.</Text>
							<Text style={styles.rosterName} numberOfLines={1}>
								{player.name}
							</Text>
							<Text style={[styles.rosterScore, player.place === 1 && styles.scoreWin]}>
								{player.score}
							</Text>
						</View>
					))}
				</View>
			) : (
				<ScoreBoard game={game} navigation={navigation} />
			)}
			{freeForAll ? null : <StatsTable game={game} />}
			<LegsBrowser key={`${game.kind}-${game.gameId}-${game.sets?.length ?? 0}`} game={game} />
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 40,
	},
	centered: {
		flex: 1,
		backgroundColor: colors.bg,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	error: {
		color: colors.dangerText,
		textAlign: 'center',
		marginBottom: 16,
	},
	retry: {
		backgroundColor: colors.accentMuted,
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	retryText: {
		color: colors.accent,
		fontWeight: '600',
	},
	metaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	badge: {
		overflow: 'hidden',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: colors.accentMuted,
		color: colors.accent,
		fontSize: 12,
		fontWeight: '700',
	},
	status: {
		color: colors.successBright,
		fontSize: 12,
		fontWeight: '600',
	},
	statusLive: {
		color: colors.accent,
	},
	subtitle: {
		color: colors.textMuted,
		fontSize: 13,
		marginBottom: 6,
	},
	title: {
		color: colors.text,
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 16,
	},
	board: {
		flexDirection: 'row',
		alignItems: 'stretch',
		gap: 8,
		marginBottom: 22,
	},
	playerCardWrap: {
		flex: 1,
		minWidth: 0,
	},
	playerCard: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		paddingVertical: 14,
		paddingHorizontal: 6,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	playerCardWin: {
		borderColor: colors.accentBorder,
		borderTopWidth: 3,
		borderTopColor: colors.accent,
	},
	playerName: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
		textAlign: 'center',
	},
	boardMid: {
		width: 96,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		paddingHorizontal: 2,
	},
	boardScore: {
		color: colors.text,
		fontSize: 30,
		fontWeight: '800',
	},
	boardFormat: {
		color: colors.textMuted,
		fontSize: 11,
		textAlign: 'center',
	},
	boardNote: {
		color: colors.textMuted,
		fontSize: 11,
		textAlign: 'center',
	},
	scoreCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 18,
		paddingHorizontal: 16,
		alignItems: 'center',
		marginBottom: 22,
	},
	format: {
		color: colors.textMuted,
		fontSize: 13,
		marginBottom: 4,
	},
	scoreRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	scoreWin: {
		color: colors.accent,
	},
	scoreSep: {
		color: colors.textMuted,
		fontSize: 28,
		fontWeight: '500',
		marginHorizontal: 10,
	},
	section: {
		marginBottom: 22,
	},
	sectionTitle: {
		color: colors.accent,
		fontSize: 17,
		fontWeight: '700',
		marginBottom: 10,
	},
	stats: {
		backgroundColor: colors.bgElevated,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	statsHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 10,
		paddingHorizontal: 10,
		backgroundColor: colors.bgDeep,
	},
	statsGroup: {
		paddingVertical: 8,
		paddingHorizontal: 10,
		color: colors.accent,
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		textAlign: 'center',
		backgroundColor: colors.accentMuted,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	statsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	statsNameLeft: {
		flex: 1,
		color: colors.accent,
		fontSize: 12,
		fontWeight: '700',
		textAlign: 'right',
	},
	statsNameRight: {
		flex: 1,
		color: colors.accent,
		fontSize: 12,
		fontWeight: '700',
		textAlign: 'left',
	},
	statsLabel: {
		width: 108,
		color: colors.textMuted,
		fontSize: 12,
		textAlign: 'center',
	},
	statsValueLeft: {
		flex: 1,
		color: colors.textSecondary,
		fontSize: 14,
		fontWeight: '700',
		textAlign: 'right',
	},
	statsValueRight: {
		flex: 1,
		color: colors.textSecondary,
		fontSize: 14,
		fontWeight: '700',
		textAlign: 'left',
	},
	muted: {
		color: colors.textMuted,
		fontSize: 14,
	},
	chipRow: {
		flexDirection: 'row',
		gap: 8,
		paddingBottom: 10,
	},
	chip: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	chipOn: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	chipText: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
	chipTextOn: {
		color: colors.accent,
	},
	legCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 12,
	},
	legTitle: {
		color: colors.accent,
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 8,
	},
	legStat: {
		marginBottom: 8,
	},
	legStatName: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '600',
	},
	legStatValue: {
		color: colors.textMuted,
		fontSize: 12,
		marginTop: 2,
	},
	visits: {
		marginTop: 8,
	},
	visitNames: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	visitName: {
		flex: 1,
		color: colors.textSecondary,
		fontSize: 12,
		fontWeight: '700',
	},
	visitNameRight: {
		textAlign: 'right',
	},
	visitHead: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: colors.borderStrong,
		paddingBottom: 4,
	},
	visitHeadCell: {
		flex: 1,
		color: colors.textDim,
		fontSize: 10,
		fontWeight: '700',
		textAlign: 'center',
	},
	visitRow: {
		flexDirection: 'row',
		paddingVertical: 5,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	visitCell: {
		flex: 1,
		color: colors.textSecondary,
		fontSize: 12,
		fontWeight: '600',
		textAlign: 'center',
	},
	visitDarts: {
		color: colors.textDim,
	},
	bust: {
		color: colors.dangerAlt,
	},
	rosterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'stretch',
		paddingVertical: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	rosterPlace: {
		width: 28,
		color: colors.textDim,
		fontSize: 15,
		fontWeight: '700',
	},
	rosterName: {
		flex: 1,
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	rosterScore: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '700',
		minWidth: 28,
		textAlign: 'right',
	},
	turnRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		gap: 8,
	},
	turnName: {
		flex: 1.2,
		color: colors.text,
		fontSize: 13,
		fontWeight: '600',
	},
	turnThrown: {
		width: 48,
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '700',
	},
	turnMeta: {
		flex: 1,
		textAlign: 'right',
		color: colors.textMuted,
		fontSize: 12,
	},
});

export default GameDetailScreen;
