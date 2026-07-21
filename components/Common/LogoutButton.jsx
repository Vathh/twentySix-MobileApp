import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

const LogoutButton = () => {
	const { logout } = useAuth();

	const handleLogoutBtn = () => {
		Alert.alert('UWAGA', 'Czy na pewno chcesz się wylogować?', [
			{ text: 'NIE', style: 'cancel' },
			{
				text: 'TAK',
				style: 'destructive',
				onPress: () => {
					void logout();
				},
			},
		]);
	};

	return (
		<Pressable style={styles.button} onPress={handleLogoutBtn}>
			<Text style={styles.text}>Wyloguj</Text>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	button: {},
	text: {
		color: colors.textMuted,
		fontWeight: 'bold',
	},
});

export default LogoutButton;
