import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { colors } from '../../theme/colors';

const LogoutButton = () => {
	const { logout } = useAuth();
	const confirm = useConfirm();

	const handleLogoutBtn = async () => {
		const ok = await confirm({
			title: 'Wylogowanie',
			message: 'Czy na pewno chcesz się wylogować?',
			confirmLabel: 'Wyloguj',
		});
		if (ok) {
			void logout();
		}
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
