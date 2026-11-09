import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { fetchPlayerHeadToHead, fetchPlayerProfile } from '../../helpers/playerProfileApi';
import HeadToHeadPanel from '../Game/HeadToHeadPanel';
import ProfileHeader from './ProfileHeader';
import ProfileFriendshipActions from './ProfileFriendshipActions';
import FollowButton from '../Activity/FollowButton';
import ReportModal from '../Activity/ReportModal';
import { blockFeedUser, reportContent, unblockFeedUser } from '../../helpers/feedApi';
import ProfileStatsOverview from './ProfileStatsOverview';
import ProfileGameHistory from './ProfileGameHistory';
import ProfileCareerDashboard from './ProfileCareerDashboard';
import ProfileBadges from './ProfileBadges';
import ProfileFeed from './ProfileFeed';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const TAB_OVERVIEW = 'overview';
const TAB_FEED = 'feed';
const TAB_HISTORY = 'history';
const TAB_H2H = 'h2h';
const TAB_CAREER = 'career';
const TAB_BADGES = 'badges';

const TABS = [
	{ key: TAB_OVERVIEW, label: 'Podsumowanie' },
	{ key: TAB_FEED, label: 'Tablica' },
	{ key: TAB_HISTORY, label: 'Historia meczów' },
	{ key: TAB_CAREER, label: 'Statystyki' },
	{ key: TAB_BADGES, label: 'Odznaczenia' },
];

function profileTabs(profile) {
	if (!profile?.headToHead || profile?.friendship?.isSelf) {
		return TABS;
	}
	const historyIndex = TABS.findIndex((tab) => tab.key === TAB_HISTORY);
	const next = TABS.slice();
	next.splice(historyIndex + 1, 0, { key: TAB_H2H, label: 'H2H' });
	return next;
}

