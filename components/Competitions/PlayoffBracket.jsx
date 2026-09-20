import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	PanResponder,
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CompetitionTabs from './CompetitionTabs';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

const SNAP_MS = 220;
const RUBBER = 0.28;
const PAGE_THRESHOLD = 0.22;
const SWIPE_VELOCITY = 0.55;
const slideEasing = Easing.out(Easing.cubic);

const ROUND_CHIP_LABELS = {
	SIXTYFOUR: '1/64',
	THIRTYTWO: '1/32',
	SIXTEEN: '1/16',
	EIGHT: '1/8',
	QUARTER: '1/4',
	SEMI: '1/2',
	THIRD: '3. msc',
	FINAL: 'Finał',
};

const SKIP_AS_NEXT = new Set(['THIRD']);

function chipLabel(round) {
	return ROUND_CHIP_LABELS[round.round] ?? round.roundLabel ?? round.round;
}

function pickInitialRoundKey(rounds) {
	const live = rounds.find((r) =>
		(r.games ?? []).some((g) => g.status === 'in_progress'),
	);
	if (live) return live.round;

	const upcoming = rounds.find((r) =>
		(r.games ?? []).some(
			(g) => g.status === 'scheduled' && g.player1?.id && g.player2?.id,
		),
	);
	if (upcoming) return upcoming.round;

	for (let i = rounds.length - 1; i >= 0; i -= 1) {
		if ((rounds[i].games ?? []).some((g) => g.status === 'finished')) {
			return rounds[i].round;
		}
	}

	return rounds[0]?.round ?? null;
}

function winnerIdOf(game) {
	if (game?.winnerId) return game.winnerId;
	if (game?.status !== 'finished') return null;
	const s1 = game.score1 ?? 0;
	const s2 = game.score2 ?? 0;
	if (s1 === s2) return null;
	if (s1 > s2) return game.player1?.id ?? null;
	return game.player2?.id ?? null;
}

function scoreText(game, which) {
	if (game.status === 'scheduled') return '';
	const value = which === 1 ? game.score1 : game.score2;
	if (value == null) return '0';
	return String(value);
}

function playerLabel(player) {
	const name = player?.name;
	if (!name || name === 'TBD') return 'TBD';
	return name;
}

function slotIndex(slot) {
	if (!slot) return 0;
	const match = String(slot).match(/_(\d+)$/);
	return match ? Number(match[1]) : 0;
}

function sortGames(games) {
	return [...games].sort((a, b) => {
		const bySlot = slotIndex(a.slot) - slotIndex(b.slot);
		if (bySlot !== 0) return bySlot;
		return (a.id ?? 0) - (b.id ?? 0);
	});
}

function findNextRound(rounds, currentKey) {
	const idx = rounds.findIndex((r) => r.round === currentKey);
	if (idx < 0) return null;
	for (let i = idx + 1; i < rounds.length; i += 1) {
		if (!SKIP_AS_NEXT.has(rounds[i].round)) {
			return rounds[i];
		}
	}
	return null;
}

function groupForRound(round, allRounds) {
	const games = sortGames(round.games ?? []);
	if (games.length === 0) return [];

	const hasDest = games.some((g) => g.nextSlot);
	if (hasDest) {
		const used = new Set();
		const buckets = new Map();
		for (const game of games) {
			if (!game.nextSlot) continue;
			const list = buckets.get(game.nextSlot) ?? [];
			list.push(game);
			buckets.set(game.nextSlot, list);
		}

		const groups = [];
		for (const game of games) {
			if (used.has(game.id)) continue;
			if (!game.nextSlot) {
				used.add(game.id);
				groups.push({ games: [game], nextGameId: null, nextRound: null });
				continue;
			}
			const pair = buckets.get(game.nextSlot) ?? [game];
			pair.forEach((item) => used.add(item.id));
			groups.push({
				games: pair,
				nextGameId: game.nextGameId ?? null,
				nextRound: game.nextRound ?? null,
			});
		}
		return groups;
	}

	const nextRound = findNextRound(allRounds, round.round);
	const nextGames = sortGames(nextRound?.games ?? []);
	const groups = [];
	for (let i = 0; i < games.length; i += 2) {
		const pair = games.slice(i, i + 2);
		const nextGame = nextGames[Math.floor(i / 2)] ?? null;
		groups.push({
			games: pair,
			nextGameId: nextGame?.id ?? null,
			nextRound: nextGame ? nextRound.round : null,
		});
	}
	return groups;
}

