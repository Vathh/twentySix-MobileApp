import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Pasek czasu sesji treningowej. Opcjonalny play/pause jak w odtwarzaczu.
 */
export default function TrainingPlayTimer({
	label = 'Zostało',
	value,
	progress = 0,
	urgent = false,
	compact = false,
	paused = false,
	onTogglePause = null,
}) {
	const showPause = typeof onTogglePause === 'function';

	return (
		<View
			style={[styles.bar, compact && styles.barCompact]}
			accessibilityRole="text"
			accessibilityLabel={`${label} ${value}${paused ? ', pauza' : ''}`}
		>
			<Text style={[styles.caption, compact && styles.captionCompact]}>{label}</Text>
			<View style={styles.valueRow}>
				<Text style={[
					styles.value,
					compact && styles.valueCompact,
					urgent && styles.valueUrgent,
					showPause && styles.valueWithPause,
				]}
				>
					{value}
				</Text>
				{showPause ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={paused ? 'Wznów' : 'Pauza'}
						onPress={onTogglePause}
						hitSlop={10}
						style={({ pressed }) => [
							styles.pauseBtn,
							pressed && styles.pauseBtnPressed,
						]}
					>
						<Ionicons
							name={paused ? 'play' : 'pause'}
							size={scaleSize(compact ? 20 : 22)}
							color={colors.text}
						/>
					</Pressable>
				) : null}
			</View>
			<View style={styles.track}>
				<View
					style={[
						styles.fill,
						urgent && styles.fillUrgent,
						{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
					]}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 14,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	barCompact: {
		paddingTop: 8,
		paddingBottom: 10,
		backgroundColor: colors.bg,
	},
	caption: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	captionCompact: {
		fontSize: 13,
	},
	valueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
		marginBottom: 10,
		minHeight: 38,
	},
	value: {
		color: colors.text,
		fontSize: 32,
		lineHeight: 38,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
		textAlign: 'center',
		letterSpacing: -0.4,
	},
	valueWithPause: {
		marginRight: 10,
	},
	valueCompact: {
		fontSize: 28,
		lineHeight: 34,
	},
	valueUrgent: {
		color: colors.warning,
	},
	pauseBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.borderStrong,
	},
	pauseBtnPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	track: {
		alignSelf: 'stretch',
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	fill: {
		height: '100%',
		borderRadius: 4,
		backgroundColor: colors.accent,
	},
	fillUrgent: {
		backgroundColor: colors.warning,
	},
});
