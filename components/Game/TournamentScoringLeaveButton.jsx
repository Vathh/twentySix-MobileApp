import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export function TournamentScoringLeaveIcon({ onPress, style }) {
	return (
		<Pressable
			onPress={onPress}
			hitSlop={12}
			style={[styles.button, style]}
			accessibilityRole="button"
			accessibilityLabel="Wyjdź z sędziowania"
		>
			<Ionicons name="arrow-back" size={24} color={colors.accent} />
		</Pressable>
	);
}

/**
 * Wyjście z sędziowania turnieju — `goBack()` odpala confirm + release lock.
 */
export default function TournamentScoringLeaveButton({ style }) {
	const navigation = useNavigation();

	return <TournamentScoringLeaveIcon onPress={() => navigation.goBack()} style={style} />;
}

const styles = StyleSheet.create({
	button: {
		padding: 4,
	},
});