const CARD_BLOCK = 92;
const PAIR_GROUP_EXTRA = 32;
const SOLO_GROUP_EXTRA = 20;
const HEIGHT_PAD = 12;

function estimateRoundHeight(round, allRounds) {
	const groups = round ? groupForRound(round, allRounds) : [];
	if (groups.length === 0) return 56;
	let height = 0;
	for (const group of groups) {
		const paired = group.games.length > 1 && !!group.nextRound;
		height += group.games.length * CARD_BLOCK;
		height += paired ? PAIR_GROUP_EXTRA : SOLO_GROUP_EXTRA;
	}
	return height;
}

function indexOfRound(rounds, key) {
	const idx = rounds.findIndex((r) => r.round === key);
	return idx < 0 ? 0 : idx;
}

/**
 * Drabinka playoff w stylu Flashscore: zakładki rund, pary karmiące
 * następny mecz + łuk ze strzałką w prawo. Swipe jak karuzela.
 */
export default function PlayoffBracket({ rounds = [], onPlayerPress }) {
	const list = Array.isArray(rounds) ? rounds : [];
	const roundKey = list.map((r) => r.round).join('|');
	const [activeRound, setActiveRound] = useState(() => pickInitialRoundKey(list));
	const [highlightId, setHighlightId] = useState(null);
	const { width: windowWidth } = useWindowDimensions();
	const estimatedWidth = Math.max(1, windowWidth - 48);
	const [pageWidth, setPageWidth] = useState(estimatedWidth);
	const offsetX = useSharedValue(
		-indexOfRound(list, pickInitialRoundKey(list)) * estimatedWidth,
	);
	const pageWidthSV = useSharedValue(estimatedWidth);
	const heightsSV = useSharedValue(list.map((round) => estimateRoundHeight(round, list)));
	const animatingRef = useRef(false);
	const startOffsetRef = useRef(0);
	const listRef = useRef(list);
	const activeRoundRef = useRef(activeRound);
	const pageWidthRef = useRef(pageWidth);
	const estimatesRef = useRef(list.map((round) => estimateRoundHeight(round, list)));
	listRef.current = list;
	activeRoundRef.current = activeRound;
	pageWidthRef.current = pageWidth;
	estimatesRef.current = list.map((round) => estimateRoundHeight(round, list));

	useEffect(() => {
		heightsSV.value = list.map((round) => estimateRoundHeight(round, list));
		setActiveRound((prev) => {
			if (list.length === 0) return null;
			if (list.some((r) => r.round === prev)) return prev;
			const next = pickInitialRoundKey(list);
			const idx = indexOfRound(list, next);
			offsetX.value = -idx * pageWidthRef.current;
			return next;
		});
	}, [roundKey, offsetX, heightsSV]);

	useEffect(() => {
		if (highlightId == null) return undefined;
		const timer = setTimeout(() => setHighlightId(null), 2500);
		return () => clearTimeout(timer);
	}, [highlightId]);

	const tabs = useMemo(
		() => list.map((round) => ({ key: round.round, label: chipLabel(round) })),
		[list],
	);

	const goToIndex = useCallback(
		(nextIndex, { animated = true, highlight } = {}) => {
			const roundsList = listRef.current;
			if (nextIndex < 0 || nextIndex >= roundsList.length) return;

			const pw = pageWidthRef.current;
			const target = -nextIndex * pw;
			const nextKey = roundsList[nextIndex].round;

			if (nextKey !== activeRoundRef.current) {
				setActiveRound(nextKey);
			}
			if (highlight !== undefined) {
				setHighlightId(highlight);
			}

			if (animated && pw > 1) {
				animatingRef.current = true;
				offsetX.value = withTiming(target, {
					duration: SNAP_MS,
					easing: slideEasing,
				});
				setTimeout(() => {
					animatingRef.current = false;
				}, SNAP_MS);
			} else {
				offsetX.value = target;
				animatingRef.current = false;
			}
		},
		[offsetX],
	);

	const goToRound = useCallback(
		(nextKey, highlight = null) => {
			if (!nextKey || animatingRef.current) return;
			const roundsList = listRef.current;
			const from = indexOfRound(roundsList, activeRoundRef.current);
			const to = roundsList.findIndex((r) => r.round === nextKey);
			if (to < 0 || to === from) return;
			goToIndex(to, {
				animated: Math.abs(to - from) === 1,
				highlight,
			});
		},
		[goToIndex],
	);

	const releaseSwipe = useCallback(
		(dx, vx) => {
			const roundsList = listRef.current;
			const idx = indexOfRound(roundsList, activeRoundRef.current);
			const pw = pageWidthRef.current;
			let nextIndex = idx;
			if (idx < roundsList.length - 1 && (dx < -pw * PAGE_THRESHOLD || vx < -SWIPE_VELOCITY)) {
				nextIndex = idx + 1;
			} else if (idx > 0 && (dx > pw * PAGE_THRESHOLD || vx > SWIPE_VELOCITY)) {
				nextIndex = idx - 1;
			}
			goToIndex(nextIndex, { animated: true });
		},
		[goToIndex],
	);

	const panRef = useRef({});
	panRef.current.canSwipe = tabs.length > 1;
	panRef.current.releaseSwipe = releaseSwipe;
	panRef.current.goToIndex = goToIndex;
	panRef.current.offsetX = offsetX;

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gesture) => {
				if (!panRef.current.canSwipe || animatingRef.current) return false;
				return (
					Math.abs(gesture.dx) > 20 &&
					Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15
				);
			},
			onPanResponderGrant: () => {
				startOffsetRef.current = panRef.current.offsetX.value;
			},
			onPanResponderTerminationRequest: () => false,
			onPanResponderMove: (_, gesture) => {
				if (animatingRef.current) return;
				const roundsList = listRef.current;
				const idx = indexOfRound(roundsList, activeRoundRef.current);
				let dx = gesture.dx;
				if ((idx <= 0 && dx > 0) || (idx >= roundsList.length - 1 && dx < 0)) {
					dx *= RUBBER;
				}
				panRef.current.offsetX.value = startOffsetRef.current + dx;
			},
			onPanResponderRelease: (_, gesture) => {
				panRef.current.releaseSwipe(gesture.dx, gesture.vx);
			},
			onPanResponderTerminate: () => {
				const idx = indexOfRound(listRef.current, activeRoundRef.current);
				panRef.current.goToIndex(idx, { animated: true });
			},
		}),
	).current;

	const trackStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: offsetX.value }],
	}));

	const clipStyle = useAnimatedStyle(() => {
		const pw = pageWidthSV.value;
		const hs = heightsSV.value;
		if (pw < 1 || !hs || hs.length === 0) {
			return {};
		}
		const maxI = hs.length - 1;
		const progress = Math.min(Math.max(-offsetX.value / pw, 0), maxI);
		const left = Math.floor(progress);
		const right = Math.min(left + 1, maxI);
		const t = progress - left;
		const h1 = hs[left] > 0 ? hs[left] : hs[right] || 0;
		const h2 = hs[right] > 0 ? hs[right] : h1;
		const height = t < 0.001 ? h1 : Math.max(h1, h2);
		if (height <= 0) {
			return {};
		}
		return { height };
	});

	const setPageHeight = useCallback(
		(index, height) => {
			if (index < 0 || height <= 0) return;
			const next = heightsSV.value.slice();
			while (next.length < listRef.current.length) {
				next.push(0);
			}
			const resolved = Math.max(
				height + HEIGHT_PAD,
				estimatesRef.current[index] || 0,
				next[index] || 0,
			);
			if (next[index] === resolved) return;
			next[index] = resolved;
			heightsSV.value = next;
		},
		[heightsSV],
	);

	const current = list.find((r) => r.round === activeRound) ?? list[0];
	const currentIndex = indexOfRound(list, current?.round);

	if (list.length === 0) {
		return <Text style={styles.empty}>Brak drabinki playoff.</Text>;
	}

	return (
		<View>
			{tabs.length > 1 ? (
				<CompetitionTabs
					tabs={tabs}
					activeKey={current?.round}
					onChange={(key) => goToRound(key)}
				/>
			) : (
				<Text style={styles.singleRound}>{current?.roundLabel}</Text>
			)}

			<View style={styles.pagerShell}>
				<View style={styles.measureLayer} pointerEvents="none" collapsable={false}>
					{list.map((round, index) => (
						<View
							key={`measure-${round.round}`}
							style={{ width: pageWidth }}
							onLayout={(event) => {
								setPageHeight(
									index,
									Math.round(event.nativeEvent.layout.height),
								);
							}}
						>
							<RoundList round={round} allRounds={list} />
						</View>
					))}
				</View>
				<Animated.View
					style={[styles.pagerClip, clipStyle]}
					collapsable={false}
					onLayout={(event) => {
						const nextWidth = Math.round(event.nativeEvent.layout.width);
						if (nextWidth > 0 && nextWidth !== pageWidthRef.current) {
							const idx = indexOfRound(listRef.current, activeRoundRef.current);
							pageWidthRef.current = nextWidth;
							pageWidthSV.value = nextWidth;
							offsetX.value = -idx * nextWidth;
							setPageWidth(nextWidth);
						}
					}}
					{...panResponder.panHandlers}
				>
					<Animated.View
						style={[styles.track, { width: pageWidth * list.length }, trackStyle]}
					>
						{list.map((round, index) => {
							const active = index === currentIndex;
							return (
								<View
									key={round.round}
									style={[styles.page, { width: pageWidth }]}
									pointerEvents={active ? 'auto' : 'none'}
								>
									<RoundList
										round={round}
										allRounds={list}
										highlightId={active ? highlightId : null}
										onPlayerPress={active ? onPlayerPress : undefined}
										onAdvance={
											active
												? (group) =>
														goToRound(group.nextRound, group.nextGameId ?? null)
												: undefined
										}
									/>
								</View>
							);
						})}
					</Animated.View>
				</Animated.View>
			</View>
		</View>
	);
}

