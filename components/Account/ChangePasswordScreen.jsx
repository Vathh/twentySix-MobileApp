import React, { useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import { changePassword } from '../../helpers/authApi';
import { colors } from '../../theme/colors';

const ChangePasswordScreen = () => {
	const { auth } = useAuth();
	const [currentPassword, setCurrentPassword] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState('');
	const [errorMsg, setErrorMsg] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [loading, setLoading] = useState(false);

	const parseErrorMessage = (data) => {
		if (typeof data?.message === 'string' && !data?.errors) {
			return data.message;
		}
		const firstField = data?.errors ? Object.values(data.errors)?.[0] : null;
		if (Array.isArray(firstField) && firstField[0]) {
			return firstField[0];
		}
		if (typeof data?.message === 'string') {
			return data.message;
		}
		return 'Nie udało się zmienić hasła';
	};

	const handleSubmit = async () => {
		if (loading) return;
		setErrorMsg('');
		setSuccessMsg('');

		if (!currentPassword || !password || !passwordConfirmation) {
			setErrorMsg('Wypełnij wszystkie pola');
			return;
		}

		if (password !== passwordConfirmation) {
			setErrorMsg('Hasła nie są identyczne');
			return;
		}

		if (password.length < 8) {
			setErrorMsg('Nowe hasło musi mieć co najmniej 8 znaków');
			return;
		}

		if (!auth?.accessToken) {
			setErrorMsg('Brak sesji — zaloguj się ponownie');
			return;
		}

		setLoading(true);

		try {
			const { ok, data } = await changePassword(auth.accessToken, {
				currentPassword,
				password,
				passwordConfirmation,
			});

			if (!ok) {
				setErrorMsg(parseErrorMessage(data));
				return;
			}

			setCurrentPassword('');
			setPassword('');
			setPasswordConfirmation('');
			setSuccessMsg(data?.message || 'Hasło zostało zmienione.');
		} catch {
			setErrorMsg('Nie udało się połączyć z serwerem');
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.form}>
					<Text style={styles.hint}>
						Nowe hasło musi mieć co najmniej 8 znaków.
					</Text>

					{errorMsg ? <Text style={styles.errorMessage}>{errorMsg}</Text> : null}
					{successMsg ? <Text style={styles.successMessage}>{successMsg}</Text> : null}

					<Text style={styles.fieldLabel}>Aktualne hasło</Text>
					<TextInput
						style={styles.input}
						placeholder="Aktualne hasło"
						placeholderTextColor={colors.placeholder}
						value={currentPassword}
						onChangeText={setCurrentPassword}
						secureTextEntry
						autoCapitalize="none"
						editable={!loading}
					/>
					<Text style={styles.fieldLabel}>Nowe hasło</Text>
					<TextInput
						style={styles.input}
						placeholder="Nowe hasło"
						placeholderTextColor={colors.placeholder}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoCapitalize="none"
						editable={!loading}
					/>
					<Text style={styles.fieldLabel}>Powtórz nowe hasło</Text>
					<TextInput
						style={styles.input}
						placeholder="Powtórz nowe hasło"
						placeholderTextColor={colors.placeholder}
						value={passwordConfirmation}
						onChangeText={setPasswordConfirmation}
						secureTextEntry
						autoCapitalize="none"
						editable={!loading}
					/>

					<Pressable
						style={({ pressed }) => [
							styles.button,
							loading && styles.buttonDisabled,
							pressed && !loading && styles.buttonPressed,
						]}
						onPress={handleSubmit}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color={colors.onAccent} size="small" />
						) : (
							<Text style={styles.buttonText}>Zapisz hasło</Text>
						)}
					</Pressable>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	flex: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		flexGrow: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		paddingBottom: 40,
	},
	form: {
		alignItems: 'stretch',
		width: '100%',
		maxWidth: 400,
	},
	hint: {
		fontSize: 13,
		lineHeight: 18,
		color: colors.textMuted,
		marginBottom: 18,
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.4,
		color: colors.textDim,
	},
	errorMessage: {
		fontSize: 14,
		color: colors.dangerText,
		marginBottom: 14,
	},
	successMessage: {
		fontSize: 14,
		color: colors.successBright,
		marginBottom: 14,
	},
	input: {
		marginBottom: 14,
		color: colors.text,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 14,
		fontSize: 15,
	},
	button: {
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		paddingVertical: 14,
		backgroundColor: colors.accent,
		borderRadius: 10,
		minHeight: 48,
	},
	buttonPressed: {
		backgroundColor: colors.accentHover,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
});

export default ChangePasswordScreen;
