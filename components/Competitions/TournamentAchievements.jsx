import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { groupAchievementValues } from '../../helpers/groupAchievementValues';

const TournamentAchievements = ({ rows }) => {
	if (!rows || rows.length === 0) {
		return <Text style={styles.empty}>Brak osiągnięć.</Text>;
	}

	return rows.map((row) => (
		<AchievementCard key={row.playerId ?? row.playerName} row={row} />
	));
};

function AchievementCard({ row }) {
	const max = Number(row.max) || 0;
	const oneSeventy = Number(row.oneSeventy) || 0;
	const qf = groupAchievementValues(row.qf, 'asc');
	const hf = groupAchievementValues(row.hf, 'desc');

	return (
		<View style={styles.card}>
			<View style={styles.head}>
				<Text style={styles.name} numberOfLines={1}>
					{row.playerName}
				</Text>
				{max > 0 || oneSeventy > 0 ? (
					<View style={styles.counts}>
						{max > 0 ? <Count label="180" value={max} /> : null}
						{oneSeventy > 0 ? <Count label="170+" value={oneSeventy} /> : null}
					</View>
				) : null}
			</View>
			{qf.length > 0 ? <FinishLine code="QF" items={qf} /> : null}
			{hf.length > 0 ? <FinishLine code="HF" items={hf} /> : null}
		</View>
	);
}

function Count({ label, value }) {
	return (
		<View style={styles.count}>
			<Key>{label}</Key>
			<Text style={styles.countValue}>{value}</Text>
		</View>
	);
}

function FinishLine({ code, items }) {
	return (
		<View style={styles.line}>
			<Key column>{code}</Key>
			<View style={styles.tokens}>
				{items.map((item) => (
					<ValueToken key={item.value} value={item.value} count={item.count} />
				))}
			</View>
		</View>
	);
}

function Key({ children, column = false }) {
	return (
		<View style={[styles.key, column && styles.keyColumn]}>
			<Text style={styles.keyText}>{children}</Text>
		</View>
	);
}

function ValueToken({ value, count }) {
	const repeated = count > 1;
	return (
		<View
			style={styles.token}
			accessibilityLabel={repeated ? `${value} razy ${count}` : String(value)}
		>
			<Text style={styles.tokenValue}>{value}</Text>
			{repeated ? <Text style={styles.tokenMark}>×{count}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 16,
	},
	card: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	name: {
		flex: 1,
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	counts: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flexShrink: 0,
	},
	count: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	countValue: {
		color: colors.textSecondary,
		fontSize: 15,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	line: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 8,
		gap: 8,
	},
	key: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		backgroundColor: colors.bg,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
	},
	keyColumn: {
		width: 40,
		marginTop: 1,
	},
	keyText: {
		color: colors.text,
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.4,
	},
	tokens: {
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'baseline',
		gap: 10,
		paddingTop: 2,
	},
	token: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 2,
	},
	tokenValue: {
		color: colors.textSecondary,
		fontSize: 15,
		fontWeight: '600',
		fontVariant: ['tabular-nums'],
	},
	tokenMark: {
		color: colors.accent,
		fontSize: 12,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
	},
});

export default TournamentAchievements;
