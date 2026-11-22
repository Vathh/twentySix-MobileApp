import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';

function ringMetrics(width) {
	const compact = width < 420;
	const size = compact ? 64 : 80;
	const stroke = compact ? 6 : 7;
	const radius = (size - stroke) / 2;
	return {
		size,
		stroke,
		radius,
		circ: 2 * Math.PI * radius,
		labelSize: compact ? 13 : 15,
		percentSize: compact ? 13 : 14,
		fractionSize: compact ? 11 : 12,
		cardPadV: compact ? 6 : 8,
	};
}

function AimRing({ aim, attempts, hits, percent, metrics }) {
	const { size, stroke, radius, circ, labelSize, percentSize, fractionSize } = metrics;
	const pct = Number.isFinite(percent)
		? percent
		: (attempts > 0 ? Math.round((1000 * hits) / attempts) / 10 : 0);
	const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);

	return (
		<View style={[styles.card, { paddingVertical: metrics.cardPadV }]}>
			<View style={[styles.ringWrap, { width: size, height: size }]}>
				<Svg width={size} height={size}>
					<Circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke={colors.border}
						strokeWidth={stroke}
						fill="none"
					/>
					<Circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke={colors.accent}
						strokeWidth={stroke}
						fill="none"
						strokeDasharray={`${circ} ${circ}`}
						strokeDashoffset={offset}
						strokeLinecap="round"
						transform={`rotate(-90 ${size / 2} ${size / 2})`}
					/>
				</Svg>
				<Text style={[styles.aimLabel, { fontSize: labelSize, maxWidth: size - 16 }]} numberOfLines={1}>
					{aim}
				</Text>
			</View>
			<Text style={[styles.percent, { fontSize: percentSize }]}>{`${pct}%`}</Text>
			<Text style={[styles.fraction, { fontSize: fractionSize }]}>{`${hits}/${attempts}`}</Text>
		</View>
	);
}

/** Siatka 3 kolumn: pierścień skuteczności per cel, od najwyższego %. */
const TrainingAimRings = ({ aims }) => {
	const { width } = useWindowDimensions();
	const metrics = useMemo(() => ringMetrics(width), [width]);
	const rows = useMemo(() => {
		const list = Array.isArray(aims)
			? aims.filter((row) => row?.aim && (row.attempts ?? 0) > 0)
			: [];
		return [...list].sort((a, b) => {
			const pa = Number.isFinite(a.percent)
				? a.percent
				: (a.attempts > 0 ? (100 * a.hits) / a.attempts : 0);
			const pb = Number.isFinite(b.percent)
				? b.percent
				: (b.attempts > 0 ? (100 * b.hits) / b.attempts : 0);
			return (pb - pa) || String(a.aim).localeCompare(String(b.aim), 'pl');
		});
	}, [aims]);

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
					metrics={metrics}
				/>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -4,
		marginBottom: 4,
	},
	card: {
		width: '33.33%',
		paddingHorizontal: 4,
		alignItems: 'center',
	},
	ringWrap: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	aimLabel: {
		position: 'absolute',
		color: colors.text,
		fontWeight: '700',
		textAlign: 'center',
	},
	percent: {
		marginTop: 4,
		color: colors.accent,
		fontWeight: '700',
	},
	fraction: {
		marginTop: 1,
		color: colors.textMuted,
		fontWeight: '600',
	},
});

export default TrainingAimRings;
