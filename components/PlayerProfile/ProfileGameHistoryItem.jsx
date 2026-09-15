import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
	formatScore,
	gameTypeLabel,
	historyDate,
	historyTime,
	resultLabel,
} from '../../helpers/profileMetrics';
import { typePillStyle } from '../../helpers/profileTones';
import { colors } from '../../theme/colors';

const ProfileGameHistoryItem = ({ item, first, last }) => {
	const won = item?.result === 'wygrana';
	const pill = typePillStyle(item?.type);

	return (
		<View style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
			<View style={[styles.body, !last && styles.bodyDivider]}>
				<View style={styles.top}>
					<View>
						<Text style={styles.date}>{historyDate(item?.date_formatted)}</Text>
						{historyTime(item?.date_formatted) ? (
							<Text style={styles.time}>{historyTime(item?.date_formatted)}</Text>
						) : null}
					</View>
					<View style={[styles.type, pill]}>
						<Text style={[styles.typeText, { color: pill.color }]}>
							{gameTypeLabel(item?.type)}
						</Text>
					</View>
				</View>
				<Text style={styles.opponents} numberOfLines={2}>
					{item?.opponents || '–'}
				</Text>
				<View style={styles.bottom}>
					<Text style={[styles.result, won ? styles.won : styles.lost]}>
						{resultLabel(item?.result)}
					</Text>
					<Text style={styles.score}>{formatScore(item?.score) || '–'}</Text>
				</View>
				{item?.tournament_name ? (
					<Text style={styles.event} numberOfLines={1}>
						{item.tournament_name}
					</Text>
				) : null}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.bgElevated,
		paddingHorizontal: 14,
	},
	rowFirst: {
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	rowLast: {
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
	},
	body: {
		paddingVertical: 12,
	},
	bodyDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	top: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 4,
	},
	date: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '600',
	},
	time: {
		color: colors.textDim,
		fontSize: 11,
		marginTop: 1,
	},
	type: {
		overflow: 'hidden',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 999,
	},
	typeText: {
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	opponents: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 6,
	},
	bottom: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	result: {
		fontSize: 13,
		fontWeight: '600',
	},
	won: {
		color: colors.successBright,
	},
	lost: {
		color: colors.textMuted,
	},
	score: {
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '600',
	},
	event: {
		marginTop: 6,
		color: colors.textDim,
		fontSize: 12,
	},
});

export default ProfileGameHistoryItem;
