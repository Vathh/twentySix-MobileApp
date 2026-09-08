import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { colors } from '../../theme/colors';

/** Menu konta: gdzie gram, profil, zmiana hasła, wylogowanie. */
const AccountScreen = ({ navigation }) => {
	const { auth, logout } = useAuth();
	const confirm = useConfirm();

	const openOwnProfile = () => {
		const playerId = auth?.playerId;
		if (!playerId) {
			Alert.alert('Profil', 'Brak powiązanego profilu gracza.');
			return;
		}
		navigation.navigate('PlayerProfile', {
			playerId,
			name: auth?.playerName ?? undefined,
		});
	};

	const confirmLogout = async () => {
		const ok = await confirm({
			title: 'Wylogowanie',
			message: 'Na pewno chcesz się wylogować?',
			confirmLabel: 'Wyloguj',
		});
		if (ok) {
			void logout();
		}
	};

	return (
		<View style={styles.container}>
			<Pressable
				style={styles.item}
				onPress={() => navigation.navigate('MyCompetitions')}
			>
				<Text style={styles.itemText}>Gdzie gram</Text>
			</Pressable>
			<Pressable style={styles.item} onPress={openOwnProfile}>
				<Text style={styles.itemText}>Profil</Text>
			</Pressable>
			<Pressable
				style={styles.item}
				onPress={() => navigation.navigate('ChangePassword')}
			>
				<Text style={styles.itemText}>Zmień hasło</Text>
			</Pressable>
			<Pressable style={[styles.item, styles.itemDanger]} onPress={confirmLogout}>
				<Text style={styles.itemTextDanger}>Wyloguj</Text>
			</Pressable>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
		padding: 24,
	},
	item: {
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.border,
	},
	itemDanger: {
		borderColor: colors.danger,
		backgroundColor: colors.dangerMuted,
	},
	itemText: {
		fontSize: 16,
		color: colors.text,
		fontWeight: '600',
	},
	itemTextDanger: {
		fontSize: 16,
		color: colors.dangerText,
		fontWeight: '600',
	},
});

export default AccountScreen;
