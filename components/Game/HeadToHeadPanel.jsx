import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatAverage, hasAverage } from '../../helpers/formatAverage';
import { colors } from '../../theme/colors';

function showAvg(value) {
	return hasAverage(value) ? formatAverage(value) : '-';
}

function leads(left, right) {
	const l = left == null || left === '' ? null : Number(left);
	const r = right == null || right === '' ? null : Number(right);
	return {
		left: l != null && !Number.isNaN(l) && (r == null || Number.isNaN(r) || l > r),
		right: r != null && !Number.isNaN(r) && (l == null || Number.isNaN(l) || r > l),
	};
}

const HeadToHeadPanel = ({
	h2h,
	leftName,
	rightName,
	resetKey,
	zeroText,
	listEmptyText,
	onOpenMeeting,
	loadPage,
}) => {
	const [recent, setRecent] = useState(Array.isArray(h2h?.recent) ? h2h.recent : []);
	const [hasMore, setHasMore] = useState(!!h2h?.recentHasMore);
	const [loadingMore, setLoadingMore] = useState(false);
	const [moreError, setMoreError] = useState('');

	useEffect(() => {
		setRecent(Array.isArray(h2h?.recent) ? h2h.recent : []);
		setHasMore(!!h2h?.recentHasMore);
		setMoreError('');
	}, [resetKey, h2h]);

	const loadMore = async () => {
		if (loadingMore || !hasMore || typeof loadPage !== 'function') return;
		setLoadingMore(true);
		setMoreError('');
		const result = await loadPage(recent.length);
		setLoadingMore(false);
		if (!result?.ok) {
			setMoreError(result?.message || 'Nie udało się wczytać kolejnych spotkań.');
			return;
		}
		const next = Array.isArray(result.data?.recent) ? result.data.recent : [];
		setRecent((prev) => prev.concat(next));
		setHasMore(!!result.data?.hasMore);
	};

	if (!h2h) return null;

	const streakName = h2h.streak?.side === 'player1' ? leftName : rightName;
	const winsTotal = (h2h.player1Wins ?? 0) + (h2h.player2Wins ?? 0);
	const leftShare = winsTotal > 0 ? ((h2h.player1Wins ?? 0) / winsTotal) * 100 : 50;
	const rightShare = 100 - leftShare;
	const winLead = leads(h2h.player1Wins, h2h.player2Wins);
	const legLead = leads(h2h.player1Legs, h2h.player2Legs);
	const avgLead = leads(h2h.player1Average, h2h.player2Average);

	return (
		<View style={styles.section}>
			{h2h.meetings === 0 ? (
				<Text style={styles.muted}>{zeroText}</Text>
			) : (
				<View style={styles.h2hCard}>
					<View style={styles.h2hRecord}>
						<View style={styles.h2hMetricRow}>
							<Text style={[styles.h2hName, styles.h2hNameLeft]} numberOfLines={2}>
								{leftName}
							</Text>
							<View style={styles.h2hLabel} />
							<Text style={[styles.h2hName, styles.h2hNameRight]} numberOfLines={2}>
								{rightName}
							</Text>
						</View>
						<View
							style={styles.h2hBar}
							accessibilityLabel={`Bilans wygranych ${h2h.player1Wins ?? 0} do ${h2h.player2Wins ?? 0}`}
						>
							{leftShare > 0 ? <View style={[styles.h2hBarLeft, { width: `${leftShare}%` }]} /> : null}
							{rightShare > 0 ? <View style={[styles.h2hBarRight, { width: `${rightShare}%` }]} /> : null}
						</View>
						<View style={styles.h2hMetricRow}>
							<Text style={[styles.h2hWins, styles.h2hAlignLeft, winLead.left && styles.h2hLead]}>
								{h2h.player1Wins ?? 0}
							</Text>
							<Text style={styles.h2hLabel}>wygrane</Text>
							<Text style={[styles.h2hWins, styles.h2hAlignRight, winLead.right && styles.h2hLead]}>
								{h2h.player2Wins ?? 0}
							</Text>
						</View>
						<View style={styles.h2hMetricRow}>
							<Text style={[styles.h2hLegs, styles.h2hAlignLeft, legLead.left && styles.h2hLead]}>
								{h2h.player1Legs ?? 0}
							</Text>
							<Text style={styles.h2hLabel}>legi</Text>
							<Text style={[styles.h2hLegs, styles.h2hAlignRight, legLead.right && styles.h2hLead]}>
								{h2h.player2Legs ?? 0}
							</Text>
						</View>
						<View style={styles.h2hMetricRow}>
							<Text style={[styles.h2hAvg, styles.h2hAlignLeft, avgLead.left && styles.h2hLead]}>
								{showAvg(h2h.player1Average)}
							</Text>
							<Text style={styles.h2hLabel}>średnia</Text>
							<Text style={[styles.h2hAvg, styles.h2hAlignRight, avgLead.right && styles.h2hLead]}>
								{showAvg(h2h.player2Average)}
							</Text>
						</View>
					</View>
					{h2h.streak || h2h.firstMeetingAt ? (
						<Text style={styles.h2hMeta}>
							{h2h.streak ? `${streakName} ma serię ${h2h.streak.label || ''}` : ''}
							{h2h.streak && h2h.firstMeetingAt ? ' · ' : ''}
							{h2h.firstMeetingAt ? `Pierwsze spotkanie: ${h2h.firstMeetingAt}` : ''}
						</Text>
					) : null}
					{recent.length === 0 ? (
						<Text style={styles.h2hEmpty}>{listEmptyText}</Text>
					) : (
						<View>
							<Text style={styles.h2hListTitle}>Ostatnie spotkania</Text>
							{recent.map((meeting) => (
								<Pressable
									key={`${meeting.kind}-${meeting.id}`}
									style={styles.h2hMatch}
									onPress={() => onOpenMeeting?.(meeting)}
								>
									<View style={styles.h2hMatchTop}>
										<Text style={styles.h2hDate}>{meeting.dateFormatted || '—'}</Text>
										<View style={styles.h2hCenter}>
											<Text style={styles.h2hCellAvg}>{showAvg(meeting.player1Average)}</Text>
											<Text
												style={[
													styles.h2hScore,
													meeting.winnerSide === 'player1' ? styles.scoreWin : null,
												]}
											>
												{meeting.player1Score ?? 0}
											</Text>
											<Text style={styles.h2hSep}>:</Text>
											<Text
												style={[
													styles.h2hScore,
													meeting.winnerSide === 'player2' ? styles.scoreWin : null,
												]}
											>
												{meeting.player2Score ?? 0}
											</Text>
											<Text style={[styles.h2hCellAvg, styles.h2hCellAvgRight]}>
												{showAvg(meeting.player2Average)}
											</Text>
										</View>
										<Text style={styles.h2hPlace} numberOfLines={1}>
											{meeting.placeLabel}
										</Text>
									</View>
								</Pressable>
							))}
							{moreError ? <Text style={styles.h2hMoreError}>{moreError}</Text> : null}
							{hasMore ? (
								<Pressable style={styles.h2hMore} onPress={loadMore} disabled={loadingMore}>
									<Text style={styles.h2hMoreText}>
										{loadingMore ? 'Wczytywanie…' : 'Załaduj więcej'}
									</Text>
								</Pressable>
							) : null}
						</View>
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	section: {
		marginBottom: 22,
	},
	muted: {
		color: colors.textMuted,
		fontSize: 14,
	},
	scoreWin: {
		color: colors.accent,
	},
	h2hCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	h2hRecord: {
		paddingVertical: 14,
		paddingHorizontal: 12,
		gap: 6,
	},
	h2hMetricRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 8,
	},
	h2hName: {
		flexGrow: 1,
		flexBasis: 0,
		minWidth: 0,
		fontSize: 13,
		fontWeight: '700',
	},
	h2hNameLeft: {
		color: colors.accent,
		textAlign: 'right',
	},
	h2hNameRight: {
		color: colors.textMuted,
		textAlign: 'left',
	},
	h2hAlignLeft: {
		textAlign: 'right',
	},
	h2hAlignRight: {
		textAlign: 'left',
	},
	h2hBar: {
		width: '100%',
		height: 8,
		borderRadius: 999,
		overflow: 'hidden',
		flexDirection: 'row',
		backgroundColor: colors.border,
	},
	h2hBarLeft: {
		height: '100%',
		backgroundColor: colors.accent,
	},
	h2hBarRight: {
		height: '100%',
		backgroundColor: colors.textMuted,
	},
	h2hLead: {
		color: colors.accent,
	},
	h2hWins: {
		flexGrow: 1,
		flexBasis: 0,
		color: colors.text,
		fontSize: 24,
		fontWeight: '800',
	},
	h2hLegs: {
		flexGrow: 1,
		flexBasis: 0,
		color: colors.textSecondary,
		fontSize: 15,
		fontWeight: '700',
	},
	h2hAvg: {
		flexGrow: 1,
		flexBasis: 0,
		color: colors.textMuted,
		fontSize: 12,
	},
	h2hLabel: {
		width: 64,
		color: colors.textMuted,
		fontSize: 11,
		textAlign: 'center',
	},
	h2hMeta: {
		color: colors.textMuted,
		fontSize: 12,
		textAlign: 'center',
		paddingHorizontal: 12,
		paddingBottom: 12,
	},
	h2hEmpty: {
		color: colors.textMuted,
		fontSize: 13,
		textAlign: 'center',
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	h2hListTitle: {
		color: colors.accent,
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		textAlign: 'center',
		paddingVertical: 8,
		backgroundColor: colors.accentMuted,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	h2hMatch: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
		gap: 4,
	},
	h2hMatchTop: {
		position: 'relative',
		minHeight: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	h2hDate: {
		position: 'absolute',
		left: 0,
		width: 78,
		color: colors.textMuted,
		fontSize: 12,
	},
	h2hCenter: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'center',
		gap: 6,
	},
	h2hCellAvg: {
		width: 46,
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'right',
	},
	h2hCellAvgRight: {
		textAlign: 'left',
	},
	h2hScore: {
		minWidth: 16,
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '800',
		textAlign: 'center',
	},
	h2hSep: {
		color: colors.textMuted,
		fontWeight: '500',
	},
	h2hPlace: {
		position: 'absolute',
		right: 0,
		maxWidth: '36%',
		color: colors.textMuted,
		fontSize: 12,
		textAlign: 'right',
	},
	h2hMore: {
		paddingVertical: 12,
		alignItems: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	h2hMoreText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	h2hMoreError: {
		color: colors.dangerText,
		fontSize: 12,
		textAlign: 'center',
		paddingHorizontal: 12,
		paddingTop: 8,
	},
});

export default HeadToHeadPanel;
