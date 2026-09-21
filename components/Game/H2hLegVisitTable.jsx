import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildH2hLegVisitRows } from '../../helpers/gameScoring/buildH2hLegVisitRows';
import { colors } from '../../theme/colors';

const HEADERS = ['Rzucone', 'Pozostało', 'Lotki', 'Pozostało', 'Rzucone'];

const cellKeys = [
	'leftThrown',
	'leftRemaining',
	'darts',
	'rightRemaining',
	'rightThrown',
];

function cellBust(row, key) {
	return (
		(key === 'leftThrown' && row.leftBust) ||
		(key === 'rightThrown' && row.rightBust)
	);
}

const H2hLegVisitTable = ({ visits, leftPlayerId, rightPlayerId }) => {
	const rows = useMemo(
		() => buildH2hLegVisitRows(visits, leftPlayerId, rightPlayerId),
		[visits, leftPlayerId, rightPlayerId],
	);

	return (
		<View style={styles.wrap}>
			<View style={styles.headerRow}>
				{HEADERS.map((label, index) => (
					<Text
						key={`${label}-${index}`}
						style={[styles.headerCell, index === 2 && styles.headerCenterCol]}
						numberOfLines={1}
						adjustsFontSizeToFit
						minimumFontScale={0.7}
					>
						{label}
					</Text>
				))}
			</View>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				nestedScrollEnabled
				showsVerticalScrollIndicator={rows.length > 4}
			>
				{rows.map((row) => (
					<View key={row.key} style={styles.dataRow}>
						{cellKeys.map((key, index) => (
							<Text
								key={key}
								style={[
									styles.dataCell,
									index === 2 && styles.dartsCell,
									cellBust(row, key) && styles.bustCell,
								]}
								numberOfLines={1}
								adjustsFontSizeToFit
								minimumFontScale={0.75}
							>
								{row[key]}
							</Text>
						))}
					</View>
				))}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		flex: 1,
		minHeight: 0,
		width: '100%',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 4,
		paddingVertical: 6,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	headerCell: {
		flex: 1,
		textAlign: 'center',
		fontSize: 11,
		fontWeight: '600',
		color: colors.textDim,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	headerCenterCol: {
		flex: 0.7,
	},
	scroll: {
		flex: 1,
		minHeight: 0,
	},
	scrollContent: {
		paddingBottom: 4,
	},
	dataRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 4,
		paddingVertical: 7,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	dataCell: {
		flex: 1,
		textAlign: 'center',
		fontSize: 16,
		fontVariant: ['tabular-nums'],
		color: colors.textSecondary,
	},
	dartsCell: {
		flex: 0.7,
		color: colors.accent,
		fontWeight: '700',
	},
	bustCell: {
		color: colors.dangerAlt,
	},
});

export default H2hLegVisitTable;
