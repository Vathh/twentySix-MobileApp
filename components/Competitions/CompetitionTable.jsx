import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Flashscore-lite table with horizontal scroll.
 *
 * columns: [{ key, label, width?, align?, player?: boolean }]
 * rows: array of objects; player cells: { text, playerId?, name? }
 * freezePlayerColumn: kolumny z `player` albo `pinned` zostają z lewej przy poziomym scrollu.
 */
const CompetitionTable = ({
	columns = [],
	rows,
	emptyText = 'Brak danych.',
	onPlayerPress,
	onGameCellPress,
	showHorizontalScroll = false,
	freezePlayerColumn = false,
	hugContent = false,
	lockingGameId = null,
	playerLines = 1,
	rowMinHeight = null,
	contentInset = 0,
}) => {
	const [rowHeights, setRowHeights] = useState({});
	const [fitWidths, setFitWidths] = useState({});
	const measuredRef = useRef({});

	const reportRowHeight = useCallback((rowKey, side, height) => {
		const rounded = Math.round(height);
		if (!rounded) {
			return;
		}
		const measured = measuredRef.current[rowKey] ?? {};
		if (measured[side] === rounded) {
			return;
		}
		const nextMeasured = { ...measured, [side]: rounded };
		measuredRef.current[rowKey] = nextMeasured;
		const next = Math.max(nextMeasured.frozen ?? 0, nextMeasured.scroll ?? 0);
		setRowHeights((prev) => {
			if (prev[rowKey] != null && Math.abs(prev[rowKey] - next) <= 1) {
				return prev;
			}
			return { ...prev, [rowKey]: next };
		});
	}, []);

	const reportFitWidth = useCallback((key, width) => {
		const next = Math.ceil(width) + 6;
		if (!Number.isFinite(next) || next <= 6) {
			return;
		}
		setFitWidths((prev) => {
			const current = prev[key] ?? 0;
			if (next <= current + 1) {
				return prev;
			}
			return { ...prev, [key]: next };
		});
	}, []);

	if (!rows || rows.length === 0) {
		return <Text style={styles.empty}>{emptyText}</Text>;
	}

	const indexed = columns.map((column, index) => ({ column, index }));
	const stays = (column) => column.player || column.pinned;
	const freeze = freezePlayerColumn && indexed.some(({ column }) => stays(column));
	const frozenIndexed = freeze ? indexed.filter(({ column }) => stays(column)) : [];
	const scrollIndexed = freeze ? indexed.filter(({ column }) => !stays(column)) : indexed;

	const columnBox = (column, columnIndex, pinned = false) => ({
		width: fitWidths[column.key] ?? scaleSize(column.width ?? (column.fitContent ? 140 : 72)),
		flexShrink: 0,
		...(pinned ? { paddingRight: scaleSize(6) } : null),
		...edgeInset(columnIndex, columns.length, contentInset, column.player),
	});

	const renderSheet = (visible, side) => {
		const fill = side !== 'frozen' && !hugContent;
		const padKey = side === 'frozen' ? visible[visible.length - 1]?.column.key : null;
		return (
			<View style={[styles.sheet, (side === 'frozen' || hugContent) && styles.sheetPinned]}>
				<View
					style={[
						styles.headerRow,
						fill && styles.rowFill,
						side && rowHeights.header > 0 ? { minHeight: rowHeights.header } : null,
					]}
					onLayout={
						side
							? (event) => reportRowHeight('header', side, event.nativeEvent.layout.height)
							: undefined
					}
				>
					{visible.map(({ column, index }) => (
						<Text
							key={column.key}
							style={[
								styles.headerCell,
								columnBox(column, index, column.key === padKey),
								alignStyle(column.align),
							]}
							numberOfLines={1}
						>
							{column.label}
						</Text>
					))}
				</View>
				{rows.map((row, rowIndex) => {
					const rowKey = String(row.key ?? row.id ?? row.playerId ?? `row-${rowIndex}`);
					return (
						<View
							key={rowKey}
							collapsable={false}
							style={[
								styles.bodyRow,
								fill && styles.rowFill,
								rowMinHeight != null && { height: rowMinHeight, paddingVertical: 0, overflow: 'hidden' },
								side && rowMinHeight == null && rowHeights[rowKey] > 0
									? { minHeight: rowHeights[rowKey] }
									: null,
								rowIndex % 2 === 1 && styles.bodyRowAlt,
							]}
							onLayout={
								side
									? (event) => reportRowHeight(rowKey, side, event.nativeEvent.layout.height)
									: undefined
							}
						>
							{visible.map(({ column: col, index: colIndex }) => {
							const raw = row[col.key];
							const isPlayer = col.player;
							const text = isPlayer
								? (typeof raw === 'object' ? raw?.text : raw) ?? '—'
								: formatCell(raw);
							const subtitle = isPlayer && typeof raw === 'object' ? raw?.subtitle ?? null : null;
							const matchAverage = !isPlayer && raw && typeof raw === 'object' ? raw?.average ?? null : null;
							const secondary = subtitle || matchAverage || null;
							const playerId = isPlayer && typeof raw === 'object' ? raw?.playerId : null;
							const playerName =
								isPlayer && typeof raw === 'object' ? raw?.name ?? text : text;
							const canPressPlayer = Boolean(isPlayer && playerId && onPlayerPress);
							const playableGame =
								!isPlayer &&
								raw &&
								typeof raw === 'object' &&
								raw.playable &&
								raw.game &&
								onGameCellPress
									? raw.game
									: null;
							const sequence =
								!isPlayer && raw && typeof raw === 'object' && raw.sequence != null
									? raw.sequence
									: null;
							const cellWidth = columnBox(col, colIndex, col.key === padKey);

							if (sequence != null) {
								const badge = <SequenceBadge value={sequence} />;
								if (playableGame) {
									const isLocking = lockingGameId === playableGame.id;
									return (
										<Pressable
											key={col.key}
											style={[cellWidth, styles.playableCell, styles.sequenceCell]}
											onPress={() => onGameCellPress(playableGame)}
											disabled={lockingGameId != null}
										>
											{isLocking ? (
												<ActivityIndicator size="small" color={colors.accent} />
											) : (
												badge
											)}
										</Pressable>
									);
								}
								return (
									<View key={col.key} style={[cellWidth, styles.sequenceCell]}>
										{badge}
									</View>
								);
							}

							if (canPressPlayer) {
								return (
									<Pressable
										key={col.key}
										style={cellWidth}
										onPress={() => onPlayerPress(playerId, playerName)}
									>
										<CellLines
											text={text}
											secondary={secondary}
											textStyle={[styles.playerCell, alignStyle(col.align)]}
											align={alignStyle(col.align)}
											lines={playerLines}
										/>
									</Pressable>
								);
							}

							if (playableGame) {
								const isLocking = lockingGameId === playableGame.id;
								return (
									<Pressable
										key={col.key}
										style={[cellWidth, styles.playableCell]}
										onPress={() => onGameCellPress(playableGame)}
										disabled={lockingGameId != null}
									>
										{isLocking ? (
											<ActivityIndicator size="small" color={colors.accent} />
										) : (
											<Text
												style={[styles.playableCellText, alignStyle(col.align)]}
												numberOfLines={1}
											>
												{text}
											</Text>
										)}
									</Pressable>
								);
							}

							return (
								<View key={col.key} style={cellWidth}>
									<CellLines
										text={text}
										secondary={secondary}
										textStyle={[
											styles.cell,
											alignStyle(col.align),
											isPlayer && styles.playerCellMuted,
										]}
										align={alignStyle(col.align)}
										lines={isPlayer ? playerLines : 1}
										fill={Boolean(col.fitContent)}
									/>
								</View>
							);
							})}
						</View>
					);
				})}
			</View>
		);
	};

	const scrollContentStyle = hugContent ? styles.scrollContentHug : styles.scrollContent;
	const table = !freeze ? (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={showHorizontalScroll}
			nestedScrollEnabled
			style={styles.scroll}
			contentContainerStyle={scrollContentStyle}
		>
			{renderSheet(scrollIndexed, null)}
		</ScrollView>
	) : (
		<View style={styles.split}>
			<View style={styles.frozen}>{renderSheet(frozenIndexed, 'frozen')}</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={showHorizontalScroll}
				nestedScrollEnabled
				style={[styles.scroll, styles.scrollBeside]}
				contentContainerStyle={scrollContentStyle}
			>
				{renderSheet(scrollIndexed, 'scroll')}
			</ScrollView>
		</View>
	);

	return (
		<View>
			<FitProbes columns={columns} rows={rows} onWidth={reportFitWidth} />
			{table}
		</View>
	);
};

