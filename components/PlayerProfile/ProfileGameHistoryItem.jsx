import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

function typeLabel(type) {
	if (type === 'quick') return 'Szybki mecz';
	if (type === 'group' || type === 'playoff') return 'Turniej';
	if (type === 'league') return 'Liga';
	if (type === 'training') return 'Trening';
	return type || '–';
}

const ProfileGameHistoryItem = ({ item }) => {
	const won = item?.result === 'wygrana';

	return (
		<View style={styles.card}>
			<View style={styles.topRow}>
				<Text style={styles.date}>{item?.date_formatted || '–'}</Text>
				<Text style={styles.type}>{typeLabel(item?.type)}</Text>
			</View>
			<Text style={styles.opponents}>{item?.opponents || '–'}</Text>
			<View style={styles.bottomRow}>
				<Text style={[styles.result, won ? styles.won : styles.lost]}>
					{item?.result || '–'}
				</Text>
				<Text style={styles.score}>{item?.score || '–'}</Text>
			</View>
			{item?.tournament_name ? (
				<Text style={styles.tournament}>{item.tournament_name}</Text>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		marginBottom: 10,
	},
	topRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	date: {
		color: colors.textMuted,
		fontSize: 13,
	},
	type: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
	},
	opponents: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 8,
	},
	bottomRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	result: {
		fontSize: 14,
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	won: {
		color: colors.accent,
	},
	lost: {
		color: colors.textMuted,
	},
	score: {
		color: colors.textSecondary,
		fontSize: 14,
	},
	tournament: {
		marginTop: 8,
		color: colors.textDim,
		fontSize: 12,
	},
});

export default ProfileGameHistoryItem;