function ProfileTabBar({ tabs, activeTab, onChange }) {
	return (
		<View style={styles.segment}>
			{tabs.map((tab) => {
				const on = activeTab === tab.key;
				return (
					<Pressable
						key={tab.key}
						style={[styles.segmentItem, on && styles.segmentItemActive]}
						onPress={() => onChange(tab.key)}
					>
						<Text
							style={[styles.segmentText, on && styles.segmentTextActive]}
							numberOfLines={2}
						>
							{tab.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

function relationLabel(friendship) {
	if (!friendship || friendship.isSelf) return null;
	if (friendship.isFriend) return 'Znajomy';
	if (friendship.pendingSent) return 'Zaproszenie wysłane';
	if (friendship.pendingReceived?.id) return 'Zaproszenie od tego gracza';
	return null;
}

const PlayerProfileScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const confirm = useConfirm();
	const playerId = route?.params?.playerId;
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [reportOpen, setReportOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
	const [badgeFocus, setBadgeFocus] = useState({ anchor: null, nonce: 0 });
	const [tabsPinned, setTabsPinned] = useState(false);
	const tabsOffsetRef = useRef(0);
	const tabsPinnedRef = useRef(false);
	const scrollRef = useRef(null);
	const contentRef = useRef(null);

	const openBadge = (anchor) => {
		setActiveTab(TAB_BADGES);
		setBadgeFocus((current) => ({ anchor, nonce: current.nonce + 1 }));
	};

	const changeTab = (tab) => {
		setActiveTab(tab);
		setBadgeFocus({ anchor: null, nonce: 0 });
	};

	useEffect(() => {
		setActiveTab(TAB_OVERVIEW);
	}, [playerId]);

	const tabs = profileTabs(profile);

	const onScroll = useCallback((event) => {
		const next = event.nativeEvent.contentOffset.y >= tabsOffsetRef.current;
		if (next !== tabsPinnedRef.current) {
			tabsPinnedRef.current = next;
			setTabsPinned(next);
		}
	}, []);

	const loadProfile = useCallback(async () => {
		if (!playerId || !auth?.accessToken) {
			setError('Brak danych gracza.');
			setLoading(false);
			setRefreshing(false);
			return;
		}

		const result = await fetchPlayerProfile(playerId, auth.accessToken);
		if (!result.ok) {
			setProfile(null);
			setError(result.message || 'Nie udało się wczytać profilu.');
		} else {
			setProfile(result.data);
			setError('');
		}
		setLoading(false);
		setRefreshing(false);
	}, [playerId, auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			loadProfile();
		}, [loadProfile]),
	);

	const onRefresh = () => {
		setRefreshing(true);
		loadProfile();
	};

	if (loading) {
		return <ScreenLoading />;
	}

	if (error && !profile) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>{error}</Text>
				<Pressable
					style={styles.retry}
					onPress={() => {
						setLoading(true);
						loadProfile();
					}}
				>
					<Text style={styles.retryText}>Spróbuj ponownie</Text>
				</Pressable>
			</View>
		);
	}

	const friendship = profile?.friendship;
	const canModerate = Boolean(profile?.player?.userId && !friendship?.isSelf);
	const blocked = !!profile?.blocked;

	const changeBlock = async () => {
		const person = profile?.player?.name || 'tego gracza';
		const accepted = await confirm({
			title: blocked ? 'Odblokować gracza?' : 'Zablokować gracza?',
			message: blocked
				? `Odblokować ${person}?`
				: `Zablokować ${person}? Nie zobaczysz jego wpisów ani komentarzy. On nadal widzi Twoje.`,
			confirmLabel: blocked ? 'Odblokuj' : 'Zablokuj',
		});
		if (!accepted) return;
		const result = blocked
			? await unblockFeedUser(auth?.accessToken, profile.player.userId)
			: await blockFeedUser(auth?.accessToken, profile.player.userId);
		if (!result.ok) {
			Alert.alert('Błąd', result.data?.message || 'Nie udało się zmienić blokady.');
			return;
		}
		loadProfile();
	};

	return (
		<View style={styles.container}>
			<ScrollView
				ref={scrollRef}
				style={styles.scroll}
				contentContainerStyle={styles.content}
				scrollEventThrottle={16}
				onScroll={onScroll}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
				}
			>
				<View ref={contentRef} collapsable={false}>
				<View style={styles.heroBlock}>
					<View style={styles.form}>
						<ProfileHeader
							name={profile?.player?.name}
							initials={profile?.player?.initials}
							registeredAt={profile?.player?.registeredAt}
							fastestQf={profile?.highlights?.fastestQf}
							highestHf={profile?.highlights?.highestHf}
							description={profile?.player?.description}
							avatarUrl={profile?.player?.avatarUrl}
							isSelf={!!friendship?.isSelf}
							relationLabel={relationLabel(friendship)}
							liveGames={profile?.liveGames}
							highVisitItems={profile?.highVisitItems}
							qfItems={profile?.qfItems}
							finishItems={profile?.finishItems}
							careerItems={profile?.careerItems}
							onBadgesPress={openBadge}
							onEditPress={() =>
								navigation.navigate('EditPlayerProfile', {
									playerId,
									name: profile?.player?.name ?? '',
									description: profile?.player?.description ?? '',
									avatarUrl: profile?.player?.avatarUrl ?? null,
								})
							}
						>
							<View style={styles.actions}>
								<ProfileFriendshipActions
									friendship={friendship}
									userId={profile?.player?.userId}
									playerName={profile?.player?.name}
									accessToken={auth?.accessToken}
									onChanged={loadProfile}
								/>
								{canModerate ? (
									<FollowButton
										accessToken={auth?.accessToken}
										subjectType="user"
										subjectKey={profile.player.userId}
									/>
								) : null}
								{canModerate ? (
									<Pressable onPress={() => setReportOpen(true)} accessibilityRole="button" style={styles.reportPlayer}>
										<Ionicons name="flag-outline" size={16} color={colors.accent} />
										<Text style={styles.reportPlayerText}>Zgłoś gracza</Text>
									</Pressable>
								) : null}
								{canModerate ? (
									<Pressable onPress={changeBlock} accessibilityRole="button" style={styles.blockPlayer}>
										<Ionicons name="ban-outline" size={16} color={colors.danger} />
										<Text style={styles.blockPlayerText}>{blocked ? 'Odblokuj' : 'Zablokuj'}</Text>
									</Pressable>
								) : null}
							</View>
						</ProfileHeader>
					</View>
				</View>

				<View
					style={styles.tabsSlot}
					onLayout={(event) => {
						tabsOffsetRef.current = event.nativeEvent.layout.y;
					}}
				>
					<View style={styles.form}>
						<ProfileTabBar tabs={tabs} activeTab={activeTab} onChange={changeTab} />
					</View>
				</View>

				<View style={styles.bodyBlock}>
					<View style={styles.form}>
						{activeTab === TAB_OVERVIEW ? (
							<ProfileStatsOverview
								overview={profile?.overview}
								overviewSplit={profile?.overviewSplit}
								onRivalPress={(rival) =>
									navigation.push('PlayerProfile', {
										playerId: rival.id,
										name: rival.name,
									})
								}
							/>
						) : null}

						{activeTab === TAB_FEED ? (
							<ProfileFeed playerId={playerId} accessToken={auth?.accessToken} />
						) : null}

						{activeTab === TAB_HISTORY ? (
							<ProfileGameHistory
								key={`${playerId}-${profile?.gameHistory?.items?.length ?? 0}`}
								playerId={playerId}
								accessToken={auth?.accessToken}
								initialItems={profile?.gameHistory?.items}
								initialHasMore={profile?.gameHistory?.hasMore}
							/>
						) : null}

						{activeTab === TAB_H2H ? (
							<HeadToHeadPanel
								h2h={profile?.headToHead}
								leftName={auth?.playerName || '—'}
								rightName={profile?.player?.name || '—'}
								resetKey={String(playerId)}
								zeroText="Nie rozegraliście jeszcze wspólnego meczu."
								listEmptyText="Nie rozegraliście jeszcze wspólnego meczu."
								onOpenMeeting={(meeting) =>
									navigation.navigate('GameDetail', {
										type: meeting.kind,
										gameId: meeting.id,
									})
								}
								loadPage={(offset) => fetchPlayerHeadToHead(playerId, offset, auth?.accessToken)}
							/>
						) : null}

						{activeTab === TAB_CAREER ? (
							<ProfileCareerDashboard
								playerId={playerId}
								accessToken={auth?.accessToken}
								initialCareer={profile?.career}
							/>
						) : null}

						{activeTab === TAB_BADGES ? (
							<ProfileBadges
								checkoutItems={profile?.checkoutItems}
								highVisitItems={profile?.highVisitItems}
								qfItems={profile?.qfItems}
								finishItems={profile?.finishItems}
								careerItems={profile?.careerItems}
								onComparePress={
									profile?.friendship?.isSelf
										? null
										: () => navigation.navigate('CompareBadges', { playerId })
								}
								focusAnchor={badgeFocus.anchor}
								focusNonce={badgeFocus.nonce}
								contentRef={contentRef}
								scrollRef={scrollRef}
							/>
						) : null}
					</View>
				</View>
				</View>
			</ScrollView>

			{tabsPinned ? (
				<View style={styles.tabsOverlay}>
					<View style={styles.form}>
						<ProfileTabBar tabs={tabs} activeTab={activeTab} onChange={changeTab} />
					</View>
				</View>
			) : null}
			<ReportModal
				visible={reportOpen}
				title="Zgłoś gracza"
				onClose={() => setReportOpen(false)}
				onSubmit={async ({ reason, details }) => {
					const result = await reportContent(
						auth?.accessToken,
						'user',
						profile?.player?.userId,
						reason,
						details,
					);
					return result.ok
						? { ok: true }
						: { ok: false, message: result.data?.message };
				}}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	actions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	reportPlayer: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.accent,
		backgroundColor: 'transparent',
	},
	reportPlayerText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '600',
	},
	blockPlayer: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.danger,
		backgroundColor: 'transparent',
	},
	blockPlayerText: {
		color: colors.danger,
		fontSize: 13,
		fontWeight: '600',
	},
	container: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	scroll: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingBottom: 40,
	},
	heroBlock: {
		paddingHorizontal: 24,
		paddingTop: 24,
		alignItems: 'center',
	},
	tabsSlot: {
		paddingHorizontal: 24,
		paddingTop: 8,
		paddingBottom: 12,
		alignItems: 'center',
	},
	tabsOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 20,
		backgroundColor: colors.bg,
		paddingHorizontal: 24,
		paddingTop: 8,
		paddingBottom: 12,
		alignItems: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	bodyBlock: {
		paddingHorizontal: 24,
		paddingTop: 4,
		alignItems: 'center',
	},
	form: {
		alignItems: 'stretch',
		width: '100%',
		maxWidth: 400,
	},
	centered: {
		flex: 1,
		backgroundColor: colors.bg,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	error: {
		color: colors.dangerText,
		textAlign: 'center',
		marginBottom: 16,
	},
	retry: {
		backgroundColor: colors.accentMuted,
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	retryText: {
		color: colors.accent,
		fontWeight: '600',
	},
	segment: {
		flexDirection: 'row',
		alignItems: 'stretch',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		padding: 3,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 2,
	},
	segmentItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 44,
		paddingHorizontal: 2,
		paddingVertical: 6,
		borderRadius: 8,
	},
	segmentItemActive: {
		backgroundColor: colors.accentMuted,
	},
	segmentText: {
		width: '100%',
		fontSize: 11,
		lineHeight: 13,
		fontWeight: '600',
		color: colors.textMuted,
		textAlign: 'center',
		textAlignVertical: 'center',
		includeFontPadding: false,
	},
	segmentTextActive: {
		color: colors.accent,
	},
});

export default PlayerProfileScreen;
