import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { boardOrderKey } from '../../helpers/training/sectorAimGroups';
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
						rotation={-90}
						origin={`${size / 2}, ${size / 2}`}
					/>
				</Svg>
				<Text style={[styles.aimLabel, { fontSize: labelSize }]} numberOfLines={1}>
					{aim}
				</Text>
			</View>
			<Text style={[styles.percent, { fontSize: percentSize }]}>{`${pct}%`}</Text>
			<Text style={[styles.fraction, { fontSize: fractionSize }]}>{`${hits}/${attempts}`}</Text>
		</View>
	);
}

function sortRows(list, sortBy) {
	if (sortBy === 'board') {
		return [...list].sort((a, b) => {
			const order = boardOrderKey(a.aim) - boardOrderKey(b.aim);
			if (order !== 0) {
				return order;
			}
			return String(a.aim).localeCompare(String(b.aim), 'pl');
		});
	}
	return [...list].sort((a, b) => {
		const pa = Number.isFinite(a.percent)
			? a.percent
			: (a.attempts > 0 ? (100 * a.hits) / a.attempts : 0);
		const pb = Number.isFinite(b.percent)
			? b.percent
			: (b.attempts > 0 ? (100 * b.hits) / b.attempts : 0);
		return (pb - pa) || String(a.aim).localeCompare(String(b.aim), 'pl');
	});
}

/**
 * Siatka pierścieni skuteczności.
 *
 * @param {{
 *   aims: Array<{ aim: string, attempts: number, hits: number, percent?: number }>,
 *   title?: string,
 *   defaultOpen?: boolean,
 *   collapsible?: boolean,
 *   sortBy?: 'percent' | 'board',
 * }} props
 */
const TrainingAimRings = ({
	aims,
	title = 'Skuteczność',
	defaultOpen = false,
	collapsible = true,
	sortBy = 'percent',
}) => {
	const { width } = useWindowDimensions();
	const metrics = useMemo(() => ringMetrics(width), [width]);
	const [open, setOpen] = useState(defaultOpen || !collapsible);
	const rows = useMemo(() => {
		const list = Array.isArray(aims)
			? aims.filter((row) => row?.aim && (row.attempts ?? 0) > 0)
			: [];
		return sortRows(list, sortBy);
	}, [aims, sortBy]);

	if (rows.length === 0) {
		return null;
	}

	const showGrid = !collapsible || open;

	return (
		<View style={styles.section}>
			{collapsible ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={open ? `Zwiń: ${title}` : `Rozwiń: ${title}`}
					accessibilityState={{ expanded: open }}
					onPress={() => setOpen((prev) => !prev)}
					style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
				>
					<Text style={styles.toggleLabel}>{title}</Text>
					<Text style={styles.toggleChevron}>{open ? '▴' : '▾'}</Text>
				</Pressable>
			) : title ? (
				<Text style={styles.staticTitle}>{title}</Text>
			) : null}
			{showGrid ? (
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
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	section: {
		width: '100%',
		marginBottom: 8,
	},
	toggle: {
		minHeight: 44,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
	},
	togglePressed: {
		opacity: 0.85,
	},
	toggleLabel: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	toggleChevron: {
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
	},
	staticTitle: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 8,
	},
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