function FitProbes({ columns, rows, onWidth }) {
	const targets = columns.filter((column) => column.fitContent);
	if (targets.length === 0) {
		return null;
	}
	return (
		<View style={styles.probe} pointerEvents="none" collapsable={false} accessibilityElementsHidden>
			{targets.map((column) =>
				fitSamples(column, rows).map((label) => (
					<Text
						key={`${column.key}:${label}`}
						style={[styles.cell, styles.probeText]}
						onLayout={(event) => onWidth(column.key, event.nativeEvent.layout.width)}
					>
						{label}
					</Text>
				)),
			)}
		</View>
	);
}

function fitSamples(column, rows) {
	const seen = new Set();
	const labels = [];
	const push = (value) => {
		const text = String(value ?? '').trim();
		if (!text || seen.has(text)) {
			return;
		}
		seen.add(text);
		labels.push(text);
	};
	rows.forEach((row) => push(formatCell(row[column.key])));
	return labels;
}

function CellLines({ text, secondary, textStyle, align, lines = 1, fill = false }) {
	return (
		<View style={fill ? styles.cellFill : null}>
			<Text style={[textStyle, fill && styles.cellFill]} numberOfLines={lines}>
				{text}
			</Text>
			{secondary ? (
				<Text style={[styles.average, align]} numberOfLines={1}>
					{secondary}
				</Text>
			) : null}
		</View>
	);
}

