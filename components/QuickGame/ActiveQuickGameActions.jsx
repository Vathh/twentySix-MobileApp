import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useConfirm } from '../../context/ConfirmProvider';
import {
	activeQuickGameOpponentNames,
	buildGameScoringParamsFromActiveGame,
} from '../../helpers/activeQuickGame';
import { abortFfaGame, postFfaPresence } from '../../helpers/quickGameFfaApi';
import { colors } from '../../theme/colors';

export default function ActiveQuickGameActions({
	game,
	accessToken,
	navigation,
	onCleared,
	resumeLabel = 'Wróć do gry',
}) {
	const [busy, setBusy] = useState(false);
	const confirm = useConfirm();
	if (!game?.lobbyId) {
		return null;
	}

	const isHost = !!game.isHost;
	const isOneDevice = game.scoringMode === 'one_device';
	const showAbort = isHost;
	const showLeave = !isHost && !isOneDevice;
	const opponentNames = activeQuickGameOpponentNames(game);

	const resume = () => {
		const params = buildGameScoringParamsFromActiveGame(game);
		if (params) {
			navigation.navigate('GameScoring', params);
		}
	};

	const abortGame = async () => {
		if (!accessToken || busy) return;
		const ok = await confirm({
			title: 'Skasować grę?',
			message: 'Gra zostanie unieważniona i usunięta. Wynik się nie zapisze.',
			confirmLabel: 'Skasuj grę',
		});
		if (!ok) return;
		setBusy(true);
		try {
			await abortFfaGame(game.lobbyId, accessToken);
			onCleared?.();
		} catch (err) {
			Alert.alert('Błąd', err?.message || 'Nie udało się skasować gry');
		} finally {
			setBusy(false);
		}
	};

	const leaveGame = async () => {
		if (!accessToken || busy) return;
		const playerCount = game?.players?.length ?? 0;
		const message =
			playerCount === 2
				? 'Opuścisz mecz bez możliwości powrotu. Przeciwnik wygra walkowerem.'
				: 'Opuścisz mecz bez możliwości powrotu.';
		const ok = await confirm({
			title: 'Opuścić mecz?',
			message,
			confirmLabel: 'Opuść',
		});
		if (!ok) return;
		setBusy(true);
		try {
			await postFfaPresence(game.lobbyId, accessToken, 'left');
		} catch {
			// i tak czyścimy lokalny stan — użytkownik chce wyjść
		}
		onCleared?.();
		setBusy(false);
	};

	return (
		<View style={styles.block}>
			<Text style={styles.context}>Szybka gra z {opponentNames}</Text>
			<View style={styles.row}>
				<Pressable
					style={[styles.buttonResume, styles.rowButton]}
					onPress={resume}
					disabled={busy}
				>
					<Text style={styles.buttonResumeText}>{resumeLabel}</Text>
				</Pressable>
				{showAbort ? (
					<Pressable
						style={[styles.buttonDanger, styles.rowButton]}
						onPress={abortGame}
						disabled={busy}
					>
						<Text style={styles.buttonDangerText}>
							{busy ? 'Kasowanie…' : 'Skasuj grę'}
						</Text>
					</Pressable>
				) : null}
				{showLeave ? (
					<Pressable
						style={[styles.buttonDanger, styles.rowButton]}
						onPress={leaveGame}
						disabled={busy}
					>
						<Text style={styles.buttonDangerText}>
							{busy ? 'Opuszczanie…' : 'Opuść'}
						</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	block: {
		marginBottom: 16,
	},
	context: {
		marginBottom: 8,
		fontSize: 12,
		color: colors.successSoftText,
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
		gap: 8,
	},
	rowButton: {
		flex: 1,
	},
	buttonResume: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 10,
		backgroundColor: colors.successMuted,
		borderRadius: 8,
	},
	buttonResumeText: {
		color: colors.successSoftText,
		fontSize: 15,
		fontWeight: '600',
		textAlign: 'center',
	},
	buttonDanger: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 10,
		backgroundColor: colors.dangerMuted,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	buttonDangerText: {
		color: colors.dangerText,
		fontSize: 15,
		fontWeight: '600',
		textAlign: 'center',
	},
});
