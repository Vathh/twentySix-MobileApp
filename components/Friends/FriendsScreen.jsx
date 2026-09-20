import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import ScreenLoading from '../Common/ScreenLoading';
import {
	fetchFriends as fetchFriendsRequest,
	fetchSentFriendInvitations,
	removeFriend as removeFriendRequest,
	searchUsers,
	sendFriendInvite,
} from '../../helpers/friendsApi';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

const TAB_LIST = 'list';
const TAB_ADD = 'add';

function initialsFromName(name) {
	const trimmed = String(name || '').trim();
	if (!trimmed) return '?';
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}

function PersonRow({
	name,
	subtitle,
	onPress,
	trailing,
	first = false,
	last = false,
}) {
	return (
		<Pressable
			accessibilityRole={onPress ? 'button' : undefined}
			accessibilityLabel={name}
			disabled={!onPress}
			onPress={onPress}
			style={({ pressed }) => [
				styles.personRow,
				first && styles.personRowFirst,
				last && styles.personRowLast,
				pressed && onPress ? styles.personRowPressed : null,
			]}
		>
			<View style={styles.avatar}>
				<Text style={styles.avatarText}>{initialsFromName(name)}</Text>
			</View>
			<View style={[styles.personBody, !last && styles.personBodyDivider]}>
				<Text style={styles.personName} numberOfLines={1}>
					{name}
				</Text>
				{subtitle ? (
					<Text style={styles.personSubtitle} numberOfLines={1}>
						{subtitle}
					</Text>
				) : null}
			</View>
			{trailing}
		</Pressable>
	);
}

