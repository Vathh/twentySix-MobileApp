import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CAREER_DETAIL_ROWS, formatFormValue } from '../../helpers/profileMetrics';
import { colors } from '../../theme/colors';

const ProfileStatsTable = ({ stats }) => {
	return (
		<View style={styles.grid}>
			{CAREER_DETAIL_ROWS.map((row) => (
				<View key={row.key} style={styles.cell}>
					<Text style={styles.label}>{row.label}</Text>
					<Text style={styles.value}>{formatFormValue(stats, row.key)}</Text>
				</View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	cell: {
		width: '47%',
		flexGrow: 1,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: colors.bg,
	},
	label: {
		fontSize: 11,
		color: colors.textDim,
	},
	value: {
		marginTop: 3,
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
});

export default ProfileStatsTable;
