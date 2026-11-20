import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CHECKOUT_41_FIRST } from '../../helpers/training/checkout41Exercise';
import { colors } from '../../theme/colors';

const GAP = 12;
const CELL = 112;
const RADIUS = 16;
const SLIDE = { duration: 420, easing: Easing.inOut(Easing.cubic) };

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

/** Trzy wartości checkoutu. Ramka stoi na środku, karuzela sunie po sukcesie / porażce. */
export default function Checkout41Reel({ checkout }) {
	const [width, setWidth] = useState(0);
	const step = useSharedValue(0);
	const shift = useSharedValue(0);
	const seen = useRef(false);
	const safe = Number.isInteger(checkout) && checkout >= CHECKOUT_41_FIRST
		? checkout
		: CHECKOUT_41_FIRST;
	const centerIndex = safe - CHECKOUT_41_FIRST + 1;
	const windowStart = centerIndex - 1;
	const maxValue = safe + 1;
	const values = [null];
	for (let value = CHECKOUT_41_FIRST; value <= maxValue; value += 1) {
		values.push(value);
	}

	useEffect(() => {
		if (!seen.current) {
			seen.current = true;
			shift.value = windowStart;
			return;
		}
		shift.value = withTiming(windowStart, SLIDE);
	}, [windowStart, shift]);

	const rowStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: -shift.value * step.value }],
	}));

	const cellWidth = width > 0 ? ((width + GAP) / 3) - GAP : 0;

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
					{width > 0 ? values.map((value, index) => {
						const selected = index === centerIndex;
						const shown = index >= windowStart && index < windowStart + 3;
						const label = value == null ? '' : String(value);
						return (
							<View
								key={value == null ? 'edge' : `c-${value}`}
								accessibilityRole="text"
								accessibilityLabel={value == null ? 'Brak' : `Checkout ${value}`}
								accessibilityState={{ selected }}
								accessibilityElementsHidden={!shown}
								importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
								style={[styles.cell, { width: cellWidth }]}
							>
								{label ? (
									<Text style={[styles.text, label.length > 2 && styles.textLong]}>
										{label}
									</Text>
								) : null}
							</View>
						);
					}) : null}
				</Animated.View>
			</View>
			{cellWidth > 0 ? (
				<View pointerEvents="none" style={[styles.frame, { width: cellWidth, left: cellWidth + GAP }]}>
					<AimFrame width={cellWidth} height={CELL} />
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	reel: {
		height: CELL,
		marginBottom: 8,
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
	},
	text: {
		color: colors.text,
		fontSize: 40,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	textLong: {
		fontSize: 28,
	},
	frame: {
		position: 'absolute',
		top: 0,
		height: CELL,
	},
});
