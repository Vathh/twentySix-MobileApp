import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

const AccountMenuButton = () => {
	const { auth, logout } = useAuth();

	const displayName = auth?.playerName?.trim() || 'Konto';

	const handlePress = () => {
		Alert.alert(displayName, 'Wybierz akcję', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Wyloguj',
				style: 'destructive',
				onPress: () => {
					void logout();
				},
			},
		]);
	};

	return (
		<Pressable style={styles.button} onPress={handlePress}>
			<Text style={styles.text} numberOfLines={1}>
				{displayName}
			</Text>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	button: {
		paddingHorizontal: 8,
		maxWidth: 140,
	},
	text: {
		color: colors.textMuted,
		fontWeight: 'bold',
	},
});

export default AccountMenuButton;