function RoundList({ round, allRounds, highlightId = null, onPlayerPress, onAdvance }) {
	const groups = round ? groupForRound(round, allRounds) : [];
	if (!round) {
		return <View />;
	}
	if (groups.length === 0) {
		return <Text style={styles.empty}>Brak meczów w tej rundzie.</Text>;
	}

	return groups.map((group, index) => (
		<BracketGroup
			key={group.games.map((g) => g.id).join('-') || `g-${index}`}
			group={group}
			highlightId={highlightId}
			onPlayerPress={onPlayerPress}
			onAdvance={onAdvance ? () => onAdvance(group) : undefined}
		/>
	));
}

function BracketGroup({ group, highlightId, onPlayerPress, onAdvance }) {
	const showArrow = group.games.length > 1 && !!group.nextRound;

	return (
		<View style={[styles.group, showArrow && styles.groupPaired]}>
			<View style={styles.groupCards}>
				{group.games.map((game) => (
					<PlayoffMatchCard
						key={game.id}
						game={game}
						compact={showArrow}
						highlighted={highlightId === game.id}
						onPlayerPress={onPlayerPress}
					/>
				))}
			</View>
			{showArrow ? <PairConnector onPress={onAdvance} /> : null}
		</View>
	);
}

function PairConnector({ onPress }) {
	return (
		<Pressable style={styles.connector} onPress={onPress} hitSlop={8}>
			<View style={styles.brace} pointerEvents="none" />
			<View style={styles.arrowHit}>
				<Ionicons name="chevron-forward" size={scaleSize(18)} color={colors.accent} />
			</View>
		</Pressable>
	);
}

