import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	FORM_HIGHLIGHTS,
	formatFormValue,
	formatWinRate,
} from '../../helpers/profileMetrics';
import { GAME_TONES, cardToneStyle } from '../../helpers/profileTones';
import { colors } from '../../theme/colors';

function Scope({ label }) {
	return (
		<View style={styles.scope}>
			<Text style={styles.scopeText}>{label}</Text>
		</View>
	);
}

function Honor({ label, count, tone }) {
	return (
		<View style={styles.honor}>
			<Text style={[styles.honorCount, tone === 'gold' && styles.honorGold]}>
				{count ?? 0}
			</Text>
			<Text style={styles.honorLabel}>{label}</Text>
		</View>
	);
}

function SourceCard({ icon, title, played, wins, extra, toneKey }) {
	const p = Number(played) || 0;
	const w = Number(wins) || 0;
	const tone = GAME_TONES[toneKey] ?? GAME_TONES.tournament;
	return (
		<View style={[styles.sourceCard, cardToneStyle(tone.color)]}>
			<View style={styles.sourceHead}>
				<View style={[styles.sourceIcon, { backgroundColor: tone.muted }]}>
					<Ionicons name={icon} size={16} color={tone.color} />
				</View>
				<Text style={styles.sourceTitle}>{title}</Text>
			</View>
			<View style={styles.sourceStats}>
				<Text style={styles.sourcePlayed}>{p}</Text>
				<Text style={styles.sourcePlayedLabel}>mecze</Text>
				<Text style={styles.sourceWl}>
					{w}W · {Math.max(0, p - w)}L
				</Text>
				<Text style={[styles.sourceRate, { color: tone.color }]}>{formatWinRate(p, w)}</Text>
			</View>
			{extra}
		</View>
	);
}

function FormCard({ title, icon, stats, toneKey }) {
	const tone = GAME_TONES[toneKey] ?? GAME_TONES.tournament;
	return (
		<View style={[styles.formCard, cardToneStyle(tone.color)]}>
			<View style={styles.formHead}>
				<View style={[styles.sourceIcon, { backgroundColor: tone.muted }]}>
					<Ionicons name={icon} size={16} color={tone.color} />
				</View>
				<Text style={styles.sourceTitle}>{title}</Text>
				<Scope label="3 mies." />
			</View>
			<Text style={styles.bigRate}>{formatFormValue(stats, 'avg_three_darts')}</Text>
			<Text style={styles.bigLabel}>średnia 3 lotki</Text>
			<Text style={styles.formGames}>
				<Text style={styles.formGamesStrong}>{formatFormValue(stats, 'games')}</Text>
				{' '}meczów
			</Text>
			<View style={styles.highlightGrid}>
				{FORM_HIGHLIGHTS.map((row) => (
					<View key={row.key} style={styles.highlight}>
						<Text style={styles.highlightLabel}>{row.label}</Text>
						<Text style={styles.highlightValue}>{formatFormValue(stats, row.key)}</Text>
					</View>
				))}
			</View>
		</View>
	);
}

