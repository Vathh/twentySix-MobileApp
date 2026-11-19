import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function TrainingStar({ favorite, disabled, onPress }) {
	const label = favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych';
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={8}
			disabled={disabled}
			onPress={onPress}
		>
			<Ionicons
				name={favorite ? 'star' : 'star-outline'}
				size={22}
				color={disabled ? colors.textDim : colors.accent}
			/>
		</Pressable>
	);
}
