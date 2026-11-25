import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors } from '../../theme/colors';

/**
 * Prosty wykres liniowy punktów { t, value }.
 */
const Sparkline = ({ points, formatValue, stroke }) => {
	const series = (points ?? []).filter((point) => point?.value != null).slice(-20);
	const [size, setSize] = useState({ width: 0, height: 96 });
	if (series.length < 2) {
		return null;
	}
	const values = series.map((point) => Number(point.value));
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const padX = 6;
	const padY = 8;
	const { width: w, height: h } = size;
	const innerW = Math.max(1, w - padX * 2);
	const innerH = Math.max(1, h - padY * 2);
	const dots = values.map((value, index) => ({
		x: padX + (index / (values.length - 1)) * innerW,
		y: padY + innerH - ((value - min) / span) * innerH,
	}));
	const polyline = dots.map((dot) => `${dot.x},${dot.y}`).join(' ');
	const format = formatValue ?? ((value) => String(value));
	const color = stroke || colors.accent;

	return (
		<View>
			<View style={styles.chartRow}>
				<View style={styles.yAxis}>
					<Text style={styles.axisText}>{format(max)}</Text>
					<Text style={styles.axisText}>{format(min)}</Text>
				</View>
				<View
					style={styles.spark}
					onLayout={(event) => {
						const { width, height } = event.nativeEvent.layout;
						if (width !== size.width || height !== size.height) {
							setSize({ width, height });
						}
					}}
				>
					{w > 0 ? (
						<Svg width={w} height={h}>
							<Polyline
								points={polyline}
								fill="none"
								stroke={color}
								strokeWidth={2}
								strokeLinejoin="round"
								strokeLinecap="round"
							/>
							{dots.map((dot, index) => (
								<Circle
									key={`${index}-${values[index]}`}
									cx={dot.x}
									cy={dot.y}
									r={2.5}
									fill={color}
								/>
							))}
						</Svg>
					) : null}
				</View>
			</View>
			<View style={styles.xAxis}>
				<Text style={styles.axisText}>{series[0]?.t || ''}</Text>
				<Text style={styles.axisText}>{series[series.length - 1]?.t || ''}</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	chartRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		gap: 6,
	},
	yAxis: {
		width: 42,
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	xAxis: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginLeft: 48,
		marginTop: 4,
	},
	axisText: {
		fontSize: 10,
		color: colors.textMuted,
	},
	spark: {
		flex: 1,
		height: 96,
	},
});

export default Sparkline;
