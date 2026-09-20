import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import ScreenLoading from '../Common/ScreenLoading';
import {
	actOnFriendInvitation,
	actOnLeagueMembershipInvitation,
	actOnOrganizationInvitation,
	actOnSeasonInvitation,
	actOnTournamentInvitation,
	fetchFriendInvitationsReceived,
	fetchLeagueMembershipInvitationsReceived,
	fetchOrganizationInvitationsReceived,
	fetchQuickGameLobbyInvitations,
	fetchSeasonInvitationsReceived,
	fetchTournamentInvitationsReceived,
	joinQuickGameLobby,
	rejectQuickGameLobbyInvitation,
} from '../../helpers/invitationsApi';
import {
	acceptLeagueGameLobby,
	fetchLeagueGameInvitations,
	rejectLeagueGameLobby,
} from '../../helpers/leagueGamesApi';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

const TAB_GRA = 'gra';
const TAB_FRIENDS = 'friends';

function resolveInitialTab(route) {
	return route?.params?.tab === TAB_FRIENDS ? TAB_FRIENDS : TAB_GRA;
}

function initialsFromName(name) {
	const trimmed = String(name || '').trim();
	if (!trimmed) return '?';
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}
	return trimmed.slice(0, 2).toUpperCase();
}

function membershipKindLabel(kind) {
	if (kind === 'season') return 'Sezon';
	if (kind === 'league') return 'Liga';
	return 'Organizacja';
}

function membershipIcon(kind) {
	if (kind === 'season') return 'calendar-outline';
	if (kind === 'league') return 'layers-outline';
	return 'business-outline';
}

