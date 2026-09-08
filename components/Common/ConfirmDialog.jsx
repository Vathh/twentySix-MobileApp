import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Wspólny dialog potwierdzenia (zamiast systemowego Alert).
 */
export default function ConfirmDialog({
	visible,
	title,
	message,
	cancelLabel = 'Anuluj',
	confirmLabel = 'Potwierdź',
	destructive = true,
	onCancel,
	onConfirm,
}) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			presentationStyle="overFullScreen"
			statusBarTranslucent
			onRequestClose={onCancel}
		>
			<View style={styles.backdrop}>
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={onCancel}
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
				/>
				<View style={styles.card} accessibilityRole="alert">
					<Text style={styles.title}>{title}</Text>
					{message ? <Text style={styles.message}>{message}</Text> : null}
					<View style={styles.actions}>
						<Pressable
							style={[styles.btn, styles.btnSecondary]}
							onPress={onCancel}
						>
							<Text style={styles.btnSecondaryText}>{cancelLabel}</Text>
						</Pressable>
						<Pressable
							style={[
								styles.btn,
								destructive ? styles.btnDanger : styles.btnPrimary,
							]}
							onPress={onConfirm}
						>
							<Text
								style={
									destructive ? styles.btnDangerText : styles.btnPrimaryText
								}
							>
								{confirmLabel}
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
		backgroundColor: colors.overlay,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	card: {
		width: '100%',
		maxWidth: 420,
		zIndex: 1,
		elevation: 8,
		backgroundColor: colors.bgElevated,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.borderMuted,
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
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
	btnSecondary: {
		backgroundColor: colors.bgElevatedHover,
		borderWidth: 1,
		borderColor: colors.borderMuted,
	},
	btnSecondaryText: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '600',
	},
	btnDanger: {
		backgroundColor: colors.dangerMuted,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	btnDangerText: {
		color: colors.dangerText,
		fontSize: 16,
		fontWeight: '600',
	},
});
