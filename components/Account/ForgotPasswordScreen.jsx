import React, { useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { requestPasswordReset } from '../../helpers/authApi';
import { userFacingErrorMessage } from '../../helpers/userFacingError';
import { colors } from '../../theme/colors';

const SENT_MESSAGE = 'Jeśli konto z tym adresem istnieje, wysłaliśmy link do ustawienia nowego hasła.';

const ForgotPasswordScreen = () => {
	const navigation = useNavigation();
	const [email, setEmail] = useState('');
	const [errorMsg, setErrorMsg] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		if (loading) return;
		setErrorMsg('');
		setSuccessMsg('');

		const trimmed = email.trim();
		if (!trimmed) {
			setErrorMsg('Podaj adres email');
			return;
		}

		setLoading(true);
		try {
			const { ok, data, status, error } = await requestPasswordReset(trimmed);
			if (!ok) {
				setErrorMsg(userFacingErrorMessage({
					error,
					status,
					data,
					fallback: 'Nie udało się wysłać linku',
				}));
				return;
			}
			setSuccessMsg(data?.message || SENT_MESSAGE);
		} catch (error) {
			setErrorMsg(userFacingErrorMessage({
				error,
				fallback: 'Nie udało się wysłać linku',
			}));
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Nie pamiętam hasła</Text>
			<View style={styles.form}>
				<Text style={styles.hint}>
					Podaj email konta. Wyślemy link do ustawienia nowego hasła.
				</Text>
				<Text style={styles.errorMessage}>{errorMsg}</Text>
				{successMsg ? <Text style={styles.successMessage}>{successMsg}</Text> : null}
				<TextInput
					style={styles.input}
					placeholder="Email"
					placeholderTextColor={colors.placeholder}
					value={email}
					onChangeText={setEmail}
					autoCorrect={false}
					autoCapitalize="none"
					keyboardType="email-address"
					editable={!loading}
				/>
				<Pressable
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color={colors.onAccent} size="small" />
					) : (
						<Text style={styles.buttonText}>Wyślij link</Text>
					)}
				</Pressable>
				<Pressable
					style={styles.linkButton}
					onPress={() => navigation.navigate('AccountLogin')}
				>
					<Text style={styles.linkText}>Wróć do logowania</Text>
				</Pressable>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
		alignItems: 'center',
	},
	title: {
		fontSize: 24,
		color: colors.textMuted,
		marginBottom: 24,
		marginTop: 80,
	},
	form: {
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	hint: {
		color: colors.textMuted,
		fontSize: 14,
		textAlign: 'center',
		width: 260,
		marginBottom: 16,
	},
	errorMessage: {
		fontSize: 14,
		color: colors.dangerText,
		marginBottom: 12,
		textAlign: 'center',
		minHeight: 18,
	},
	successMessage: {
		fontSize: 14,
		color: colors.success,
		marginBottom: 12,
		textAlign: 'center',
		width: 260,
	},
	input: {
		marginBottom: 20,
		color: colors.text,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 5,
		width: 260,
		paddingVertical: 8,
		paddingHorizontal: 10,
		fontSize: 16,
	},
	button: {
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
		paddingVertical: 7,
		paddingHorizontal: 14,
		minWidth: 100,
		minHeight: 34,
		backgroundColor: colors.accent,
		borderRadius: 5,
	},
	buttonDisabled: {
		opacity: 0.85,
	},
	buttonText: {
		color: colors.onAccent,
		fontWeight: '600',
	},
	linkButton: {
		marginTop: 20,
		padding: 8,
	},
	linkText: {
		color: colors.accent,
		fontSize: 15,
	},
});

export default ForgotPasswordScreen;
