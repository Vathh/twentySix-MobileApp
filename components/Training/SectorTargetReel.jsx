import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { targetLabel } from '../../helpers/training/clockExercise';
import { colors } from '../../theme/colors';

const GAP = 12;
const CELL = 112;
const RADIUS = 16;
const SLIDE = { duration: 420, easing: Easing.inOut(Easing.cubic) };

/** Obrys kafelka: ten sam promień, a górna i dolna krawędź schodzą do środka. */
function AimFrame({ width, height }) {
	const stroke = 2.5;
	const inset = stroke / 2;
	const radius = RADIUS - inset;
	const left = inset;
	const top = inset;
	const right = width - inset;
	const bottom = height - inset;
	const cx = width / 2;
	const notch = 8;
	const depth = 7;
	const path = [
		`M ${left + radius} ${top}`,
		`H ${cx - notch}`,
		`L ${cx} ${top + depth}`,
		`L ${cx + notch} ${top}`,
		`H ${right - radius}`,
		`A ${radius} ${radius} 0 0 1 ${right} ${top + radius}`,
		`V ${bottom - radius}`,
		`A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
		`H ${cx + notch}`,
		`L ${cx} ${bottom - depth}`,
		`L ${cx - notch} ${bottom}`,
		`H ${left + radius}`,
		`A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius}`,
		`V ${top + radius}`,
		`A ${radius} ${radius} 0 0 1 ${left + radius} ${top}`,
		'Z',
	].join(' ');
	return (
		<Svg width={width} height={height}>
			<Path
				d={path}
				stroke={colors.accent}
				strokeWidth={stroke}
				fill="none"
				strokeLinejoin="miter"
			/>
		</Svg>
	);
}

function resolveLabel(target, formatLabel, doubles) {
	if (typeof formatLabel === 'function') {
		return formatLabel(target);
	}
	return targetLabel(target, { doubles });
}

function targetKey(target, index) {
	if (typeof target === 'string' || typeof target === 'number') {
		return `${index}-${target}`;
	}
	if (target?.kind === 'bull') {
		return `${index}-bull`;
	}
	if (target?.label != null) {
		return `${index}-${target.label}`;
	}
	return `${index}-${target?.kind ?? 't'}-${target?.number ?? 'x'}`;
}

/** D1–D20 mieszczą się dużą czcionką; „Czerwony środek” potrzebuje mniejszej. */
function labelTextStyle(label) {
	const length = String(label || '').length;
	if (length <= 3) {
		return null;
	}
	if (length <= 4) {
		return styles.textMedium;
	}
	return styles.textLong;
}

/**
 * Trzy cele na raz. Ramka sunie między nimi, a po podejściu pasek zjeżdża w karuzeli.
 * targets: obiekty clock ({ kind, number }) albo stringi etykiet (Shanghai / Doubles).
 */
const SectorTargetReel = ({
	targets,
	windowStart,
	activeOffset,
	doubles = false,
	formatLabel,
}) => {
	const [width, setWidth] = useState(0);
	const step = useSharedValue(0);
	const shift = useSharedValue(windowStart);
	const focus = useSharedValue(activeOffset);
	const seen = useRef(false);

	useEffect(() => {
		if (!seen.current) {
			seen.current = true;
			shift.value = windowStart;
			focus.value = activeOffset;
			return;
		}
		shift.value = withTiming(windowStart, SLIDE);
		focus.value = withTiming(activeOffset, SLIDE);
	}, [windowStart, activeOffset, shift, focus]);

	const rowStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: -shift.value * step.value }],
	}));
	const frameStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: focus.value * step.value }],
	}));

	const cellWidth = width > 0 ? ((width + GAP) / 3) - GAP : 0;
	const aimed = windowStart + activeOffset;

	return (
		<View
			style={styles.reel}
			onLayout={(event) => {
				const next = event.nativeEvent.layout.width;
				if (next > 0 && next !== width) {
					setWidth(next);
					step.value = (next + GAP) / 3;
				}
			}}
		>
			<View style={styles.clip}>
				<Animated.View style={[styles.row, rowStyle]}>
					{width > 0 ? targets.map((target, index) => {
						const label = resolveLabel(target, formatLabel, doubles);
						const selected = index === aimed;
						const shown = index >= windowStart && index < windowStart + 3;
						const isBull = target?.kind === 'bull'
							|| label === 'Bull'
							|| label === 'Czerwony środek';
						return (
							<View
								key={targetKey(target, index)}
								accessibilityRole="text"
								accessibilityLabel={isBull ? label || 'Bull' : `Sektor ${label}`}
								accessibilityState={{ selected }}
								accessibilityElementsHidden={!shown}
								importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
								style={[styles.cell, { width: cellWidth }]}
							>
								<Text style={[styles.text, labelTextStyle(label)]}>
									{label}
								</Text>
							</View>
						);
					}) : null}
				</Animated.View>
			</View>
			{cellWidth > 0 ? (
				<Animated.View
					pointerEvents="none"
					style={[styles.frame, { width: cellWidth }, frameStyle]}
				>
					<AimFrame width={cellWidth} height={CELL} />
				</Animated.View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	reel: {
		width: '100%',
		alignSelf: 'stretch',
		height: CELL,
		marginBottom: 16,
	},
	clip: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		height: CELL,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		height: CELL,
	},
	cell: {
		height: CELL,
		marginRight: GAP,
		borderRadius: 16,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	text: {
		color: colors.text,
		fontSize: 40,
		fontWeight: '700',
		textAlign: 'center',
	},
	textMedium: {
		fontSize: 34,
		textAlign: 'center',
	},
	textLong: {
		fontSize: 15,
		lineHeight: 18,
		textAlign: 'center',
	},
	frame: {
		position: 'absolute',
		left: 0,
		top: 0,
		height: CELL,
	},
});

export default SectorTargetReel;
