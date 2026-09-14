import { useCallback, useEffect, useRef, useState } from 'react';
import { createReverbPusher } from '../helpers/createReverbPusher';
import { getReverbConfig } from '../helpers/apiConfig';
import { navigateFromGameScoring } from '../helpers/navigateFromGameScoring';
import {
	createQuickGameRematch,
	expressQuickGameRematchIntent,
	fetchQuickGameRematchStatus,
} from '../helpers/quickGameLobbyApi';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';
import { GAME_MODE } from '../helpers/gameScoring';

const REMATCH_CREATED = 'rematch.created';
const REMATCH_CREATED_ALT = '.rematch.created';

/**
 * Modal końca meczu + rematch (quick) / powrót do setupu (trening).
 */
export function useGameFinishedModal({
	navigation,
	mode,
	isHost,
	lobbyId,
	accessToken,
	players,
	matchFormat,
	onLeaveTournamentSession,
}) {
	const [visible, setVisible] = useState(false);
	const [variant, setVariant] = useState('tournament');
	const [title, setTitle] = useState('Mecz zakończony');
	const [message, setMessage] = useState('');
	const [phase, setPhase] = useState('options');
	const [busy, setBusy] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const leaveToAppHomeRef = useRef(false);

	const navigatedRef = useRef(false);
	const waitingRef = useRef(false);

	const goToRematchLobby = useCallback(
		(lobby) => {
			if (!lobby || navigatedRef.current) return;
			navigatedRef.current = true;
			waitingRef.current = false;
			setVisible(false);
			setBusy(false);
			setPhase('options');
			navigateFromGameScoring(navigation, 'QuickGameLobby', {
				initialLobby: lobby,
			});
		},
		[navigation],
	);

	const showFinished = useCallback(({ winnerName, kind, tournamentEnded = false, lost = false }) => {
		navigatedRef.current = false;
		waitingRef.current = false;
		setErrorMessage(null);
		setBusy(false);
		setPhase('options');
		leaveToAppHomeRef.current = Boolean(tournamentEnded);

		if (kind === 'training') {
			setVariant('training');
			setTitle('Trening zakończony');
			setMessage(
				lost
					? 'Wynik spadł do 0 lub poniżej. Gra zakończona.\nWynik zapisano w historii treningów.'
					: `${winnerName ?? 'Zwycięzca'} wygrywa mecz.\nWynik zapisano w historii treningów.`,
			);
		} else if (kind === 'quick') {
			setVariant('quick');
			setTitle('Mecz zakończony');
			setMessage(
				lost
					? 'Wynik spadł do 0 lub poniżej. Gra zakończona.'
					: `${winnerName ?? 'Zwycięzca'} wygrywa mecz.`,
			);
		} else {
			setVariant('tournament');
			setTitle('Mecz zakończony');
			const base = `${winnerName ?? 'Zwycięzca'} wygrywa mecz.`;
			setMessage(
				tournamentEnded
					? `${base}\n\nTurniej zakończony — możesz jeszcze obejrzeć statystyki.`
					: base,
			);
		}
		setVisible(true);
	}, []);

	const applyTournamentEnded = useCallback(() => {
		leaveToAppHomeRef.current = true;
		setMessage((prev) => {
			if (!prev || prev.includes('Turniej zakończony')) {
				return prev || 'Turniej zakończony — możesz jeszcze obejrzeć statystyki.';
			}
			return `${prev}\n\nTurniej zakończony — możesz jeszcze obejrzeć statystyki.`;
		});
	}, []);

	const handleStay = useCallback(() => {
		waitingRef.current = false;
		setPhase('options');
		setBusy(false);
		setErrorMessage(null);
		setVisible(false);
	}, []);

	const handleLeave = useCallback(() => {
		waitingRef.current = false;
		setVisible(false);
		if (leaveToAppHomeRef.current) {
			onLeaveTournamentSession?.();
			return;
		}
		if (navigation.canGoBack()) {
			navigation.goBack();
		} else {
			navigateFromGameScoring(navigation, 'GrajHome');
		}
	}, [navigation, onLeaveTournamentSession]);

	const handlePlayAgain = useCallback(async () => {
		setErrorMessage(null);

		if (variant === 'training') {
			const prefillPlayers = (players ?? []).map((p, i) => ({
				id: p.id ?? Date.now() + i,
				name: p.name,
			}));
			setVisible(false);
			navigateFromGameScoring(navigation, 'TrainingMatchSetup', {
				prefill: {
					players: prefillPlayers,
					matchFormat,
				},
			});
			return;
		}

		if (variant !== 'quick' || !lobbyId || !accessToken) {
			setErrorMessage('Brak danych lobby do rematchu.');
			return;
		}

		setBusy(true);
		try {
			if (isHost) {
				const { ok, data } = await createQuickGameRematch(
					lobbyId,
					accessToken,
				);
				if (!ok || !data?.lobby) {
					setErrorMessage(
						data?.message || 'Nie udało się utworzyć lobby.',
					);
					setBusy(false);
					return;
				}
				goToRematchLobby(data.lobby);
				return;
			}

			const { ok, data } = await expressQuickGameRematchIntent(
				lobbyId,
				accessToken,
			);
			if (!ok) {
				setErrorMessage(
					data?.message || 'Nie udało się zgłosić rematchu.',
				);
				setBusy(false);
				return;
			}

			if (data?.status === 'created' && data?.lobby) {
				goToRematchLobby(data.lobby);
				return;
			}

			waitingRef.current = true;
			setPhase('waiting_host');
			setBusy(false);
		} catch (err) {
			setErrorMessage(err?.message || 'Błąd sieci.');
			setBusy(false);
		}
	}, [
		variant,
		players,
		matchFormat,
		navigation,
		lobbyId,
		accessToken,
		isHost,
		goToRematchLobby,
	]);

	// WS + polling gdy czekamy na hosta
	useEffect(() => {
		if (!visible || phase !== 'waiting_host' || !lobbyId || !accessToken) {
			return undefined;
		}

		let cancelled = false;
		let pusher;
		let channel;
		let unbindDebug = () => {};
		let pollTimer;

		const onRematchLobby = (lobby) => {
			if (cancelled || !lobby) return;
			goToRematchLobby(lobby);
		};

		const poll = async () => {
			try {
				const { ok, data } = await fetchQuickGameRematchStatus(
					lobbyId,
					accessToken,
				);
				if (cancelled || !ok) return;
				if (data?.status === 'created' && data?.lobby) {
					onRematchLobby(data.lobby);
				}
			} catch {
				// ignore poll errors
			}
		};

		try {
			const cfg = getReverbConfig();
			pusher = createReverbPusher(accessToken);
			unbindDebug = attachPusherReverbDebugLogging(pusher, {
				scope: 'quick-game-rematch',
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				forceTLS: cfg.forceTLS,
				authEndpoint: cfg.authEndpoint,
			});
			const channelName = `private-quick-game-lobby.${lobbyId}`;
			channel = pusher.subscribe(channelName);
			const onCreated = (raw) => {
				const payload = normalizePusherPayload(raw);
				logReverbWs('info', 'quick-game-rematch', 'rematch.created', {
					sourceLobbyId: payload?.sourceLobbyId,
					lobbyId: payload?.lobby?.id,
				});
				onRematchLobby(payload?.lobby);
			};
			channel.bind(REMATCH_CREATED, onCreated);
			channel.bind(REMATCH_CREATED_ALT, onCreated);
		} catch (err) {
			logReverbWs(
				'warn',
				'quick-game-rematch',
				'WS niedostępne — polling HTTP',
				err,
			);
		}

		void poll();
		pollTimer = setInterval(poll, 2500);

		return () => {
			cancelled = true;
			if (pollTimer) clearInterval(pollTimer);
			try {
				unbindDebug();
				if (channel) {
					channel.unbind_all();
					pusher?.unsubscribe(`private-quick-game-lobby.${lobbyId}`);
				}
				pusher?.disconnect();
			} catch {
				// ignore
			}
		};
	}, [visible, phase, lobbyId, accessToken, goToRematchLobby]);

	return {
		finishedModalProps: {
			visible,
			title,
			message,
			variant,
			phase,
			busy,
			errorMessage,
			onPlayAgain: handlePlayAgain,
			onStay: handleStay,
			onLeave: handleLeave,
		},
		showFinished,
		applyTournamentEnded,
	};
}

export function finishedKindForMode(mode) {
	if (mode === GAME_MODE.TRAINING) return 'training';
	if (mode === GAME_MODE.QUICK_FFA) return 'quick';
	return 'tournament';
}
