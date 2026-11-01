import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FriendsScreen from './FriendsScreen';
import { navigate } from '../../helpers/navigationRef';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Segment rozmów. Zostaje w komponencie, ale jest ukryty, dopóki nie ma czatu —
 * pusta sekcja nie obiecuje komunikatora.
 */
const SHOW_RECENT = false;

const PeoplePanelContext = createContext({
	openPeoplePanel: () => {},
});

export function usePeoplePanel() {
	return useContext(PeoplePanelContext);
}

function panelSegments() {
	const segments = [];
	if (SHOW_RECENT) {
		segments.push({ key: 'recent', label: 'Ostatnio' });
	}
	segments.push({ key: 'friends', label: 'Znajomi' });
	return segments;
}

export function PeoplePanelProvider({ children }) {
	const [visible, setVisible] = useState(false);
	const openPeoplePanel = useCallback(() => setVisible(true), []);
	const closePeoplePanel = useCallback(() => setVisible(false), []);
	const value = useMemo(
		() => ({ openPeoplePanel, closePeoplePanel, peoplePanelOpen: visible }),
		[openPeoplePanel, closePeoplePanel, visible],
	);

	return (
		<PeoplePanelContext.Provider value={value}>
			<View style={styles.host}>
				{children}
				<PeoplePanel visible={visible} onClose={closePeoplePanel} />
			</View>
		</PeoplePanelContext.Provider>
	);
}

function PeoplePanel({ visible, onClose }) {
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const fullHeight = Math.max(scaleSize(320), windowHeight - insets.top);
	const restHeight = Math.round(fullHeight * 0.78);
	const sheetHeight = useSharedValue(0);
	const dragStart = useSharedValue(0);
	const [segment, setSegment] = useState('friends');
	const [seenVisible, setSeenVisible] = useState(visible);
	const [opened, setOpened] = useState(visible);
	const segments = panelSegments();
	const showSegments = segments.length > 1;

	if (visible !== seenVisible) {
		setSeenVisible(visible);
		if (visible) {
			setOpened(true);
			setSegment('friends');
		}
	}

	useEffect(() => {
		sheetHeight.value = withTiming(visible ? restHeight : 0, { duration: visible ? 240 : 200 });
	}, [restHeight, sheetHeight, visible]);

	const closeSheet = useCallback(() => {
		onClose();
	}, [onClose]);

	const openProfile = useCallback((playerId, name) => {
		onClose();
		navigate('MainTabs', {
			screen: 'Home',
			params: {
				screen: 'PlayerProfile',
				params: { playerId, name: name ?? undefined },
			},
		});
	}, [onClose]);

	const inviteToGame = useCallback((friend) => {
		const playerId = friend.playerId ?? friend.player_id;
		if (!playerId) return;
		onClose();
		navigate('MainTabs', {
			screen: 'Graj',
			params: {
				screen: 'QuickGameLobby',
				params: {
					invitePlayerId: playerId,
					invitePlayerName: friend.name ?? friend.playerName ?? 'Znajomy',
					inviteRequestId: Date.now(),
				},
			},
		});
	}, [onClose]);

	const openInvitations = useCallback(() => {
		onClose();
		navigate('MainTabs', { screen: 'Zaproszenia' });
	}, [onClose]);

	const pan = useMemo(
		() => Gesture.Pan()
			.onStart(() => {
				dragStart.value = sheetHeight.value;
			})
			.onUpdate((event) => {
				const next = dragStart.value - event.translationY;
				sheetHeight.value = Math.min(fullHeight, Math.max(0, next));
			})
			.onEnd((event) => {
				const projected = sheetHeight.value - event.velocityY * 0.12;
				if (projected < restHeight * 0.55 || event.velocityY > 900) {
					sheetHeight.value = withTiming(0, { duration: 180 }, (finished) => {
						if (finished) {
							runOnJS(closeSheet)();
						}
					});
					return;
				}
				const target = projected > (restHeight + fullHeight) / 2 || event.velocityY < -700
					? fullHeight
					: restHeight;
				sheetHeight.value = withTiming(target, { duration: 200 });
			}),
		[closeSheet, dragStart, fullHeight, restHeight, sheetHeight],
	);

	const backdropStyle = useAnimatedStyle(() => ({
		opacity: fullHeight > 0 ? Math.min(1, sheetHeight.value / restHeight) * 0.45 : 0,
	}));

	const sheetStyle = useAnimatedStyle(() => ({
		height: sheetHeight.value,
	}));

	return (
		<View
			style={styles.overlay}
			pointerEvents={visible ? 'auto' : 'none'}
			accessibilityViewIsModal={visible}
			accessibilityElementsHidden={!visible}
			importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
		>
			<Animated.View style={[styles.backdrop, backdropStyle]}>
				<Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} accessibilityLabel="Zamknij znajomych" />
			</Animated.View>
			<Animated.View style={[styles.sheet, sheetStyle]}>
				<GestureDetector gesture={pan}>
					<View style={styles.grabberZone}>
						<View style={styles.grabber} />
						<Text style={styles.title}>Znajomi</Text>
					</View>
				</GestureDetector>
				{showSegments ? (
					<View style={styles.segment}>
						{segments.map((item) => (
							<Pressable
								key={item.key}
								accessibilityRole="button"
								onPress={() => setSegment(item.key)}
								style={[styles.segmentItem, segment === item.key && styles.segmentItemActive]}
							>
								<Text style={[styles.segmentText, segment === item.key && styles.segmentTextActive]}>
									{item.label}
								</Text>
							</Pressable>
						))}
					</View>
				) : null}
				{segment === 'recent' ? (
					<View style={styles.recentEmpty}>
						<Text style={styles.recentEmptyText}>Brak rozmów.</Text>
					</View>
				) : (
					<View style={styles.sheetBody}>
						{opened ? (
							<FriendsScreen
								onOpenProfile={openProfile}
								onInviteToGame={inviteToGame}
								onOpenInvitations={openInvitations}
							/>
						) : null}
					</View>
				)}
				<View style={{ height: insets.bottom }} />
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	host: {
		flex: 1,
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 30,
		justifyContent: 'flex-end',
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: '#000',
	},
	sheet: {
		backgroundColor: colors.bg,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	grabberZone: {
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 10,
	},
	grabber: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border,
		marginBottom: 10,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	sheetBody: {
		flex: 1,
	},
	segment: {
		flexDirection: 'row',
		marginHorizontal: 24,
		marginBottom: 8,
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
		fontSize: 13,
		fontWeight: '600',
		color: colors.textMuted,
	},
	segmentTextActive: {
		color: colors.accent,
	},
	recentEmpty: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	recentEmptyText: {
		color: colors.textMuted,
		fontSize: 14,
	},
});