function PlayoffMatchCard({ game, compact, highlighted, onPlayerPress }) {
	const winnerId = winnerIdOf(game);
	const live = game.status === 'in_progress';

	return (
		<View
			style={[
				styles.card,
				compact && styles.cardCompact,
				live && styles.cardLive,
				highlighted && styles.cardHighlight,
			]}
		>
			{live ? <Text style={styles.liveBadge}>Na żywo</Text> : null}
			<PlayerRow
				player={game.player1}
				score={scoreText(game, 1)}
				won={winnerId != null && winnerId === game.player1?.id}
				tbd={!game.player1?.id}
				onPress={onPlayerPress}
			/>
			<View style={styles.divider} />
			<PlayerRow
				player={game.player2}
				score={scoreText(game, 2)}
				won={winnerId != null && winnerId === game.player2?.id}
				tbd={!game.player2?.id}
				onPress={onPlayerPress}
			/>
		</View>
	);
}

function PlayerRow({ player, score, won, tbd, onPress }) {
	const canOpen = !tbd && player?.userId && onPress;
	const name = playerLabel(player);

	const content = (
		<>
			<Text
				style={[
					styles.playerName,
					won && styles.playerNameWon,
					tbd && styles.playerNameTbd,
				]}
				numberOfLines={1}
			>
				{name}
			</Text>
			<Text style={[styles.playerScore, won && styles.playerScoreWon]}>
				{score}
			</Text>
		</>
	);

	if (canOpen) {
		return (
			<Pressable
				style={styles.playerRow}
				onPress={() => onPress(player.id, player.name)}
			>
				{content}
			</Pressable>
		);
	}

	return <View style={styles.playerRow}>{content}</View>;
}

