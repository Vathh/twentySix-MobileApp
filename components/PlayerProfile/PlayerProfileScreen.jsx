import React, { useCallback, useRef, useState } from 'react';
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchPlayerProfile } from '../../helpers/playerProfileApi';
import ProfileHeader from './ProfileHeader';
import ProfileFriendshipActions from './ProfileFriendshipActions';
import ProfileStatsOverview from './ProfileStatsOverview';
import ProfileGameHistory from './ProfileGameHistory';
import ProfileCareerDashboard from './ProfileCareerDashboard';
import ProfileBadges from './ProfileBadges';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const TAB_OVERVIEW = 'overview';
const TAB_HISTORY = 'history';
const TAB_CAREER = 'career';
const TAB_BADGES = 'badges';

const TABS = [
	{ key: TAB_OVERVIEW, label: 'Przegląd' },
	{ key: TAB_HISTORY, label: 'Historia' },
	{ key: TAB_CAREER, label: 'Kariera' },
	{ key: TAB_BADGES, label: '100+' },
];

function ProfileTabBar({ activeTab, onChange }) {
	return (
		<View style={styles.segment}>
			{TABS.map((tab) => {
				const on = activeTab === tab.key;
				return (
					<Pressable
						key={tab.key}
						style={[styles.segmentItem, on && styles.segmentItemActive]}
						onPress={() => onChange(tab.key)}
					>
						<Text style={[styles.segmentText, on && styles.segmentTextActive]}>
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
	const playerId = route?.params?.playerId;
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
	const [tabsPinned, setTabsPinned] = useState(false);
	const tabsOffsetRef = useRef(0);
	const tabsPinnedRef = useRef(false);

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

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				scrollEventThrottle={16}
				onScroll={onScroll}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
				}
			>
				<View style={styles.heroBlock}>
					<View style={styles.form}>
						<ProfileHeader
							name={profile?.player?.name}
							initials={profile?.player?.initials}
							registeredAt={profile?.player?.registeredAt}
							description={profile?.player?.description}
							isSelf={!!friendship?.isSelf}
							relationLabel={relationLabel(friendship)}
							liveGames={profile?.liveGames}
							onEditPress={() =>
								navigation.navigate('EditPlayerProfile', {
									playerId,
									description: profile?.player?.description ?? '',
								})
							}
						>
							<ProfileFriendshipActions
								friendship={friendship}
								userId={profile?.player?.userId}
								accessToken={auth?.accessToken}
								onChanged={loadProfile}
							/>
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
						<ProfileTabBar activeTab={activeTab} onChange={setActiveTab} />
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

						{activeTab === TAB_HISTORY ? (
							<ProfileGameHistory
								key={`${playerId}-${profile?.gameHistory?.items?.length ?? 0}`}
								playerId={playerId}
								accessToken={auth?.accessToken}
								initialItems={profile?.gameHistory?.items}
								initialHasMore={profile?.gameHistory?.hasMore}
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
							<ProfileBadges checkoutItems={profile?.checkoutItems} />
						) : null}
					</View>
				</View>
			</ScrollView>

			{tabsPinned ? (
				<View style={styles.tabsOverlay}>
					<View style={styles.form}>
						<ProfileTabBar activeTab={activeTab} onChange={setActiveTab} />
					</View>
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
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
		paddingVertical: 8,
		borderRadius: 8,
	},
	segmentItemActive: {
		backgroundColor: colors.accentMuted,
	},
	segmentText: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.textMuted,
	},
	segmentTextActive: {
		color: colors.accent,
	},
});

export default PlayerProfileScreen;
