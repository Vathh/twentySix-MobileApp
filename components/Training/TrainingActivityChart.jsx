import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';

const CHART_HEIGHT = 176;
const PAD = { top: 12, right: 12, bottom: 8, left: 34 };

function formatShortDate(iso) {
	if (!iso) {
		return '';
	}
	const parts = String(iso).split('-');
	if (parts.length !== 3) {
		return iso;
	}
	return `${Number(parts[2])}.${Number(parts[1])}`;
}

/** Zaokrągla maksymalną wartość osi Y do czytelnej podziałki. */
function niceYMax(rawMax) {
	const value = Math.max(1, Math.ceil(Number(rawMax) || 1));
	if (value <= 4) {
		return value;
	}
	if (value <= 10) {
		return Math.ceil(value / 2) * 2;
	}
	const step = value <= 20 ? 5 : (value <= 50 ? 10 : 20);
	return Math.ceil(value / step) * step;
}

function yTicks(yMax) {
	if (yMax <= 1) {
		return [0, 1];
	}
	if (yMax <= 3) {
		return Array.from({ length: yMax + 1 }, (_, i) => i);
	}
	const mid = yMax / 2;
	const midLabel = Number.isInteger(mid) ? mid : Math.round(mid * 10) / 10;
	return [0, midLabel, yMax];
}

/**
 * Liniowy wykres dziennej liczby ukończonych ćwiczeń.
 *
 * @param {{ points: Array<{ date: string, count: number }> }} props
 */
export default function TrainingActivityChart({ points }) {
	const [width, setWidth] = useState(0);

	const series = Array.isArray(points) ? points : [];
	const maxCount = Math.max(0, ...series.map((row) => Number(row.count) || 0));
	const yMax = niceYMax(Math.max(1, maxCount));

	const geometry = useMemo(() => {
		if (width <= 0) {
			return null;
		}
		const innerW = Math.max(1, width - PAD.left - PAD.right);
		const innerH = Math.max(1, CHART_HEIGHT - PAD.top - PAD.bottom);
		const n = series.length;
		const yFor = (value) => PAD.top + innerH - (Math.max(0, value) / yMax) * innerH;
		const coords = series.map((row, index) => {
			const x = PAD.left + (n <= 1 ? innerW / 2 : (index / (n - 1)) * innerW);
			const value = Math.max(0, Number(row.count) || 0);
			return { x, y: yFor(value), value, date: row.date };
		});
		const line = coords.map((p) => `${p.x},${p.y}`).join(' ');
		const area = coords.length > 0
			? [
				`M ${coords[0].x} ${PAD.top + innerH}`,
				...coords.map((p) => `L ${p.x} ${p.y}`),
				`L ${coords[coords.length - 1].x} ${PAD.top + innerH}`,
				'Z',
			].join(' ')
			: '';
		const ticks = yTicks(yMax).map((value) => ({
			value,
			y: yFor(value),
		}));
		const labels = n === 0
			? []
			: [
				formatShortDate(coords[0].date),
				formatShortDate(coords[Math.floor((n - 1) / 2)].date),
				formatShortDate(coords[n - 1].date),
			];
		return {
			coords,
			line,
			area,
			ticks,
			labels,
			axisBottom: PAD.top + innerH,
			axisTop: PAD.top,
		};
	}, [series, width, yMax]);

	const total = series.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
	const activeDays = series.filter((row) => (Number(row.count) || 0) > 0).length;

	if (series.length === 0) {
		return <Text style={styles.empty}>Brak danych aktywności.</Text>;
	}

	return (
		<View
			style={styles.wrap}
			onLayout={(event) => {
				const next = Math.floor(event.nativeEvent.layout.width);
				if (next > 0 && next !== width) {
					setWidth(next);
				}
			}}
		>
			{width > 0 && geometry ? (
				<>
					<Svg width={width} height={CHART_HEIGHT}>
						{/* oś Y + podziałka */}
						<Line
							x1={PAD.left}
							y1={geometry.axisTop}
							x2={PAD.left}
							y2={geometry.axisBottom}
							stroke={colors.borderStrong}
							strokeWidth={1.5}
						/>
						{geometry.ticks.map((tick) => (
							<React.Fragment key={`tick-${tick.value}`}>
								<Line
									x1={PAD.left - 4}
									y1={tick.y}
									x2={width - PAD.right}
									y2={tick.y}
									stroke={colors.border}
									strokeWidth={1}
									strokeDasharray={tick.value === 0 ? undefined : '4 6'}
								/>
								<Line
									x1={PAD.left - 4}
									y1={tick.y}
									x2={PAD.left}
									y2={tick.y}
									stroke={colors.borderStrong}
									strokeWidth={1.5}
								/>
								<SvgText
									x={PAD.left - 8}
									y={tick.y + 3.5}
									fill={colors.textMuted}
									fontSize="11"
									fontWeight="700"
									textAnchor="end"
								>
									{String(tick.value)}
								</SvgText>
							</React.Fragment>
						))}
						{geometry.area ? (
							<Path d={geometry.area} fill={colors.accentMuted} />
						) : null}
						{geometry.line ? (
							<Polyline
								points={geometry.line}
								fill="none"
								stroke={colors.accent}
								strokeWidth={2.5}
								strokeLinejoin="round"
								strokeLinecap="round"
							/>
						) : null}
						{geometry.coords
							.filter((p) => p.value > 0)
							.map((p) => (
								<Circle
									key={p.date}
									cx={p.x}
									cy={p.y}
									r={3}
									fill={colors.accent}
								/>
							))}
					</Svg>
					<View style={styles.xLabels}>
						<Text style={[styles.xLabel, styles.xLabelStart]}>{geometry.labels[0]}</Text>
						<Text style={[styles.xLabel, styles.xLabelMid]}>{geometry.labels[1]}</Text>
						<Text style={[styles.xLabel, styles.xLabelEnd]}>{geometry.labels[2]}</Text>
					</View>
				</>
			) : (
				<View style={{ height: CHART_HEIGHT }} />
			)}
			<View style={styles.footer}>
				<View style={styles.footerItem}>
					<Text style={styles.footerValue}>{total}</Text>
					<Text style={styles.footerLabel}>ćwiczeń</Text>
				</View>
				<View style={styles.footerItem}>
					<Text style={styles.footerValue}>{activeDays}</Text>
					<Text style={styles.footerLabel}>dni z treningiem</Text>
				</View>
				<View style={styles.footerItem}>
					<Text style={styles.footerValue}>
						{series.length > 0 ? (Math.round((10 * total) / series.length) / 10) : 0}
					</Text>
					<Text style={styles.footerLabel}>śr. / dzień</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
	},
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
	},
	xLabels: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingLeft: PAD.left,
		paddingRight: PAD.right,
		marginTop: 4,
		marginBottom: 10,
	},
	xLabel: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '600',
		flex: 1,
	},
	xLabelStart: {
		textAlign: 'left',
	},
	xLabelMid: {
		textAlign: 'center',
	},
	xLabelEnd: {
		textAlign: 'right',
	},
	footer: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 4,
	},
	footerItem: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderRadius: 12,
		backgroundColor: colors.bg,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
	},
	footerValue: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '800',
	},
	footerLabel: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
	},
});
