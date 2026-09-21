import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Alert,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import ScreenLoading from '../Common/ScreenLoading';
import {
	acceptLeagueGameLobby,
	cancelLeagueGameLobby,
	fetchLeagueGame,
	rejectLeagueGameLobby,
	startLeagueGameScoring,
} from '../../helpers/leagueGamesApi';
import { userFacingErrorMessage } from '../../helpers/userFacingError';
import { colors } from '../../theme/colors';

function navigateToLeagueScoring(navigation, data, { askOpener = false } = {}) {
	navigation.navigate('GameScoring', {
		game: {
			id: data.id,
			type: 'league',
			player1: data.player1,
			player2: data.player2,
			matchFormat: data.format,
		},
		askOpener,
	});
}

export default function LeagueGameLobby({ navigation, route }) {
	const { auth } = useAuth();
	const gameId = route.params?.gameId ?? route.params?.initialGame?.id;
	const [game, setGame] = useState(route.params?.initialGame ?? null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const previousStatusRef = useRef(route.params?.initialGame?.status ?? null);
	const skipScheduledAlertRef = useRef(false);

	const load = useCallback(async () => {
		if (!auth?.accessToken || !gameId) {
			return;
		}
		try {
			const { ok, data } = await fetchLeagueGame(gameId, auth.accessToken);
			if (ok) {
				setGame(data);
				setError('');
				if (data.status === 'in_progress' && data.canResumeScoring) {
					previousStatusRef.current = data.status;
					navigateToLeagueScoring(navigation, data, { askOpener: false });
					return;
				}
				if (
					data.status === 'scheduled'
					&& previousStatusRef.current
					&& previousStatusRef.current !== 'scheduled'
					&& !skipScheduledAlertRef.current
				) {
					previousStatusRef.current = data.status;
					Alert.alert('Mecz anulowany', 'Administrator anulował ten mecz.', [
						{
							text: 'OK',
							onPress: () => {
								if (navigation.canGoBack()) {
									navigation.goBack();
								}
							},
						},
					]);
					return;
				}
				previousStatusRef.current = data.status;
			} else {
				setError(data?.message || 'Nie udało się odświeżyć lobby.');
			}
		} catch {
			setError('Błąd połączenia.');
		}
	}, [auth?.accessToken, gameId, navigation]);

	useFocusEffect(
		useCallback(() => {
			load();
			const timer = setInterval(load, 3000);
			return () => clearInterval(timer);
		}, [load]),
	);

	useEffect(() => {
		navigation.setOptions({ title: 'Lobby ligowe' });
	}, [navigation]);

	const run = async (action, failTitle) => {
		if (!auth?.accessToken || busy || !gameId) {
			return;
		}
		setBusy(true);
		skipScheduledAlertRef.current = true;
		try {
			const { ok, data, status, error } = await action(gameId, auth.accessToken);
			if (ok) {
				setGame(data);
				if (data.status === 'in_progress' && data.canResumeScoring) {
					navigateToLeagueScoring(navigation, data, {
						askOpener: action === startLeagueGameScoring,
					});
				}
				if (data.status === 'scheduled') {
					navigation.goBack();
				} else {
					skipScheduledAlertRef.current = false;
				}
			} else {
				skipScheduledAlertRef.current = false;
				Alert.alert(failTitle, userFacingErrorMessage({
					error,
					status,
					data,
					fallback: 'Operacja nie powiodła się.',
				}));
			}
		} catch (error) {
			skipScheduledAlertRef.current = false;
			Alert.alert('Błąd', userFacingErrorMessage({
				error,
				fallback: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
			}));
		} finally {
			setBusy(false);
		}
	};

	if (!game) {
		return <ScreenLoading />;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.eyebrow}>{game.league?.name}</Text>
			<Text style={styles.title}>{game.player1?.name} vs {game.player2?.name}</Text>
			<Text style={styles.meta}>{game.division?.name}</Text>
			{game.matchday ? (
				<Text style={styles.meta}>Kolejka {game.matchday.roundNumber} · {game.matchday.windowLabel}</Text>
			) : null}
			<View style={styles.formatBox}>
				<Text style={styles.formatLabel}>Format (zablokowany)</Text>
				<Text style={styles.formatValue}>{game.formatLabel}</Text>
			</View>
			<Text style={styles.hint}>
				Składu i formatu nie da się zmienić. Gra na jednym telefonie — gospodarz wpisuje oba wyniki.
			</Text>
			<Text style={styles.status}>
				{game.opponentAccepted
					? 'Przeciwnik zaakceptował. Gospodarz może wystartować.'
					: game.isHost
						? 'Czekamy, aż przeciwnik zaakceptuje zaproszenie.'
						: 'Zaakceptuj, żeby gospodarz mógł wystartować mecz.'}
			</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}

			{game.canAccept ? (
				<Pressable style={[styles.button, busy && styles.disabled]} onPress={() => run(acceptLeagueGameLobby, 'Akceptacja')} disabled={busy}>
					<Text style={styles.buttonText}>{busy ? '…' : 'Akceptuj'}</Text>
				</Pressable>
			) : null}
			{game.canStartScoring ? (
				<Pressable style={[styles.button, busy && styles.disabled]} onPress={() => run(startLeagueGameScoring, 'Start')} disabled={busy}>
					<Text style={styles.buttonText}>{busy ? '…' : 'Start'}</Text>
				</Pressable>
			) : null}
			{game.canReject ? (
				<Pressable style={[styles.buttonOutlined, busy && styles.disabled]} onPress={() => run(rejectLeagueGameLobby, 'Odrzucenie')} disabled={busy}>
					<Text style={styles.buttonOutlinedText}>Odrzuć</Text>
				</Pressable>
			) : null}
			{game.canCancel ? (
				<Pressable style={[styles.buttonOutlined, busy && styles.disabled]} onPress={() => run(cancelLeagueGameLobby, 'Anulowanie')} disabled={busy}>
					<Text style={styles.buttonOutlinedText}>Anuluj lobby</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
	eyebrow: { fontSize: 13, color: colors.accent, marginBottom: 8, fontWeight: '600' },
	title: { fontSize: 22, color: colors.text, fontWeight: '700', marginBottom: 8 },
	meta: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
	formatBox: {
		marginTop: 20,
		marginBottom: 12,
		padding: 14,
		borderRadius: 8,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	formatLabel: { fontSize: 12, color: colors.textDim, marginBottom: 4 },
	formatValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
	hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 16 },
	status: { fontSize: 14, color: colors.accent, marginBottom: 16, lineHeight: 20 },
	error: { fontSize: 14, color: colors.danger, marginBottom: 12 },
	button: {
		backgroundColor: colors.accent,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: 10,
	},
	buttonText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 16 },
	buttonOutlined: {
		borderWidth: 2,
		borderColor: colors.accent,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: 10,
	},
	buttonOutlinedText: { color: colors.accent, fontWeight: 'bold', fontSize: 16 },
	disabled: { opacity: 0.6 },
});
