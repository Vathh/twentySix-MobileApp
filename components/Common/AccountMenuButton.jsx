import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

/** Tylko wyświetlenie nazwy zalogowanego gracza (bez akcji). */
const AccountMenuButton = () => {
	const { auth } = useAuth();
	const displayName = auth?.playerName?.trim() || 'Konto';

	return (
		<View style={styles.wrap}>
			<Text style={styles.text} numberOfLines={1}>
				{displayName}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		paddingHorizontal: 8,
		maxWidth: 140,
	},
	text: {
		color: colors.textMuted,
		fontWeight: 'bold',
		fontSize: 15,
	},
});

export default AccountMenuButton;