const ProfileStatsOverview = ({ overview, overviewSplit, onRivalPress }) => {
	const record = overview?.record ?? {};
	const overall = record.overall ?? {};
	const activity = overview?.activity ?? {};
	const social = overview?.social ?? {};
	const overallPlayed = Number(overall.played) || 0;
	const overallWins = Number(overall.wins) || 0;
	const overallLosses = Math.max(0, overallPlayed - overallWins);
	const winRatePct = overallPlayed > 0 ? Math.round((1000 * overallWins) / overallPlayed) / 10 : 0;
	const recentDays = activity.recentDays ?? [];
	const rivals = social.rivals ?? [];

	return (
		<View style={styles.wrap}>
			<Text style={styles.sectionTitle}>Forma</Text>

			<View style={[styles.card, cardToneStyle(colors.accent)]}>
				<View style={styles.cardHead}>
					<Text style={styles.kicker}>Wyniki</Text>
					<Scope label="30 dni" />
				</View>
				<Text style={styles.bigRate}>{overall.winRate || '–'}</Text>
				<Text style={styles.bigLabel}>Win rate</Text>
				<Text style={styles.counts}>
					<Text style={styles.countStrong}>{overallWins}</Text> wygranych
					{' · '}
					<Text style={styles.countStrong}>{overallLosses}</Text> porażek
					{' · '}
					<Text style={styles.countStrong}>{overallPlayed}</Text> rozegranych
				</Text>
				<View style={styles.barTrack}>
					<View style={[styles.barFill, { width: `${Math.min(100, winRatePct)}%` }]} />
				</View>
			</View>

			<View style={[styles.card, cardToneStyle(colors.info)]}>
				<View style={styles.cardHead}>
					<Text style={styles.kicker}>Obecność</Text>
					<Scope label="30 dni" />
				</View>
				<Text style={styles.bigRate}>{activity.gamesLast30 ?? 0}</Text>
				<Text style={styles.bigLabel}>mecze</Text>
				<View style={styles.metaPair}>
					<View style={styles.metaItem}>
						<Text style={styles.metaDt}>Ostatnia aktywność</Text>
						<Text style={styles.metaDd}>{activity.lastActivityOn || '–'}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaDt}>Aktualna seria</Text>
						<Text style={styles.metaDd}>{activity.currentStreak ?? 0}</Text>
					</View>
				</View>
			</View>

			<FormCard
				title="Turnieje i liga"
				icon="trophy-outline"
				stats={overviewSplit?.tournament}
				toneKey="tournament"
			/>
			<FormCard
				title="Szybkie"
				icon="flash-outline"
				stats={overviewSplit?.quick}
				toneKey="quick"
			/>

			<View style={styles.sectionHead}>
				<Text style={styles.sectionTitle}>Bilans</Text>
				<Scope label="Całość" />
			</View>
			<SourceCard
				icon="trophy-outline"
				title="Turnieje"
				toneKey="tournament"
				played={record.tournament?.played}
				wins={record.tournament?.wins}
				extra={(
					<View style={styles.honors}>
						<Honor tone="gold" label="1. miejsce" count={record.tournament?.place1} />
						<Honor label="2. miejsce" count={record.tournament?.place2} />
						<Honor label="3. miejsce" count={record.tournament?.place3} />
					</View>
				)}
			/>
			<SourceCard
				icon="shield-outline"
				title="Liga"
				toneKey="league"
				played={record.league?.played}
				wins={record.league?.wins}
				extra={(
					<View style={styles.honors}>
						<Honor tone="gold" label="Mistrzostwa" count={record.league?.titles} />
					</View>
				)}
			/>
			<SourceCard
				icon="flash-outline"
				title="Szybkie"
				toneKey="quick"
				played={record.quick?.played}
				wins={record.quick?.wins}
			/>

			<Text style={styles.sectionTitle}>Aktywność</Text>
			<View style={[styles.card, cardToneStyle(colors.success)]}>
				<Text style={styles.kicker}>Aktywność</Text>
				<Text style={styles.bigRate}>{activity.days ?? 0}</Text>
				<Text style={styles.bigLabel}>dni z grą</Text>
				{recentDays.length > 0 ? (
					<View style={styles.week}>
						<Text style={styles.weekCaption}>Ostatnie 7 dni</Text>
						<View style={styles.weekRow}>
							{recentDays.map((day) => (
								<View key={day.date || day.label} style={styles.weekDay}>
									<View style={[styles.weekDot, day.played && styles.weekDotOn]} />
									<Text style={styles.weekLabel}>{day.label}</Text>
								</View>
							))}
						</View>
					</View>
				) : null}
				<View style={styles.metaPair}>
					<View style={styles.metaItem}>
						<Text style={styles.metaDt}>Najdłuższa seria</Text>
						<Text style={styles.metaDd}>{activity.longestStreak ?? 0}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaDt}>Mecze / dzień</Text>
						<Text style={styles.metaDd}>{activity.gamesPerDay || '–'}</Text>
					</View>
				</View>
			</View>

			<View style={[styles.card, cardToneStyle(colors.warning)]}>
				<Text style={styles.kicker}>Społeczność</Text>
				<View style={styles.socialRow}>
					<View style={styles.socialCol}>
						<Text style={styles.bigRate}>{social.friends ?? 0}</Text>
						<Text style={styles.bigLabel}>znajomi</Text>
					</View>
					<View style={styles.socialColRight}>
						<Text style={styles.bigRate}>{social.uniqueOpponents ?? 0}</Text>
						<Text style={styles.bigLabel}>unikalni przeciwnicy</Text>
					</View>
				</View>
				{rivals.length > 0 ? (
					<View style={styles.rivals}>
						<Text style={styles.weekCaption}>Najczęstsi przeciwnicy</Text>
						{rivals.map((rival) => (
							<Pressable
								key={rival.id}
								style={styles.rivalRow}
								onPress={() => onRivalPress?.(rival)}
							>
								<Text style={styles.rivalName}>{rival.name}</Text>
								<Text style={styles.rivalGames}>{rival.games}</Text>
							</Pressable>
						))}
					</View>
				) : null}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		paddingBottom: 8,
		gap: 10,
	},
	sectionHead: {
		marginTop: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	sectionTitle: {
		marginTop: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	card: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		overflow: 'hidden',
	},
	cardHead: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	kicker: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	scope: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
		backgroundColor: colors.bgElevatedHover,
	},
	scopeText: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.textMuted,
	},
	bigRate: {
		fontSize: 28,
		fontWeight: '700',
		color: colors.text,
	},
	bigLabel: {
		marginTop: 2,
		fontSize: 12,
		color: colors.textMuted,
	},
	counts: {
		marginTop: 10,
		fontSize: 13,
		color: colors.textSecondary,
	},
	countStrong: {
		fontWeight: '700',
		color: colors.text,
	},
	barTrack: {
		marginTop: 12,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.bgElevatedHover,
		overflow: 'hidden',
	},
	barFill: {
		height: '100%',
		borderRadius: 3,
		backgroundColor: colors.accent,
	},
	metaPair: {
		marginTop: 12,
		flexDirection: 'row',
		gap: 16,
	},
	metaItem: {
		flex: 1,
	},
	metaDt: {
		fontSize: 11,
		color: colors.textDim,
	},
	metaDd: {
		marginTop: 2,
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	formCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		overflow: 'hidden',
	},
	formHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	sourceIcon: {
		width: 28,
		height: 28,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	sourceTitle: {
		flex: 1,
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	formGames: {
		marginTop: 6,
		marginBottom: 12,
		fontSize: 13,
		color: colors.textMuted,
	},
	formGamesStrong: {
		fontWeight: '700',
		color: colors.text,
	},
	highlightGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	highlight: {
		width: '47%',
		flexGrow: 1,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: colors.bg,
	},
	highlightLabel: {
		fontSize: 11,
		color: colors.textDim,
	},
	highlightValue: {
		marginTop: 2,
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	sourceCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		overflow: 'hidden',
	},
	sourceHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	sourceStats: {
		flexDirection: 'row',
		alignItems: 'baseline',
		flexWrap: 'wrap',
		gap: 8,
	},
	sourcePlayed: {
		fontSize: 24,
		fontWeight: '700',
		color: colors.text,
	},
	sourcePlayedLabel: {
		fontSize: 12,
		color: colors.textMuted,
		marginRight: 6,
	},
	sourceWl: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	sourceRate: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.accent,
	},
	honors: {
		marginTop: 12,
		flexDirection: 'row',
		gap: 12,
	},
	honor: {
		alignItems: 'flex-start',
	},
	honorCount: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	honorGold: {
		color: colors.accent,
	},
	honorLabel: {
		marginTop: 2,
		fontSize: 11,
		color: colors.textDim,
	},
	week: {
		marginTop: 14,
	},
	weekCaption: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.textDim,
		marginBottom: 8,
	},
	weekRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	weekDay: {
		alignItems: 'center',
		gap: 4,
	},
	weekDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: colors.bgElevatedHover,
	},
	weekDotOn: {
		backgroundColor: colors.accent,
	},
	weekLabel: {
		fontSize: 10,
		color: colors.textDim,
	},
	socialRow: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	socialCol: {
		flex: 1,
	},
	socialColRight: {
		flex: 1,
		paddingLeft: 14,
		borderLeftWidth: StyleSheet.hairlineWidth,
		borderLeftColor: colors.border,
	},
	rivals: {
		marginTop: 14,
	},
	rivalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	rivalName: {
		color: colors.accent,
		fontWeight: '600',
		fontSize: 14,
	},
	rivalGames: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
});

export default ProfileStatsOverview;
