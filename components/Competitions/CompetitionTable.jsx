import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Flashscore-lite table with horizontal scroll.
 *
 * columns: [{ key, label, width?, align?, player?: boolean }]
 * rows: array of objects; player cells: { text, playerId?, name? }
 */
const CompetitionTable = ({
	columns,
	rows,
	emptyText = 'Brak danych.',
	onPlayerPress,
	showHorizontalScroll = false,
}) => {
	if (!rows || rows.length === 0) {
		return <Text style={styles.empty}>{emptyText}</Text>;
	}

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={showHorizontalScroll}
			nestedScrollEnabled
			style={styles.scroll}
		>
			<View>
				<View style={styles.headerRow}>
					{columns.map((col) => (
						<Text
							key={col.key}
							style={[
								styles.headerCell,
								{ width: scaleSize(col.width ?? 72) },
								alignStyle(col.align),
							]}
							numberOfLines={1}
						>
							{col.label}
						</Text>
					))}
				</View>
				{rows.map((row, rowIndex) => (
					<View
						key={row.key ?? row.id ?? row.playerId ?? `row-${rowIndex}`}
						style={[styles.bodyRow, rowIndex % 2 === 1 && styles.bodyRowAlt]}
					>
						{columns.map((col) => {
							const raw = row[col.key];
							const isPlayer = col.player;
							const text = isPlayer
								? (typeof raw === 'object' ? raw?.text : raw) ?? '—'
								: formatCell(raw);
							const playerId = isPlayer && typeof raw === 'object' ? raw?.playerId : null;
							const playerName =
								isPlayer && typeof raw === 'object' ? raw?.name ?? text : text;
							const canPress = Boolean(isPlayer && playerId && onPlayerPress);

							if (canPress) {
								return (
									<Pressable
										key={col.key}
										style={{ width: scaleSize(col.width ?? 72) }}
										onPress={() => onPlayerPress(playerId, playerName)}
									>
										<Text
											style={[styles.playerCell, alignStyle(col.align)]}
											numberOfLines={1}
										>
											{text}
										</Text>
									</Pressable>
								);
							}

							return (
								<Text
									key={col.key}
									style={[
										styles.cell,
										{ width: scaleSize(col.width ?? 72) },
										alignStyle(col.align),
										isPlayer && styles.playerCellMuted,
									]}
									numberOfLines={1}
								>
									{text}
								</Text>
							);
						})}
					</View>
				))}
			</View>
		</ScrollView>
	);
};

function formatCell(value) {
	if (value === null || value === undefined || value === '') return '—';
	return String(value);
}

function alignStyle(align) {
	if (align === 'left') return styles.alignLeft;
	if (align === 'right') return styles.alignRight;
	return styles.alignCenter;
}

const styles = StyleSheet.create({
	scroll: {
		marginBottom: 8,
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: 8,
		marginBottom: 2,
	},
	headerCell: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	bodyRow: {
		flexDirection: 'row',
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderSoft,
	},
	bodyRowAlt: {
		backgroundColor: colors.bgElevated,
	},
	cell: {
		color: colors.textSecondary,
		fontSize: 13,
		fontVariant: ['tabular-nums'],
	},
	playerCell: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
	},
	playerCellMuted: {
		color: colors.text,
		fontWeight: '600',
	},
	alignLeft: { textAlign: 'left' },
	alignCenter: { textAlign: 'center' },
	alignRight: { textAlign: 'right' },
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 20,
	},
});

export default CompetitionTable;
