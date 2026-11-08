import React, { useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { deleteAccount } from '../../helpers/authApi';
import { userFacingErrorMessage } from '../../helpers/userFacingError';
import { colors } from '../../theme/colors';

const DeleteAccountScreen = () => {
	const { auth, discardSession } = useAuth();
	const confirm = useConfirm();
	const [password, setPassword] = useState('');
	const [errorMsg, setErrorMsg] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		if (loading) return;
		setErrorMsg('');

		if (!password) {
			setErrorMsg('Podaj hasło konta');
			return;
		}

		if (!auth?.accessToken) {
			setErrorMsg('Brak sesji — zaloguj się ponownie');
			return;
		}

		const ok = await confirm({
			title: 'Usunąć konto?',
			message: 'Konto, komentarze i znajomi znikną. Wyniki meczów zostaną jako „Gracz usunięty”.',
			confirmLabel: 'Usuń konto',
		});
		if (!ok) return;

		setLoading(true);
		try {
			const { ok: deleted, data, status, error } = await deleteAccount(auth.accessToken, password);
			if (!deleted) {
				setErrorMsg(userFacingErrorMessage({
					data,
					error,
					status,
					fallback: 'Nie udało się usunąć konta',
				}));
				return;
			}
			await discardSession();
		} catch (error) {
			setErrorMsg(userFacingErrorMessage({
				error,
				fallback: 'Nie udało się usunąć konta',
			}));
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.content}
			keyboardShouldPersistTaps="handled"
		>
			<View style={styles.form}>
				<Text style={styles.lead}>
					Znika e-mail, hasło, awatar, powiadomienia, komentarze i znajomi.
					Wyniki meczów zostają, a profil w nich nazywa się „Gracz usunięty”.
					Jedyny administrator organizacji musi najpierw wskazać innego.
				</Text>
				{errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
				<Text style={styles.label}>Hasło</Text>
				<TextInput
					style={styles.input}
					value={password}
					onChangeText={setPassword}
					placeholder="Hasło konta"
					placeholderTextColor={colors.placeholder}
					secureTextEntry
					autoCapitalize="none"
					editable={!loading}
				/>
				<Pressable
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={loading}
					accessibilityRole="button"
					accessibilityLabel="Usuń konto"
				>
					{loading ? (
						<ActivityIndicator color={colors.text} size="small" />
					) : (
						<Text style={styles.buttonText}>Usuń konto</Text>
					)}
				</Pressable>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		flexGrow: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
	},
	form: {
		width: '100%',
		maxWidth: 400,
	},
	lead: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.textMuted,
		marginBottom: 18,
	},
	error: {
		fontSize: 14,
		color: colors.dangerText,
		marginBottom: 12,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.accent,
		marginBottom: 6,
	},
	input: {
		color: colors.text,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		fontSize: 16,
		marginBottom: 16,
	},
	button: {
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 44,
		borderRadius: 8,
		backgroundColor: colors.danger,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: colors.text,
		fontWeight: '700',
	},
});

export default DeleteAccountScreen;
