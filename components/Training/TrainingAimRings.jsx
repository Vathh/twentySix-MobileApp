import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';

const SIZE = 88;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function AimRing({ aim, attempts, hits, percent }) {
	const pct = Number.isFinite(percent)
		? percent
		: (attempts > 0 ? Math.round((1000 * hits) / attempts) / 10 : 0);
	const offset = CIRC * (1 - Math.min(100, Math.max(0, pct)) / 100);

	return (
		<View style={styles.card}>
			<View style={styles.ringWrap}>
				<Svg width={SIZE} height={SIZE}>
					<Circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						stroke={colors.border}
						strokeWidth={STROKE}
						fill="none"
					/>
					<Circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						stroke={colors.accent}
						strokeWidth={STROKE}
						fill="none"
						strokeDasharray={`${CIRC} ${CIRC}`}
						strokeDashoffset={offset}
						strokeLinecap="round"
						transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
					/>
				</Svg>
				<Text style={styles.aimLabel} numberOfLines={1}>{aim}</Text>
			</View>
			<Text style={styles.percent}>{`${pct}%`}</Text>
			<Text style={styles.fraction}>{`${hits}/${attempts}`}</Text>
		</View>
	);
}

/** Siatka 3 kolumn: pierścień skuteczności per cel. */
const TrainingAimRings = ({ aims }) => {
	const rows = Array.isArray(aims) ? aims.filter((row) => row?.aim && (row.attempts ?? 0) > 0) : [];
	if (rows.length === 0) {
		return null;
	}

	return (
		<View style={styles.grid}>
			{rows.map((row) => (
				<AimRing
					key={row.aim}
					aim={row.aim}
					attempts={row.attempts}
					hits={row.hits}
					percent={row.percent}
				/>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6,
		marginBottom: 8,
	},
	card: {
		width: '33.33%',
		paddingHorizontal: 6,
		paddingVertical: 10,
		alignItems: 'center',
	},
	ringWrap: {
		width: SIZE,
		height: SIZE,
		alignItems: 'center',
		justifyContent: 'center',
	},
	aimLabel: {
		position: 'absolute',
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
		maxWidth: SIZE - 20,
		textAlign: 'center',
	},
	percent: {
		marginTop: 6,
		color: colors.accent,
		fontSize: 15,
		fontWeight: '700',
	},
	fraction: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '600',
	},
});

export default TrainingAimRings;
