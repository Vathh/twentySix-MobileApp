import React from 'react';
import {
	ActivityIndicator,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Modal końca meczu (quick / trening / turniej) — zamiast systemowego Alert.
 */
export default function GameFinishedModal({
	visible,
	title,
	message,
	variant = 'tournament',
	phase = 'options',
	busy = false,
	errorMessage = null,
	onPlayAgain,
	onStay,
	onLeave,
}) {
	const showPlayAgain = variant === 'quick' || variant === 'training';
	const waiting = phase === 'waiting_host';

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			presentationStyle="overFullScreen"
			statusBarTranslucent
		>
			<View style={styles.backdrop}>
				<View style={styles.card}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.message}>{message}</Text>

					{waiting ? (
						<View style={styles.waitingBox}>
							<ActivityIndicator color={colors.accent} />
							<Text style={styles.waitingText}>Czekaj na hosta…</Text>
							<Text style={styles.waitingHint}>
								Gdy host kliknie „Zagraj jeszcze raz”, dołączysz do lobby
								automatycznie.
							</Text>
						</View>
					) : null}

					{errorMessage ? (
						<Text style={styles.errorText}>{errorMessage}</Text>
					) : null}

					{busy && !waiting ? (
						<ActivityIndicator
							style={styles.busySpinner}
							color={colors.accent}
						/>
					) : null}

					<View style={styles.actions}>
						{showPlayAgain && !waiting ? (
							<Pressable
								style={[styles.btn, styles.btnPrimary]}
								onPress={onPlayAgain}
								disabled={busy}
							>
								<Text style={styles.btnPrimaryText}>Zagraj jeszcze raz</Text>
							</Pressable>
						) : null}

						{!waiting ? (
							<Pressable
								style={[styles.btn, styles.btnSecondary]}
								onPress={onStay}
								disabled={busy}
							>
								<Text style={styles.btnSecondaryText}>Pozostań w meczu</Text>
							</Pressable>
						) : null}

						<Pressable
							style={[styles.btn, styles.btnDanger]}
							onPress={onLeave}
							disabled={busy}
						>
							<Text style={styles.btnDangerText}>
								{waiting ? 'Anuluj i wyjdź' : 'Opuść mecz'}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.72)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	card: {
		width: '100%',
		maxWidth: 420,
		backgroundColor: colors.bgElevated,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.borderMuted ?? 'rgba(255,255,255,0.08)',
		paddingVertical: 28,
		paddingHorizontal: 22,
	},
	title: {
		color: colors.text,
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 10,
	},
	message: {
		color: colors.textMuted,
		fontSize: 16,
		lineHeight: 22,
		textAlign: 'center',
		marginBottom: 20,
	},
	waitingBox: {
		alignItems: 'center',
		marginBottom: 18,
		gap: 10,
	},
	waitingText: {
		color: colors.accent,
		fontSize: 17,
		fontWeight: '600',
	},
	waitingHint: {
		color: colors.textDim,
		fontSize: 13,
		textAlign: 'center',
		lineHeight: 18,
	},
	errorText: {
		color: colors.dangerAlt ?? colors.danger,
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 12,
	},
	busySpinner: {
		marginBottom: 14,
	},
	actions: {
		gap: 10,
	},
	btn: {
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	btnPrimary: {
		backgroundColor: colors.accent,
	},
	btnPrimaryText: {
		color: colors.onAccent ?? '#111',
		fontSize: 16,
		fontWeight: '700',
	},
	btnSecondary: {
		backgroundColor: colors.bgElevatedHover,
		borderWidth: 1,
		borderColor: colors.borderMuted ?? 'rgba(255,255,255,0.12)',
	},
	btnSecondaryText: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '600',
	},
	btnDanger: {
		backgroundColor: colors.dangerMuted,
	},
	btnDangerText: {
		color: colors.dangerText,
		fontSize: 16,
		fontWeight: '600',
	},
});
