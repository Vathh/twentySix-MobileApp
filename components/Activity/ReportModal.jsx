import React, { useEffect, useState } from 'react';
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { colors } from '../../theme/colors';

const REASONS = [
	{ id: 'spam', label: 'Spam' },
	{ id: 'insult', label: 'Obraza' },
	{ id: 'other', label: 'Inne' },
];

const ReportModal = ({ visible, title, onClose, onSubmit }) => {
	const [reason, setReason] = useState('spam');
	const [details, setDetails] = useState('');
	const [sending, setSending] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!visible) return;
		setReason('spam');
		setDetails('');
		setSending(false);
		setSaved(false);
		setError('');
	}, [visible]);

	const submit = async () => {
		if (sending) return;
		setSending(true);
		setError('');
		const result = await onSubmit({ reason, details: details.trim() });
		setSending(false);
		if (!result?.ok) {
			setError(result?.message || 'Nie udało się zgłosić.');
			return;
		}
		setSaved(true);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<KeyboardAvoidingView
				style={styles.backdrop}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Zamknij" />
				<View style={styles.card}>
					{saved ? (
						<>
							<Text style={styles.title}>Zgłoszenie zapisane</Text>
							<Text style={styles.lead}>Dziękujemy. Zajmiemy się tym zgłoszeniem.</Text>
							<Pressable style={styles.primary} onPress={onClose}>
								<Text style={styles.primaryText}>Zamknij</Text>
							</Pressable>
						</>
					) : (
						<>
							<Text style={styles.title}>{title}</Text>
							<Text style={styles.lead}>Zaznacz jeden powód. Komentarz możesz dopisać, jeśli chcesz coś dodać.</Text>
							<Text style={styles.label}>Dlaczego zgłaszasz?</Text>
							{REASONS.map((option) => {
								const selected = reason === option.id;
								return (
									<Pressable
										key={option.id}
										style={styles.option}
										onPress={() => setReason(option.id)}
										accessibilityRole="radio"
										accessibilityState={{ selected }}
									>
										<View style={[styles.radio, selected && styles.radioOn]} />
										<Text style={styles.optionText}>{option.label}</Text>
									</Pressable>
								);
							})}
							<Text style={styles.label}>Komentarz</Text>
							<TextInput
								style={styles.input}
								value={details}
								onChangeText={setDetails}
								placeholder="Możesz dopisać, co się stało."
								placeholderTextColor={colors.textMuted}
								maxLength={500}
								multiline
							/>
							{error ? <Text style={styles.error}>{error}</Text> : null}
							<View style={styles.actions}>
								<Pressable style={[styles.primary, sending && styles.disabled]} onPress={submit} disabled={sending}>
									<Text style={styles.primaryText}>{sending ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}</Text>
								</Pressable>
								<Pressable style={styles.secondary} onPress={onClose} disabled={sending}>
									<Text style={styles.secondaryText}>Anuluj</Text>
								</Pressable>
							</View>
						</>
					)}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		padding: 20,
	},
	dismiss: {
		...StyleSheet.absoluteFillObject,
	},
	card: {
		backgroundColor: colors.bgElevated,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 20,
	},
	title: {
		color: colors.accent,
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 6,
	},
	lead: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 14,
	},
	label: {
		color: colors.textSecondary || colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 8,
		marginTop: 4,
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 6,
	},
	radio: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: colors.textMuted,
	},
	radioOn: {
		borderColor: colors.accent,
		backgroundColor: colors.accent,
	},
	optionText: {
		color: colors.text,
		fontSize: 15,
	},
	input: {
		minHeight: 88,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		padding: 12,
		color: colors.text,
		textAlignVertical: 'top',
		marginBottom: 12,
	},
	error: {
		color: colors.danger,
		marginBottom: 10,
	},
	actions: {
		gap: 8,
	},
	primary: {
		backgroundColor: colors.accent,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	primaryText: {
		color: colors.onAccent,
		fontWeight: '700',
	},
	secondary: {
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	secondaryText: {
		color: colors.textMuted,
		fontWeight: '600',
	},
	disabled: {
		opacity: 0.6,
	},
});

export default ReportModal;
