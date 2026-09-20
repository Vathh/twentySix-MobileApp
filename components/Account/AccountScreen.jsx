import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

function initialsFromName(name) {
	const trimmed = String(name || '').trim();
	if (!trimmed) return '?';
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}

function MenuRow({ icon, title, hint, onPress, last = false, danger = false }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={title}
			onPress={onPress}
			style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
		>
			<View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
				<Ionicons
					name={icon}
					size={scaleSize(18)}
					color={danger ? colors.danger : colors.accent}
				/>
			</View>
			<View style={[styles.rowBody, !last && styles.rowBodyDivider]}>
				<Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
				{hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
			</View>
			{danger ? null : (
				<Ionicons name="chevron-forward" size={scaleSize(16)} color={colors.textDim} />
			)}
		</Pressable>
	);
}

/** Menu konta: profil, gdzie gram, zmiana hasła, wylogowanie. */
const AccountScreen = ({ navigation }) => {
	const { auth, logout } = useAuth();
	const confirm = useConfirm();
	const name = auth?.playerName?.trim() || 'Konto';
	const email = auth?.email?.trim() || null;

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
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.form}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Otwórz profil"
					onPress={openOwnProfile}
					style={({ pressed }) => [styles.identity, pressed && styles.rowPressed]}
				>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{initialsFromName(name)}</Text>
					</View>
					<View style={styles.identityText}>
						<Text style={styles.identityName} numberOfLines={1}>
							{name}
						</Text>
						{email ? (
							<Text style={styles.identityEmail} numberOfLines={1}>
								{email}
							</Text>
						) : (
							<Text style={styles.identityEmail}>Twój profil</Text>
						)}
					</View>
					<Ionicons name="chevron-forward" size={scaleSize(16)} color={colors.textDim} />
				</Pressable>

				<Text style={styles.sectionLabel}>Konto</Text>
				<View style={styles.group}>
					<MenuRow
						icon="flag-outline"
						title="Gdzie gram"
						hint="Sezony, ligi i organizacje"
						onPress={() => navigation.navigate('MyCompetitions')}
					/>
					<MenuRow
						icon="lock-closed-outline"
						title="Zmień hasło"
						last
						onPress={() => navigation.navigate('ChangePassword')}
					/>
				</View>

				<View style={[styles.group, styles.logoutGroup]}>
					<MenuRow
						icon="log-out-outline"
						title="Wyloguj"
						last
						danger
						onPress={confirmLogout}
					/>
				</View>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		flexGrow: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		paddingBottom: 40,
	},
	form: {
		alignItems: 'stretch',
		width: '100%',
		maxWidth: 400,
	},
	identity: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		paddingVertical: 14,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	avatarText: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.accent,
		letterSpacing: 0.4,
	},
	identityText: {
		flex: 1,
		minWidth: 0,
	},
	identityName: {
		fontSize: 17,
		fontWeight: '700',
		color: colors.text,
	},
	identityEmail: {
		marginTop: 3,
		fontSize: 13,
		color: colors.textMuted,
	},
	sectionLabel: {
		marginTop: 22,
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	group: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	logoutGroup: {
		marginTop: 22,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 12,
		paddingRight: 12,
		minHeight: 56,
		gap: 12,
	},
	rowPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	rowIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	rowIconDanger: {
		backgroundColor: colors.dangerMuted,
	},
	rowBody: {
		flex: 1,
		minWidth: 0,
		paddingVertical: 12,
	},
	rowBodyDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	rowTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	rowTitleDanger: {
		color: colors.dangerText,
	},
	rowHint: {
		marginTop: 2,
		fontSize: 12,
		color: colors.textMuted,
	},
});

export default AccountScreen;