function SequenceBadge({ value }) {
	return (
		<View style={styles.sequenceBadge}>
			<Text style={styles.sequenceBadgeText}>{value}</Text>
		</View>
	);
}

function formatCell(value) {
	if (value === null || value === undefined || value === '') return '—';
	if (typeof value === 'object' && value.text != null) return String(value.text);
	return String(value);
}

function edgeInset(index, count, inset, isPlayer) {
	if (!inset) {
		return null;
	}
	return {
		paddingLeft: index === 0 || isPlayer ? inset : 0,
		paddingRight: index === count - 1 ? inset : 0,
	};
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
	scrollBeside: {
		flex: 1,
		minWidth: 0,
		marginBottom: 0,
	},
	scrollContent: {
		minWidth: '100%',
	},
	scrollContentHug: {
		flexGrow: 0,
		alignItems: 'flex-start',
	},
	probe: {
		position: 'absolute',
		opacity: 0,
		alignItems: 'flex-start',
	},
	probeText: {
		alignSelf: 'flex-start',
	},
	cellFill: {
		alignSelf: 'stretch',
		width: '100%',
	},
	split: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		width: '100%',
		marginBottom: 8,
	},
	frozen: {
		flexGrow: 0,
		flexShrink: 0,
		borderRightWidth: 1,
		borderRightColor: colors.border,
		backgroundColor: colors.bg,
	},
	sheet: {
		minWidth: '100%',
	},
	sheetPinned: {
		minWidth: 0,
		alignSelf: 'flex-start',
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: 8,
		marginBottom: 2,
	},
	rowFill: {
		width: '100%',
	},
	headerCell: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	bodyRow: {
		flexDirection: 'row',
		alignItems: 'center',
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
	average: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 11,
		fontVariant: ['tabular-nums'],
	},
	playableCell: {
		justifyContent: 'center',
		minHeight: 36,
	},
	sequenceCell: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	sequenceBadge: {
		minWidth: 30,
		height: 28,
		paddingHorizontal: 8,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		backgroundColor: colors.accentSoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sequenceBadgeText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	playableCellText: {
		color: colors.accent,
		fontSize: 16,
		fontWeight: '700',
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
