import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

export function TournamentScoringLeaveIcon({ onPress, style }) {
	return (
		<Pressable
			onPress={onPress}
			hitSlop={scaleSize(12)}
			style={[styles.button, style]}
			accessibilityRole="button"
			accessibilityLabel="Wyjdź z sędziowania"
		>
			<Ionicons name="arrow-back" size={scaleSize(24)} color={colors.accent} />
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

/**
 * Lista meczów tabletu — stack nie ma wstecz, więc strzałka wylogowuje do menu głównego.
 */
export function TournamentRefereeExitButton({ style }) {
	const { logout } = useAuth();
	const confirm = useConfirm();

	const onPress = async () => {
		const ok = await confirm({
			title: 'Wyjdź z sędziowania?',
			message: 'Wrócisz do menu głównego. Żeby sędziować dalej, użyj ponownie kodu albo QR.',
			cancelLabel: 'Zostań',
			confirmLabel: 'Wyjdź',
		});
		if (ok) {
			void logout();
		}
	};

	return <TournamentScoringLeaveIcon onPress={onPress} style={style} />;
}

const styles = StyleSheet.create({
	button: {
		padding: 4,
	},
});