const FriendsScreen = ({ navigation }) => {
	const { auth } = useAuth();
	const confirm = useConfirm();
	const [activeTab, setActiveTab] = useState(TAB_LIST);
	const [friends, setFriends] = useState([]);
	const [sentInvitations, setSentInvitations] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [actionId, setActionId] = useState(null);

	const fetchFriends = useCallback(async () => {
		if (!auth?.accessToken) return;
		try {
			const [friendsRes, sentRes] = await Promise.all([
				fetchFriendsRequest(auth.accessToken),
				fetchSentFriendInvitations(auth.accessToken),
			]);

			setFriends(friendsRes.ok ? (friendsRes.data?.friends ?? []) : []);

			if (sentRes.ok) {
				setSentInvitations(
					(sentRes.data?.invitations ?? []).filter((inv) => inv.status === 'pending'),
				);
			} else {
				setSentInvitations([]);
			}

			setError('');
		} catch (e) {
			setFriends([]);
			setSentInvitations([]);
			setError('Błąd połączenia.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [auth?.accessToken]);

	useEffect(() => {
		fetchFriends();
	}, [fetchFriends]);

	useEffect(() => {
		if (activeTab !== TAB_ADD || searchQuery.trim().length < 2) {
			setSearchResults([]);
			setSearchLoading(false);
			return undefined;
		}

		const timer = setTimeout(async () => {
			setSearchLoading(true);
			try {
				const { ok, data } = await searchUsers(searchQuery.trim(), auth.accessToken);
				setSearchResults(ok ? (data?.users ?? []) : []);
			} catch (e) {
				setSearchResults([]);
			} finally {
				setSearchLoading(false);
			}
		}, 350);

		return () => clearTimeout(timer);
	}, [activeTab, searchQuery, auth?.accessToken]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchFriends();
	};

	const handleInvite = async (receiverId) => {
		if (!auth?.accessToken || actionId) return;
		setActionId(`invite-${receiverId}`);
		try {
			const { ok, data } = await sendFriendInvite(receiverId, auth.accessToken);
			if (ok) {
				Alert.alert('Wysłano', data?.message || 'Zaproszenie zostało wysłane.');
				setSearchResults((prev) => prev.filter((u) => u.id !== receiverId));
				await fetchFriends();
			} else {
				Alert.alert('Błąd', data?.message || 'Nie udało się wysłać zaproszenia.');
			}
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setActionId(null);
		}
	};

	const handleRemoveFriend = async (friend) => {
		const friendId = friend.id ?? friend.playerId;
		const name = friend.name ?? 'znajomego';
		const confirmed = await confirm({
			title: 'Usuń znajomego',
			message: `Usunąć ${name} z listy znajomych?`,
			confirmLabel: 'Usuń',
		});
		if (!confirmed) return;
		if (actionId) return;
		setActionId(`remove-${friendId}`);
		try {
			const { ok, data } = await removeFriendRequest(friendId, auth.accessToken);
			if (ok) {
				setFriends((prev) => prev.filter((f) => (f.id ?? f.playerId) !== friendId));
			} else {
				Alert.alert('Błąd', data?.message || 'Nie udało się usunąć znajomego.');
			}
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setActionId(null);
		}
	};

	const isAlreadyFriend = (userId) =>
		friends.some((f) => (f.id ?? f.playerId) === userId);

	const hasPendingInvite = (userId) =>
		sentInvitations.some((inv) => inv.receiver?.id === userId);

	const openPlayerProfile = (playerId, name) => {
		if (!playerId) return;
		navigation.navigate('PlayerProfile', {
			playerId,
			name: name ?? undefined,
		});
	};

	if (!auth?.accessToken) {
		return (
			<View style={styles.container}>
				<Text style={styles.hint}>Zaloguj się, aby zobaczyć znajomych.</Text>
			</View>
		);
	}

	if (loading) {
		return <ScreenLoading />;
	}

	const queryReady = searchQuery.trim().length >= 2;

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			keyboardShouldPersistTaps="handled"
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
			}
		>
			<View style={styles.form}>
				<View style={styles.segment}>
					<Pressable
						accessibilityRole="button"
						style={[styles.segmentItem, activeTab === TAB_LIST && styles.segmentItemActive]}
						onPress={() => setActiveTab(TAB_LIST)}
					>
						<Text
							style={[
								styles.segmentText,
								activeTab === TAB_LIST && styles.segmentTextActive,
							]}
						>
							Znajomi
						</Text>
						{friends.length > 0 ? (
							<Text
								style={[
									styles.segmentCount,
									activeTab === TAB_LIST && styles.segmentCountActive,
								]}
							>
								{friends.length}
							</Text>
						) : null}
					</Pressable>
					<Pressable
						accessibilityRole="button"
						style={[styles.segmentItem, activeTab === TAB_ADD && styles.segmentItemActive]}
						onPress={() => setActiveTab(TAB_ADD)}
					>
						<Text
							style={[
								styles.segmentText,
								activeTab === TAB_ADD && styles.segmentTextActive,
							]}
						>
							Dodaj
						</Text>
					</Pressable>
				</View>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				{activeTab === TAB_LIST ? (
					<>
						{friends.length === 0 ? (
							<View style={styles.empty}>
								<View style={styles.emptyIcon}>
									<Ionicons name="people-outline" size={scaleSize(26)} color={colors.accent} />
								</View>
								<Text style={styles.emptyTitle}>Brak znajomych</Text>
								<Text style={styles.emptyDescription}>
									W zakładce Dodaj wyszukasz gracza po nicku i wyślesz zaproszenie.
								</Text>
							</View>
						) : (
							<View style={styles.group}>
								{friends.map((f, index) => {
									const name = f.name ?? f.playerName ?? f.player?.name ?? 'Znajomy';
									const key = f.id ?? f.playerId ?? f.player_id;
									const playerId = f.playerId ?? f.player_id;
									const removing = actionId === `remove-${key}`;
									return (
										<PersonRow
											key={String(key)}
											name={name}
											first={index === 0}
											last={index === friends.length - 1}
											onPress={
												playerId ? () => openPlayerProfile(playerId, name) : undefined
											}
											trailing={
												<Pressable
													accessibilityRole="button"
													accessibilityLabel={`Usuń ${name}`}
													hitSlop={10}
													style={styles.iconBtn}
													onPress={() => handleRemoveFriend(f)}
													disabled={!!actionId}
												>
													{removing ? (
														<ActivityIndicator size="small" color={colors.textDim} />
													) : (
														<Ionicons
															name="trash-outline"
															size={scaleSize(18)}
															color={colors.textDim}
														/>
													)}
												</Pressable>
											}
										/>
									);
								})}
							</View>
						)}

						{sentInvitations.length > 0 ? (
							<>
								<Text style={styles.sectionLabel}>Wysłane zaproszenia</Text>
								<View style={styles.group}>
									{sentInvitations.map((inv, index) => {
										const receiverName = inv.receiver?.name ?? 'Gracz';
										const receiverPlayerId =
											inv.receiver?.playerId ?? inv.receiver?.player_id;
										return (
											<PersonRow
												key={inv.id}
												name={receiverName}
												subtitle="Czeka na akceptację"
												first={index === 0}
												last={index === sentInvitations.length - 1}
												onPress={
													receiverPlayerId
														? () => openPlayerProfile(receiverPlayerId, receiverName)
														: undefined
												}
											/>
										);
									})}
								</View>
							</>
						) : null}

						<Pressable
							accessibilityRole="button"
							style={({ pressed }) => [
								styles.navRow,
								pressed && styles.personRowPressed,
							]}
							onPress={() => navigation.navigate('Zaproszenia')}
						>
							<View style={styles.navIcon}>
								<Ionicons name="mail-outline" size={scaleSize(18)} color={colors.accent} />
							</View>
							<Text style={styles.navRowText}>Przychodzące zaproszenia</Text>
							<Ionicons name="chevron-forward" size={scaleSize(16)} color={colors.textDim} />
						</Pressable>
					</>
				) : (
					<>
						<View style={styles.searchWrap}>
							<Ionicons name="search-outline" size={scaleSize(18)} color={colors.textDim} />
							<TextInput
								style={styles.searchInput}
								placeholder="Szukaj gracza…"
								placeholderTextColor={colors.placeholder}
								value={searchQuery}
								onChangeText={setSearchQuery}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							{searchQuery.length > 0 ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Wyczyść"
									hitSlop={8}
									onPress={() => setSearchQuery('')}
								>
									<Ionicons name="close-circle" size={scaleSize(18)} color={colors.textDim} />
								</Pressable>
							) : null}
						</View>

						{!queryReady ? (
							<Text style={styles.hint}>Wpisz nick — minimum 2 znaki.</Text>
						) : null}

						{searchLoading ? (
							<ActivityIndicator color={colors.accent} style={styles.searchSpinner} />
						) : null}

						{!searchLoading && queryReady && searchResults.length === 0 ? (
							<View style={styles.empty}>
								<View style={styles.emptyIcon}>
									<Ionicons name="search-outline" size={scaleSize(26)} color={colors.accent} />
								</View>
								<Text style={styles.emptyTitle}>Brak wyników</Text>
								<Text style={styles.emptyDescription}>
									Nie znaleziono gracza o tej nazwie.
								</Text>
							</View>
						) : null}

						{!searchLoading && searchResults.length > 0 ? (
							<View style={styles.group}>
								{searchResults.map((user, index) => {
									const name = user.name ?? 'Gracz';
									const playerId = user.playerId ?? user.player_id;
									const busy = actionId === `invite-${user.id}`;
									const already = isAlreadyFriend(user.id);
									const pending = hasPendingInvite(user.id);
									const disabled = !!actionId || already || pending;

									let actionLabel = 'Zaproś';
									if (already) actionLabel = 'Znajomy';
									else if (pending) actionLabel = 'Wysłano';
									else if (busy) actionLabel = '…';

									return (
										<PersonRow
											key={String(user.id)}
											name={name}
											subtitle={already ? 'Już na liście' : pending ? 'Zaproszenie wysłane' : null}
											first={index === 0}
											last={index === searchResults.length - 1}
											onPress={
												playerId ? () => openPlayerProfile(playerId, name) : undefined
											}
											trailing={
												already || pending ? (
													<Text style={styles.statusChip}>{actionLabel}</Text>
												) : (
													<Pressable
														accessibilityRole="button"
														accessibilityLabel={`Zaproś ${name}`}
														style={[styles.inviteBtn, disabled && styles.buttonDisabled]}
														onPress={() => handleInvite(user.id)}
														disabled={disabled}
													>
														<Text style={styles.inviteBtnText}>{actionLabel}</Text>
													</Pressable>
												)
											}
										/>
									);
								})}
							</View>
						) : null}
					</>
				)}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
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
	segment: {
		flexDirection: 'row',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		padding: 3,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 2,
	},
	segmentItem: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 8,
		borderRadius: 8,
	},
	segmentItemActive: {
		backgroundColor: colors.accentMuted,
	},
	segmentText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.textMuted,
	},
	segmentTextActive: {
		color: colors.accent,
	},
	segmentCount: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.textDim,
	},
	segmentCountActive: {
		color: colors.accent,
	},
	hint: {
		fontSize: 13,
		lineHeight: 18,
		color: colors.textDim,
		marginBottom: 12,
	},
	error: {
		fontSize: 14,
		color: colors.danger,
		marginBottom: 12,
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
	personRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 12,
		paddingRight: 10,
		minHeight: 56,
		backgroundColor: colors.bgElevated,
		gap: 12,
	},
	personRowFirst: {
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	personRowLast: {
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
	},
	personRowPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	avatarText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.accent,
		letterSpacing: 0.3,
	},
	personBody: {
		flex: 1,
		minWidth: 0,
		paddingVertical: 12,
		paddingRight: 4,
	},
	personBodyDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	personName: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	personSubtitle: {
		marginTop: 2,
		fontSize: 12,
		color: colors.textMuted,
	},
	iconBtn: {
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusChip: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textDim,
		paddingHorizontal: 4,
	},
	inviteBtn: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: colors.accentMuted,
	},
	inviteBtnText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	empty: {
		paddingVertical: 28,
		paddingHorizontal: 16,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
	},
	emptyIcon: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
		marginBottom: 14,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 6,
		textAlign: 'center',
	},
	emptyDescription: {
		fontSize: 13,
		lineHeight: 19,
		color: colors.textMuted,
		textAlign: 'center',
	},
	searchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 12,
		marginBottom: 12,
		minHeight: 44,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 15,
		color: colors.text,
	},
	searchSpinner: {
		marginVertical: 16,
	},
	navRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 22,
		paddingVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 12,
	},
	navIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	navRowText: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
});

export default FriendsScreen;
