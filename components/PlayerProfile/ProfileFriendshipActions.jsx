import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { sendFriendInvite } from '../../helpers/friendsApi';
import { actOnFriendInvitation } from '../../helpers/invitationsApi';
import { colors } from '../../theme/colors';

const ProfileFriendshipActions = ({
	friendship,
	userId,
	accessToken,
	onChanged,
}) => {
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

	if (friendship.isFriend || friendship.pendingSent) {
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
				style={[styles.accept, busy && styles.disabled]}
				disabled={busy}
				onPress={() =>
					runAction(() => sendFriendInvite(userId, accessToken), 'Zaproszenie wysłane')
				}
			>
				{busy ? (
					<ActivityIndicator color={colors.accent} size="small" />
				) : (
					<Text style={styles.acceptText}>Dodaj do znajomych</Text>
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
		backgroundColor: colors.accentMuted,
		alignItems: 'center',
		minWidth: 88,
	},
	acceptText: {
		color: colors.accent,
		fontWeight: '600',
		fontSize: 13,
	},
	reject: {
		paddingVertical: 8,
		paddingHorizontal: 12,
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
