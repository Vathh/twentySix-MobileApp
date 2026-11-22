import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

/**
 * Wspólny bottom sheet przerwania sesji treningowej.
 */
export default function TrainingAbortSheet({
	visible,
	text,
	confirmLabel = 'Przerwij',
	cancelLabel = 'Anuluj',
	onConfirm,
	onCancel,
}) {
	const sheet = useSharedValue(0);
	const [mounted, setMounted] = React.useState(false);

	useEffect(() => {
		if (visible) {
			setMounted(true);
			sheet.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
			return;
		}
		if (!mounted) {
			return;
		}
		sheet.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) }, (finished) => {
			if (finished) {
				runOnJS(setMounted)(false);
			}
		});
	}, [visible, mounted, sheet]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: (1 - sheet.value) * 120 }],
		opacity: sheet.value,
	}));

	if (!mounted) {
		return null;
	}

	return (
		<Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.sheet, sheetStyle]}>
			<Text style={styles.text}>{text}</Text>
			<View style={styles.row}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={cancelLabel}
					onPress={onCancel}
					style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
				>
					<Text style={styles.secondaryText}>{cancelLabel}</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={confirmLabel}
					onPress={onConfirm}
					style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
				>
					<Text style={styles.primaryText}>{confirmLabel}</Text>
				</Pressable>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	sheet: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 24,
		paddingTop: 18,
		paddingBottom: 28,
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		borderTopWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	text: {
		color: colors.text,
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '600',
		marginBottom: 16,
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
		gap: 10,
	},
	secondary: {
		flex: 1,
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	secondaryText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	primary: {
		flex: 1,
		minHeight: 48,
		borderRadius: 12,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryPressed: {
		backgroundColor: colors.accentHover,
	},
	primaryText: {
		color: colors.onAccent,
		fontSize: 15,
		fontWeight: '700',
	},
});
