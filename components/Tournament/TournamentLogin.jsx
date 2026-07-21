import React, { useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { loginWithPassword } from '../../helpers/authApi';
import { colors } from '../../theme/colors';

const TournamentLogin = () => {
	const {
		applyAuthFromApi,
		persistSession,
		rememberMePreferred,
		setRememberMePreferred,
	} = useAuth();
	const navigation = useNavigation();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errorMsg, setErrorMsg] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		if (loading) return;
		setErrorMsg('');
		setLoading(true);

		try {
			const { ok, data } = await loginWithPassword(email, password);

			if (!ok) {
				setErrorMsg(data?.message || 'Nieprawidłowy email lub hasło');
				return;
			}

			const nextAuth = applyAuthFromApi(data);
			await persistSession(nextAuth, rememberMePreferred);
		} catch {
			setErrorMsg('Nie udało się połączyć z serwerem');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Zaloguj się na konto</Text>
			<View style={styles.form}>
				<Text style={styles.errorMessage}>{errorMsg}</Text>
				<TextInput
					style={styles.input}
					placeholder="Email"
					value={email}
					onChangeText={setEmail}
					autoCorrect={false}
					autoCapitalize="none"
					keyboardType="email-address"
					editable={!loading}
				/>
				<TextInput
					style={styles.input}
					placeholder="Hasło"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
					autoCapitalize="none"
					editable={!loading}
				/>
				<View style={styles.rememberRow}>
					<Text style={styles.rememberLabel}>Zapamiętaj mnie</Text>
					<Switch
						value={rememberMePreferred}
						onValueChange={setRememberMePreferred}
						disabled={loading}
						trackColor={{ false: colors.textVeryDim, true: colors.accent }}
						thumbColor={colors.text}
					/>
				</View>
				<Pressable
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color={colors.onAccent} size="small" />
					) : (
						<Text style={styles.buttonText}>Zaloguj</Text>
					)}
				</Pressable>
				<Pressable
					style={styles.linkButton}
					onPress={() => navigation.navigate('AccountRegister')}
				>
					<Text style={styles.linkText}>Nie masz konta? Zarejestruj się</Text>
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
		marginBottom: 40,
		marginTop: 100,
	},
	form: {
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	errorMessage: {
		fontSize: 14,
		color: colors.dangerText,
		marginBottom: 20,
		textAlign: 'center',
		minHeight: 18,
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
	rememberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: 260,
		marginBottom: 8,
	},
	rememberLabel: {
		color: colors.textMuted,
		fontSize: 15,
	},
	rememberHint: {
		color: colors.placeholder,
		fontSize: 12,
		width: 260,
		textAlign: 'center',
		marginBottom: 12,
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

export default TournamentLogin;