const styles = StyleSheet.create({
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 16,
	},
	singleRound: {
		marginBottom: 12,
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	pagerShell: {
		width: '100%',
	},
	measureLayer: {
		position: 'absolute',
		left: -9999,
		top: 0,
		opacity: 1,
	},
	pagerClip: {
		overflow: 'hidden',
		width: '100%',
	},
	track: {
		position: 'absolute',
		left: 0,
		top: 0,
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	page: {
		flexShrink: 0,
		paddingBottom: 4,
	},
	group: {
		marginBottom: 8,
	},
	groupPaired: {
		flexDirection: 'row',
		alignItems: 'stretch',
		marginBottom: 22,
	},
	groupCards: {
		flex: 1,
		minWidth: 0,
		gap: 6,
	},
	connector: {
		width: 40,
		marginLeft: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	brace: {
		position: 'absolute',
		left: 0,
		top: '20%',
		bottom: '20%',
		width: 16,
		borderColor: colors.borderStrong,
		borderRightWidth: 2,
		borderTopWidth: 2,
		borderBottomWidth: 2,
		borderTopRightRadius: 16,
		borderBottomRightRadius: 16,
	},
	arrowHit: {
		width: 26,
		height: 26,
		borderRadius: 13,
		marginLeft: 10,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	card: {
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
		overflow: 'hidden',
	},
	cardCompact: {
		marginBottom: 0,
	},
	cardLive: {
		borderColor: colors.success,
	},
	cardHighlight: {
		borderColor: colors.accent,
	},
	liveBadge: {
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 2,
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.4,
		color: colors.successBright,
		textTransform: 'uppercase',
	},
	playerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.border,
		marginHorizontal: 12,
	},
	playerName: {
		flex: 1,
		color: colors.text,
		fontSize: 15,
	},
	playerNameWon: {
		color: colors.accent,
		fontWeight: '700',
	},
	playerNameTbd: {
		color: colors.textDim,
		fontStyle: 'italic',
	},
	playerScore: {
		minWidth: 28,
		textAlign: 'right',
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '600',
		fontVariant: ['tabular-nums'],
	},
	playerScoreWon: {
		color: colors.accent,
		fontWeight: '800',
	},
});
