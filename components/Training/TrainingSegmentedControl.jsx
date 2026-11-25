import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import TrainingStar from './TrainingStar';

/**
 * Segmented control: zakładki / warianty.
 * wrap + fullWidthKeys: długie etykiety (np. 20/19/18) na osobnej linii.
 *
 * @param {{
 *   options: Array<{ key: string, label: string }>,
 *   value: string,
 *   onChange: (key: string) => void,
 *   style?: object,
 *   wrap?: boolean,
 *   fullWidthKeys?: string[],
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
	wrap = false,
	fullWidthKeys = [],
	isFavorite,
	onToggleFavorite,
	favoriteDisabled = false,
}) {
	const withFavorites = typeof onToggleFavorite === 'function';
	const fullWidth = new Set(fullWidthKeys);

	return (
		<View style={[styles.row, wrap && styles.rowWrap, style]}>
			{options.map((option) => {
				const selected = option.key === value;
				const stretch = wrap && fullWidth.has(option.key);
				if (!withFavorites) {
					return (
						<Pressable
							key={option.key}
							accessibilityRole="button"
							accessibilityLabel={option.label}
							accessibilityState={{ selected }}
							onPress={() => onChange(option.key)}
							android_ripple={{ color: colors.accentBorder, borderless: false }}
							style={[
								styles.segment,
								selected && styles.segmentOn,
								wrap && styles.segmentWrapGrow,
								stretch && styles.segmentFull,
							]}
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
						style={[
							styles.segmentWrap,
							selected && styles.segmentWrapOn,
							wrap && styles.segmentWrapGrow,
							stretch && styles.segmentFull,
						]}
					>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={option.label}
							accessibilityState={{ selected }}
							onPress={() => onChange(option.key)}
							android_ripple={{ color: colors.accentBorder, borderless: false }}
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
	rowWrap: {
		flexWrap: 'wrap',
	},
	segmentWrap: {
		flex: 1,
		minHeight: 40,
		borderRadius: 9,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'transparent',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		gap: 0,
	},
	segmentWrapGrow: {
		flexGrow: 1,
		flexBasis: 0,
		minWidth: '22%',
	},
	segmentFull: {
		// Nowa linia na pełną szerokość treści (bez minWidth 100% —
		// w padded rodzicu to wychodziło w prawo poza kafelek).
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: '100%',
		maxWidth: '100%',
		alignSelf: 'stretch',
		minWidth: 0,
	},
	segmentWrapOn: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	segment: {
		flex: 1,
		minHeight: 40,
		borderRadius: 9,
		overflow: 'hidden',
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
