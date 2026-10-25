import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

/** Nazwa zalogowanego gracza — skrót do własnego profilu. */
const AccountMenuButton = () => {
	const { auth } = useAuth();
	const navigation = useNavigation();
	const displayName = auth?.playerName?.trim() || 'Konto';

	const openOwnProfile = () => {
		const playerId = auth?.playerId;
		if (!playerId) {
			Alert.alert('Profil', 'Brak powiązanego profilu gracza.');
			return;
		}
		const params = {
			playerId,
			name: auth?.playerName ?? undefined,
		};
		const names = navigation.getState?.()?.routeNames ?? [];
		if (names.includes('PlayerProfile')) {
			navigation.navigate('PlayerProfile', params);
			return;
		}
		const parent = navigation.getParent?.();
		const parentNames = parent?.getState?.()?.routeNames ?? [];
		if (parentNames.includes('Konto')) {
			parent.navigate('Konto', { screen: 'PlayerProfile', params });
			return;
		}
		navigation.navigate('MainTabs', {
			screen: 'Konto',
			params: { screen: 'PlayerProfile', params },
		});
	};

	return (
		<Pressable
			onPress={openOwnProfile}
			accessibilityRole="button"
			accessibilityLabel="Mój profil"
			hitSlop={8}
			style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
		>
			<Text style={styles.text} numberOfLines={1}>
				{displayName}
			</Text>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	wrap: {
		paddingHorizontal: 8,
		maxWidth: 140,
		justifyContent: 'center',
	},
	pressed: {
		opacity: 0.6,
	},
	text: {
		color: colors.textMuted,
		fontWeight: 'bold',
		fontSize: 15,
	},
});

export default AccountMenuButton;
