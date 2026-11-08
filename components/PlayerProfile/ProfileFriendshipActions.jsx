import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConfirm } from '../../context/ConfirmProvider';
import { removeFriend, sendFriendInvite } from '../../helpers/friendsApi';
import { actOnFriendInvitation } from '../../helpers/invitationsApi';
import { colors } from '../../theme/colors';

const ProfileFriendshipActions = ({
	friendship,
	userId,
	playerName,
	accessToken,
	onChanged,
}) => {
	const confirm = useConfirm();
	const [busy, setBusy] = useState(false);

	if (!friendship || friendship.isSelf) {
		return null;
	}

	const runAction = async (request, okLabel) => {
		if (busy) return;
		setBusy(true);
		try {
			const { ok, data } = await request();
			if (!ok) {
				Alert.alert('Błąd', data?.message || 'Nie udało się wykonać akcji.');
				return;
			}
			if (okLabel) {
				Alert.alert('OK', data?.message || okLabel);
			}
			onChanged?.();
		} catch {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setBusy(false);
		}
	};

	if (friendship.isFriend && userId) {
		const remove = async () => {
			if (busy) return;
			const accepted = await confirm({
				title: 'Usuń znajomego',
				message: `Usunąć ${playerName || 'tę osobę'} ze znajomych?`,
				confirmLabel: 'Usuń',
			});
			if (!accepted) return;
			await runAction(() => removeFriend(userId, accessToken));
		};

		return (
			<Pressable
				style={[styles.remove, busy && styles.disabled]}
				disabled={busy}
				onPress={remove}
				accessibilityRole="button"
			>
				{busy ? (
					<ActivityIndicator color={colors.danger} size="small" />
				) : (
					<View style={styles.inviteContent}>
						<Ionicons name="person-remove-outline" size={16} color={colors.danger} />
						<Text style={styles.removeText}>Usuń znajomego</Text>
					</View>
				)}
			</Pressable>
		);
	}

	if (friendship.pendingSent) {
		return null;
	}

	if (friendship.pendingReceived?.id) {
		return (
			<View style={styles.row}>
				<Pressable
					style={[styles.accept, busy && styles.disabled]}
					disabled={busy}
					onPress={() =>
						runAction(
							() => actOnFriendInvitation(friendship.pendingReceived.id, 'accept', accessToken),
							'Zaproszenie zaakceptowane',
						)
					}
				>
					{busy ? (
						<ActivityIndicator color={colors.accent} size="small" />
					) : (
						<Text style={styles.acceptText}>Akceptuj</Text>
					)}
				</Pressable>
				<Pressable
					style={[styles.reject, busy && styles.disabled]}
					disabled={busy}
					onPress={() =>
						runAction(
							() => actOnFriendInvitation(friendship.pendingReceived.id, 'reject', accessToken),
							'Zaproszenie odrzucone',
						)
					}
				>
					<Text style={styles.rejectText}>Odrzuć</Text>
				</Pressable>
			</View>
		);
	}

	if (friendship.canInvite && userId) {
		return (
			<Pressable
				style={[styles.invite, busy && styles.disabled]}
				disabled={busy}
				onPress={() =>
					runAction(() => sendFriendInvite(userId, accessToken), 'Zaproszenie wysłane')
				}
			>
				{busy ? (
					<ActivityIndicator color={colors.success} size="small" />
				) : (
					<View style={styles.inviteContent}>
						<Ionicons name="person-add-outline" size={16} color={colors.success} />
						<Text style={styles.inviteText}>Dodaj do znajomych</Text>
					</View>
				)}
			</Pressable>
		);
	}

	return null;
};

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	accept: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.accent,
		backgroundColor: 'transparent',
		alignItems: 'center',
		minWidth: 88,
	},
	acceptText: {
		color: colors.accent,
		fontWeight: '600',
		fontSize: 13,
	},
	invite: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.success,
		backgroundColor: 'transparent',
	},
	inviteContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	inviteText: {
		color: colors.success,
		fontWeight: '600',
		fontSize: 13,
	},
	remove: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: colors.danger,
	},
	removeText: {
		color: colors.danger,
		fontWeight: '600',
		fontSize: 13,
	},
	reject: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: 'transparent',
		alignItems: 'center',
	},
	rejectText: {
		color: colors.textDim,
		fontWeight: '600',
		fontSize: 13,
	},
	disabled: {
		opacity: 0.6,
	},
});

export default ProfileFriendshipActions;