function ActionChip({ label, onPress, disabled, busy, variant = 'accept' }) {
	const isReject = variant === 'reject';
	const isDanger = variant === 'danger';

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			disabled={disabled || busy}
			style={[
				variant === 'accept' && styles.acceptChip,
				isReject && styles.rejectChip,
				isDanger && styles.dangerChip,
				(disabled || busy) && styles.buttonDisabled,
			]}
		>
			{busy ? (
				<ActivityIndicator
					size="small"
					color={isDanger ? colors.danger : colors.accent}
				/>
			) : (
				<Text
					style={[
						styles.acceptChipText,
						isReject && styles.rejectChipText,
						isDanger && styles.dangerChipText,
					]}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
}

function InviteRow({
	icon,
	avatarName,
	title,
	subtitle,
	onPress,
	actions,
	first = false,
	last = false,
}) {
	const media = avatarName ? (
		<View style={styles.avatar}>
			<Text style={styles.avatarText}>{initialsFromName(avatarName)}</Text>
		</View>
	) : (
		<View style={styles.typeIcon}>
			<Ionicons name={icon} size={scaleSize(18)} color={colors.accent} />
		</View>
	);

	const main = (
		<>
			{media}
			<View style={styles.textCol}>
				<Text style={styles.rowTitle} numberOfLines={2}>
					{title}
				</Text>
				{subtitle ? (
					<Text style={styles.rowSubtitle} numberOfLines={2}>
						{subtitle}
					</Text>
				) : null}
			</View>
		</>
	);

	return (
		<View
			style={[
				styles.row,
				first && styles.rowFirst,
				last && styles.rowLast,
			]}
		>
			{onPress ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={title}
					style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
					onPress={onPress}
				>
					{main}
				</Pressable>
			) : (
				<View style={styles.rowMain}>{main}</View>
			)}
			{actions ? <View style={styles.actions}>{actions}</View> : null}
			{!last ? <View pointerEvents="none" style={styles.rowDivider} /> : null}
		</View>
	);
}

function InviteGroup({ children }) {
	return <View style={styles.group}>{children}</View>;
}

function EmptyState({ icon, title, description }) {
	return (
		<View style={styles.empty}>
			<View style={styles.emptyIcon}>
				<Ionicons name={icon} size={scaleSize(26)} color={colors.accent} />
			</View>
			<Text style={styles.emptyTitle}>{title}</Text>
			<Text style={styles.emptyDescription}>{description}</Text>
		</View>
	);
}

const InvitationsScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const [activeTab, setActiveTab] = useState(() => resolveInitialTab(route));
	const [tournamentInvitations, setTournamentInvitations] = useState([]);
	const [membershipInvitations, setMembershipInvitations] = useState([]);
	const [lobbyInvitations, setLobbyInvitations] = useState([]);
	const [friendInvitations, setFriendInvitations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [actionId, setActionId] = useState(null);

	useEffect(() => {
		setActiveTab(resolveInitialTab(route));
	}, [route?.params?.tab]);

	const fetchSeqRef = useRef(0);

	const fetchAll = useCallback(async () => {
		if (!auth?.accessToken) return;
		const seq = ++fetchSeqRef.current;
		try {
			const [
				tournamentRes,
				organizationRes,
				seasonRes,
				leagueMembershipRes,
				lobbyRes,
				leagueRes,
				friendsRes,
			] = await Promise.all([
				fetchTournamentInvitationsReceived(auth.accessToken),
				fetchOrganizationInvitationsReceived(auth.accessToken),
				fetchSeasonInvitationsReceived(auth.accessToken),
				fetchLeagueMembershipInvitationsReceived(auth.accessToken),
				fetchQuickGameLobbyInvitations(auth.accessToken),
				fetchLeagueGameInvitations(auth.accessToken),
				fetchFriendInvitationsReceived(auth.accessToken),
			]);

			if (seq !== fetchSeqRef.current) {
				return;
			}

			setTournamentInvitations(tournamentRes.ok ? (tournamentRes.data?.invitations ?? []) : []);
			const organizationInvites = organizationRes.ok ? (organizationRes.data?.invitations ?? []) : [];
			const seasonInvites = seasonRes.ok ? (seasonRes.data?.invitations ?? []) : [];
			const leagueMembershipInvites = leagueMembershipRes.ok
				? (leagueMembershipRes.data?.invitations ?? [])
				: [];
			setMembershipInvitations([
				...organizationInvites.map((inv) => ({ ...inv, membershipKind: 'organization' })),
				...seasonInvites.map((inv) => ({ ...inv, membershipKind: 'season' })),
				...leagueMembershipInvites.map((inv) => ({ ...inv, membershipKind: 'league' })),
			]);
			const quickInvites = lobbyRes.ok ? (lobbyRes.data?.invitations ?? []) : [];
			const leagueInvites = leagueRes.ok ? (leagueRes.data?.invitations ?? []) : [];
			setLobbyInvitations([...leagueInvites, ...quickInvites]);

			if (friendsRes.ok) {
				setFriendInvitations(
					(friendsRes.data?.invitations ?? []).filter((inv) => inv.status === 'pending'),
				);
			} else {
				setFriendInvitations([]);
			}

			setError('');
		} catch (e) {
			if (seq !== fetchSeqRef.current) {
				return;
			}
			setTournamentInvitations([]);
			setMembershipInvitations([]);
			setLobbyInvitations([]);
			setFriendInvitations([]);
			setError('Błąd połączenia.');
		} finally {
			if (seq !== fetchSeqRef.current) {
				return;
			}
			setLoading(false);
			setRefreshing(false);
		}
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			if (!auth?.accessToken) return undefined;
			setError('');
			setLoading(true);
			void fetchAll();
			return () => {
				fetchSeqRef.current += 1;
			};
		}, [auth?.accessToken, fetchAll]),
	);

	const onRefresh = () => {
		setRefreshing(true);
		fetchAll();
	};

	const handleTournamentAction = async (invitationId, action) => {
		if (!auth?.accessToken || actionId) return;
		setActionId(`${action}-${invitationId}`);

		try {
			const { ok, data } = await actOnTournamentInvitation(invitationId, action, auth.accessToken);

			if (ok) {
				await fetchAll();
			} else {
				Alert.alert('Błąd', data?.message || 'Operacja nie powiodła się.');
			}
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setActionId(null);
		}
	};

	const handleMembershipAction = async (invitation, action) => {
		if (!auth?.accessToken || actionId) return;
		setActionId(`${action}-${invitation.membershipKind}-${invitation.id}`);

		try {
			const act = invitation.membershipKind === 'season'
				? actOnSeasonInvitation
				: invitation.membershipKind === 'league'
					? actOnLeagueMembershipInvitation
					: actOnOrganizationInvitation;
			const { ok, data } = await act(invitation.id, action, auth.accessToken);

			if (ok) {
				await fetchAll();
			} else {
				Alert.alert('Błąd', data?.message || 'Operacja nie powiodła się.');
			}
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setActionId(null);
		}
	};

	const handleLobbyJoin = async (inv) => {
		if (!auth?.accessToken || actionId) return;
		setActionId(`join-${inv.id}`);
		try {
			if (inv.type === 'league') {
				const { ok, data } = await acceptLeagueGameLobby(inv.id, auth.accessToken);
				if (ok) {
					navigation.navigate('Graj', {
						screen: 'LeagueGameLobby',
						params: { gameId: inv.id, initialGame: data },
					});
					return;
				}
				Alert.alert('Błąd', data?.message || 'Nie udało się zaakceptować meczu ligowego.');
				await fetchAll();
				return;
			}
			const { ok, status, data } = await joinQuickGameLobby(inv.lobbyId, auth.accessToken);
			if (ok && data?.id) {
				navigation.navigate('Graj', {
					screen: 'QuickGameLobby',
					params: { initialLobby: data },
				});
				return;
			}
			if (status === 409) {
				Alert.alert(
					'Nie można dołączyć',
					data?.message || 'Masz już aktywne lobby lub mecz w toku.',
				);
			} else {
				Alert.alert('Błąd', data?.message || 'Nie udało się dołączyć do lobby.');
			}
			await fetchAll();
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
			await fetchAll();
		} finally {
			setActionId(null);
		}
	};

	const handleFriendAction = async (invitationId, action) => {
		if (!auth?.accessToken || actionId) return;
		setActionId(`${action}-friend-${invitationId}`);

		try {
			const { ok, data } = await actOnFriendInvitation(invitationId, action, auth.accessToken);

			if (ok) {
				setFriendInvitations((prev) => prev.filter((i) => i.id !== invitationId));
				if (action === 'accept') {
					Alert.alert('Gotowe', data?.message || 'Zaproszenie zaakceptowane.');
				}
			} else {
				Alert.alert('Błąd', data?.message || 'Operacja nie powiodła się.');
			}
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setActionId(null);
		}
	};

	const handleLobbyReject = async (inv) => {
		if (!auth?.accessToken || actionId) return;
		setActionId(`reject-${inv.id}`);
		try {
			const { ok, data } = inv.type === 'league'
				? await rejectLeagueGameLobby(inv.id, auth.accessToken)
				: await rejectQuickGameLobbyInvitation(inv.id, auth.accessToken);
			if (ok) {
				setLobbyInvitations((prev) => prev.filter((i) => i.id !== inv.id));
			} else {
				Alert.alert('Błąd', data?.message || 'Nie udało się odrzucić zaproszenia.');
			}
		} catch (e) {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setActionId(null);
		}
	};

	const gameCount = useMemo(
		() => tournamentInvitations.length + membershipInvitations.length + lobbyInvitations.length,
		[lobbyInvitations.length, membershipInvitations.length, tournamentInvitations.length],
	);

	if (!auth?.accessToken) {
		return (
			<View style={styles.container}>
				<Text style={styles.hint}>Zaloguj się, aby zobaczyć zaproszenia.</Text>
			</View>
		);
	}

	if (loading) {
		return <ScreenLoading />;
	}

	const openPlayerProfile = (playerId, name) => {
		if (!playerId) return;
		navigation.navigate('Znajomi', {
			screen: 'PlayerProfile',
			params: {
				playerId,
				name: name ?? undefined,
			},
		});
	};

	const renderLobbyRow = (inv, index, total) => {
		const isLeague = inv.type === 'league';
		const title = isLeague
			? (inv.leagueName || 'Mecz ligowy')
			: `${inv.hostName ?? 'Gracz'} zaprasza`;
		const subtitle = isLeague
			? [inv.hostName ? `Od ${inv.hostName}` : null, inv.formatLabel].filter(Boolean).join(' · ')
			: 'Szybka gra';

		return (
			<InviteRow
				key={`${isLeague ? 'league' : 'lobby'}-${inv.id}`}
				icon={isLeague ? 'medal-outline' : 'flash-outline'}
				title={title}
				subtitle={subtitle}
				first={index === 0}
				last={index === total - 1}
				actions={(
					<>
						<ActionChip
							label={isLeague ? 'Akceptuj' : 'Dołącz'}
							busy={actionId === `join-${inv.id}`}
							disabled={!!actionId}
							onPress={() => handleLobbyJoin(inv)}
						/>
						<ActionChip
							variant="reject"
							label="Odrzuć"
							busy={actionId === `reject-${inv.id}`}
							disabled={!!actionId}
							onPress={() => handleLobbyReject(inv)}
						/>
					</>
				)}
			/>
		);
	};

	const renderTournamentRow = (inv, index, total) => {
		const isPending = inv.status === 'pending';
		const isAccepted = inv.status === 'accepted';

		return (
			<InviteRow
				key={`tournament-${inv.id}`}
				icon="trophy-outline"
				title={inv.tournamentName}
				subtitle={inv.statusLabel ?? 'Turniej'}
				first={index === 0}
				last={index === total - 1}
				actions={
					isPending ? (
						<>
							<ActionChip
								label="Akceptuj"
								busy={actionId === `accept-${inv.id}`}
								disabled={!!actionId}
								onPress={() => handleTournamentAction(inv.id, 'accept')}
							/>
							<ActionChip
								variant="reject"
								label="Odrzuć"
								busy={actionId === `reject-${inv.id}`}
								disabled={!!actionId}
								onPress={() => handleTournamentAction(inv.id, 'reject')}
							/>
						</>
					) : isAccepted ? (
						<ActionChip
							variant="danger"
							label="Wycofaj"
							busy={actionId === `withdraw-${inv.id}`}
							disabled={!!actionId}
							onPress={() => handleTournamentAction(inv.id, 'withdraw')}
						/>
					) : null
				}
			/>
		);
	};

	const renderMembershipRow = (inv, index, total) => {
		const title = inv.seasonName ?? inv.leagueName ?? inv.organizationName;
		const actionKey = (action) => `${action}-${inv.membershipKind}-${inv.id}`;

		return (
			<InviteRow
				key={`${inv.membershipKind}-${inv.id}`}
				icon={membershipIcon(inv.membershipKind)}
				title={title}
				subtitle={inv.statusLabel ?? membershipKindLabel(inv.membershipKind)}
				first={index === 0}
				last={index === total - 1}
				actions={(
					<>
						<ActionChip
							label="Akceptuj"
							busy={actionId === actionKey('accept')}
							disabled={!!actionId}
							onPress={() => handleMembershipAction(inv, 'accept')}
						/>
						<ActionChip
							variant="reject"
							label="Odrzuć"
							busy={actionId === actionKey('reject')}
							disabled={!!actionId}
							onPress={() => handleMembershipAction(inv, 'reject')}
						/>
					</>
				)}
			/>
		);
	};

	const renderFriendRow = (item, index, total) => {
		const name = item.sender?.name ?? 'Gracz';
		const playerId = item.sender?.playerId;

		return (
			<InviteRow
				key={`friend-${item.id}`}
				avatarName={name}
				title={name}
				subtitle="Chce dodać Cię do znajomych"
				first={index === 0}
				last={index === total - 1}
				onPress={playerId ? () => openPlayerProfile(playerId, name) : undefined}
				actions={(
					<>
						<ActionChip
							label="Akceptuj"
							busy={actionId === `accept-friend-${item.id}`}
							disabled={!!actionId}
							onPress={() => handleFriendAction(item.id, 'accept')}
						/>
						<ActionChip
							variant="reject"
							label="Odrzuć"
							busy={actionId === `reject-friend-${item.id}`}
							disabled={!!actionId}
							onPress={() => handleFriendAction(item.id, 'reject')}
						/>
					</>
				)}
			/>
		);
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
			}
		>
			<View style={styles.form}>
				<View style={styles.segment}>
					<Pressable
						accessibilityRole="button"
						style={[styles.segmentItem, activeTab === TAB_GRA && styles.segmentItemActive]}
						onPress={() => setActiveTab(TAB_GRA)}
					>
						<Text
							style={[
								styles.segmentText,
								activeTab === TAB_GRA && styles.segmentTextActive,
							]}
						>
							Gra
						</Text>
						{gameCount > 0 ? (
							<Text
								style={[
									styles.segmentCount,
									activeTab === TAB_GRA && styles.segmentCountActive,
								]}
							>
								{gameCount}
							</Text>
						) : null}
					</Pressable>
					<Pressable
						accessibilityRole="button"
						style={[
							styles.segmentItem,
							activeTab === TAB_FRIENDS && styles.segmentItemActive,
						]}
						onPress={() => setActiveTab(TAB_FRIENDS)}
					>
						<Text
							style={[
								styles.segmentText,
								activeTab === TAB_FRIENDS && styles.segmentTextActive,
							]}
						>
							Znajomi
						</Text>
						{friendInvitations.length > 0 ? (
							<Text
								style={[
									styles.segmentCount,
									activeTab === TAB_FRIENDS && styles.segmentCountActive,
								]}
							>
								{friendInvitations.length}
							</Text>
						) : null}
					</Pressable>
				</View>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				{activeTab === TAB_GRA ? (
					gameCount === 0 ? (
						<EmptyState
							icon="mail-outline"
							title="Brak zaproszeń do gry"
							description="Tu pojawią się lobby, turnieje oraz zaproszenia do organizacji i sezonów."
						/>
					) : (
						<>
							{lobbyInvitations.length > 0 ? (
								<>
									<Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>
										Do gry
									</Text>
									<InviteGroup>
										{lobbyInvitations.map((inv, index) =>
											renderLobbyRow(inv, index, lobbyInvitations.length),
										)}
									</InviteGroup>
								</>
							) : null}

							{tournamentInvitations.length > 0 ? (
								<>
									<Text
										style={[
											styles.sectionLabel,
											lobbyInvitations.length === 0 && styles.sectionLabelFirst,
										]}
									>
										Turnieje
									</Text>
									<InviteGroup>
										{tournamentInvitations.map((inv, index) =>
											renderTournamentRow(inv, index, tournamentInvitations.length),
										)}
									</InviteGroup>
								</>
							) : null}

							{membershipInvitations.length > 0 ? (
								<>
									<Text
										style={[
											styles.sectionLabel,
											lobbyInvitations.length === 0
												&& tournamentInvitations.length === 0
												&& styles.sectionLabelFirst,
										]}
									>
										Składy
									</Text>
									<InviteGroup>
										{membershipInvitations.map((inv, index) =>
											renderMembershipRow(inv, index, membershipInvitations.length),
										)}
									</InviteGroup>
								</>
							) : null}
						</>
					)
				) : friendInvitations.length === 0 ? (
					<EmptyState
						icon="people-outline"
						title="Brak zaproszeń"
						description="Gdy ktoś wyśle Ci zaproszenie do znajomych, pojawi się tutaj."
					/>
				) : (
					<InviteGroup>
						{friendInvitations.map((item, index) =>
							renderFriendRow(item, index, friendInvitations.length),
						)}
					</InviteGroup>
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
	sectionLabelFirst: {
		marginTop: 0,
	},
	group: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	row: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 12,
		paddingRight: 10,
		minHeight: 64,
		backgroundColor: colors.bgElevated,
		gap: 10,
	},
	rowFirst: {
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	rowLast: {
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
	},
	rowMain: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minWidth: 0,
		paddingVertical: 12,
	},
	rowPressed: {
		opacity: 0.85,
	},
	rowDivider: {
		position: 'absolute',
		left: 60,
		right: 0,
		bottom: 0,
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.border,
	},
	typeIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
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
	textCol: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	rowSubtitle: {
		marginTop: 2,
		fontSize: 12,
		color: colors.textMuted,
	},
	actions: {
		alignItems: 'flex-end',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 10,
	},
	acceptChip: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: colors.accentMuted,
		minWidth: 78,
		alignItems: 'center',
	},
	acceptChipText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
	},
	rejectChip: {
		paddingVertical: 4,
		paddingHorizontal: 10,
		minWidth: 78,
		alignItems: 'center',
	},
	rejectChipText: {
		color: colors.textDim,
		fontSize: 13,
		fontWeight: '600',
	},
	dangerChip: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		minWidth: 78,
		alignItems: 'center',
	},
	dangerChipText: {
		color: colors.danger,
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
});

export default InvitationsScreen;
