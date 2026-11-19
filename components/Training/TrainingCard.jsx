import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { trainingInitials } from '../../helpers/training/trainingInitials';
import { trainingMeta } from '../../helpers/training/trainingMeta';
import { colors } from '../../theme/colors';
import TrainingStar from './TrainingStar';

export default function TrainingCard({ item, onPress, onToggleFavorite, drag, dragging }) {
	const [imageFailed, setImageFailed] = useState(false);
	const showImage = Boolean(item.imageUrl) && !imageFailed;
	const meta = trainingMeta(item);

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={item.name}
			onPress={onPress}
			style={[styles.row, item.inactive && styles.rowInactive, dragging && styles.rowDragging]}
		>
			{showImage ? (
				<Image
					source={{ uri: item.imageUrl }}
					style={styles.mark}
					onError={() => setImageFailed(true)}
				/>
			) : (
				<View style={styles.mark}>
					<Text style={styles.initials}>{trainingInitials(item.name)}</Text>
				</View>
			)}
			<View style={styles.copy}>
				<Text style={styles.name} numberOfLines={1}>
					{item.name}
				</Text>
				{meta ? (
					<Text style={styles.meta} numberOfLines={1}>
						{meta}
					</Text>
				) : null}
				{item.inactive ? <Text style={styles.inactive}>Nieaktywne</Text> : null}
			</View>
			<TrainingStar
				favorite={item.favorite}
				disabled={item.inactive && !item.favorite}
				onPress={onToggleFavorite}
			/>
			{drag ? (
				<Pressable
					accessibilityLabel="Zmień kolejność"
					onLongPress={drag}
					delayLongPress={180}
					hitSlop={8}
					style={styles.handle}
				>
					<Text style={styles.handleText}>≡</Text>
				</Pressable>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: colors.bgElevated,
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 8,
	},
	rowInactive: {
		opacity: 0.72,
	},
	rowDragging: {
		backgroundColor: colors.bgElevatedHover,
	},
	mark: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: colors.accentMuted,
		alignItems: 'center',
		justifyContent: 'center',
	},
	initials: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	copy: {
		flex: 1,
	},
	name: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	meta: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 13,
	},
	inactive: {
		marginTop: 4,
		color: colors.warning,
		fontSize: 12,
		fontWeight: '700',
	},
	handle: {
		paddingLeft: 4,
	},
	handleText: {
		color: colors.textDim,
		fontSize: 20,
		fontWeight: '700',
	},
});
