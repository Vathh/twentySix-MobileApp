import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeMatchFormat } from '../helpers/matchFormat/matchFormat';
import { resolveGameContext } from '../helpers/gameScoring';
import {
	ffaScoringCanInput,
	isFfaOneDeviceSpectator,
} from '../helpers/gameScoring/ffaScoringCanInput';
import { notifyFfaGameAborted } from '../helpers/gameScoring/notifyFfaGameAborted';
import useAuth from './useAuth';
import { useFfaPresenceHeartbeat } from './useFfaPresenceHeartbeat';
import { useGameFinishedModal } from './useGameFinishedModal';
import { useLeaveGameConfirmation } from './useLeaveGameConfirmation';

/**
 * Wspólny chrome ekranów FFA (kontekst, keep-awake, presence, modal końca, spectator).
 * Pad / lokalna logika tury zostaje w ekranie trybu.
 */
export function useFfaScoringScreenSession({
	route,
	navigation,
	keepAwakeId,
}) {
	const { auth } = useAuth();
	const isFocused = useIsFocused();
	const insets = useSafeAreaInsets();
	const currentPlayerIndexRef = useRef(0);
	const gameCtx = useMemo(
		() => resolveGameContext(route.params, auth, {
			getCurrentPlayerIndex: () => currentPlayerIndexRef.current,
		}),
		[route.params, auth],
	);
	const {
		mode,
		players,
		N,
		matchFormat: routeMatchFormat,
		showStartModal,
		isHost,
		syncEnabled,
		transport,
		reloadKey,
		lobbyId,
		lobbyScoringMode,
		myPlayerIndex,
	} = gameCtx;
	const matchFormat = normalizeMatchFormat(routeMatchFormat);
	const legsToWin = matchFormat.legsToWinSet ?? 2;

	const [isModalVisible, setIsModalVisible] = useState(!!showStartModal);
	const [gameClosed, setGameClosed] = useState(false);
	const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
	currentPlayerIndexRef.current = currentPlayerIndex;

	const legOpenerIndexRef = useRef(0);
	const dartLogRef = useRef([]);
	const matchEndedRef = useRef(false);
	const intentionalFfaLeaveRef = useRef(false);

	const { finishedModalProps, showFinished } = useGameFinishedModal({
		navigation,
		mode,
		isHost,
		lobbyId,
		accessToken: auth?.accessToken,
		players,
		matchFormat,
	});

	const makeOnFinishedQuickGameId = useCallback((pickWinnerIndex) => () => {
		if (matchEndedRef.current) return;
		matchEndedRef.current = true;
		const winnerIdx = pickWinnerIndex();
		const name = players[winnerIdx]?.name ?? 'Zwycięzca';
		showFinished({ winnerName: name, kind: 'quick' });
	}, [players, showFinished]);

	useLeaveGameConfirmation({
		navigation,
		mode,
		gameClosed,
		tournamentGame: null,
		accessToken: auth?.accessToken,
		syncEnabled,
		lobbyId,
		intentionalFfaLeaveRef,
		lobbyScoringMode,
	});

	useFfaPresenceHeartbeat({
		mode,
		syncEnabled,
		lobbyId,
		accessToken: auth?.accessToken,
		gameClosed,
		intentionalFfaLeaveRef,
	});

	useEffect(() => {
		if (isFocused) {
			activateKeepAwakeAsync(keepAwakeId).catch(() => {});
		} else {
			deactivateKeepAwake(keepAwakeId);
		}
		return () => deactivateKeepAwake(keepAwakeId);
	}, [isFocused, keepAwakeId]);

	const isSpectator = isFfaOneDeviceSpectator(syncEnabled, lobbyScoringMode, isHost);

	const computeCanInput = useCallback(
		({ busy, canInputFromServer }) => ffaScoringCanInput({
			gameClosed,
			isModalVisible,
			busy,
			isSpectator,
			syncEnabled,
			canInputFromServer,
			lobbyScoringMode,
			myPlayerIndex,
			currentPlayerIndex,
		}),
		[
			currentPlayerIndex,
			gameClosed,
			isModalVisible,
			isSpectator,
			lobbyScoringMode,
			myPlayerIndex,
			syncEnabled,
		],
	);

	const handleSelectOpener = useCallback((player) => {
		const idx = players.findIndex(
			(p) => p === player || p?.id === player?.id || p?.name === player?.name,
		);
		const opener = idx >= 0 ? idx : 0;
		legOpenerIndexRef.current = opener;
		setCurrentPlayerIndex(opener);
		setIsModalVisible(false);
	}, [players]);

	const onAborted = useCallback(
		() => notifyFfaGameAborted(navigation),
		[navigation],
	);

	return {
		auth,
		insets,
		mode,
		players,
		N,
		matchFormat,
		legsToWin,
		showStartModal,
		isHost,
		syncEnabled,
		transport,
		reloadKey,
		lobbyId,
		lobbyScoringMode,
		myPlayerIndex,
		isModalVisible,
		setIsModalVisible,
		gameClosed,
		setGameClosed,
		currentPlayerIndex,
		setCurrentPlayerIndex,
		currentPlayerIndexRef,
		legOpenerIndexRef,
		dartLogRef,
		matchEndedRef,
		intentionalFfaLeaveRef,
		finishedModalProps,
		showFinished,
		makeOnFinishedQuickGameId,
		isSpectator,
		computeCanInput,
		handleSelectOpener,
		onAborted,
	};
}
