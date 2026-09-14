import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatAverage } from '../../helpers/formatAverage';
import { colors } from '../../theme/colors';

const ROWS = [
	{ key: 'games', label: 'Rozegrane mecze' },
	{ key: 'avg_three_darts', label: 'Średnia (3 lotki)', format: (v) => (v == null || v === '' ? '–' : formatAverage(v)) },
	{ key: 'highest_hf', label: 'Najwyższy finish (HF)' },
	{ key: 'fastest_qf', label: 'Najszybsza lotka (QF)', format: (v) => (v != null ? `${v} lotek` : '–') },
	{ key: 'count_max', label: 'Ilość 180 (max)' },
	{ key: 'count_170_plus', label: 'Ilość 170+ (bez 180)' },
	{ key: 'count_hf', label: 'Ilość finishów 100+ (HF)' },
	{ key: 'count_qf', label: 'Ilość szybkich lotek (QF)' },
];

function formatValue(row, stats) {
	const raw = stats?.[row.key];
	if (row.format) return row.format(raw);
	if (raw === null || raw === undefined || raw === '') return '–';
	return String(raw);
}

const ProfileStatsTable = ({ stats }) => {
	return (
		<View style={styles.table}>
			<View style={[styles.row, styles.headerRow]}>
				<Text style={styles.headerCell}>Metryka</Text>
				<Text style={styles.headerCell}>Wartość</Text>
			</View>
			{ROWS.map((row) => (
				<View key={row.key} style={styles.row}>
					<Text style={styles.label}>{row.label}</Text>
					<Text style={styles.value}>{formatValue(row, stats)}</Text>
				</View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	table: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	headerRow: {
		backgroundColor: colors.bgDeep,
	},
	headerCell: {
		color: colors.textMuted,
		fontWeight: '600',
		fontSize: 13,
	},
	label: {
		flex: 1,
		paddingRight: 12,
		color: colors.textSecondary,
		fontSize: 14,
	},
	value: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '600',
	},
});

export default ProfileStatsTable;
