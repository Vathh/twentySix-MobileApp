import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import TrainingStar from './TrainingStar';

/**
 * Segmented control: zakładki / warianty w jednej linii.
 * Opcjonalnie gwiazdka ulubionych przy każdym segmencie (np. warianty ćwiczenia).
 *
 * @param {{
 *   options: Array<{ key: string, label: string }>,
 *   value: string,
 *   onChange: (key: string) => void,
 *   style?: object,
 *   isFavorite?: (key: string) => boolean,
 *   onToggleFavorite?: (key: string) => void,
 *   favoriteDisabled?: boolean,
 * }} props
 */
export default function TrainingSegmentedControl({
	options,
	value,
	onChange,
	style,
	isFavorite,
	onToggleFavorite,
	favoriteDisabled = false,
}) {
	const withFavorites = typeof onToggleFavorite === 'function';

	return (
		<View style={[styles.row, style]}>
			{options.map((option) => {
				const selected = option.key === value;
				if (!withFavorites) {
					return (
						<Pressable
							key={option.key}
							accessibilityRole="button"
							accessibilityLabel={option.label}
							accessibilityState={{ selected }}
							onPress={() => onChange(option.key)}
							style={[styles.segment, selected && styles.segmentOn]}
						>
							<Text style={[styles.label, selected && styles.labelOn]} numberOfLines={1}>
								{option.label}
							</Text>
						</Pressable>
					);
				}
				return (
					<View
						key={option.key}
						style={[styles.segmentWrap, selected && styles.segmentWrapOn]}
					>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={option.label}
							accessibilityState={{ selected }}
							onPress={() => onChange(option.key)}
							style={styles.segmentWithStar}
						>
							<Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
								{option.label}
							</Text>
						</Pressable>
						<TrainingStar
							favorite={Boolean(isFavorite?.(option.key))}
							disabled={favoriteDisabled}
							onPress={() => onToggleFavorite(option.key)}
						/>
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: 6,
		padding: 4,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	segmentWrap: {
		flex: 1,
		minHeight: 40,
		borderRadius: 9,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		gap: 0,
	},
	segmentWrapOn: {
		backgroundColor: colors.accentMuted,
		borderWidth: 1,
		borderColor: colors.accentBorder,
	},
	segment: {
		flex: 1,
		minHeight: 40,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	segmentOn: {
		backgroundColor: colors.accent,
	},
	segmentWithStar: {
		flex: 1,
		minHeight: 36,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 2,
	},
	label: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	labelOn: {
		color: colors.onAccent,
	},
	labelSelected: {
		color: colors.text,
	},
});
