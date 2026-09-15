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
import { updatePlayerProfile } from '../../helpers/playerProfileApi';
import { colors } from '../../theme/colors';

const MAX_DESCRIPTION = 1000;

const EditPlayerProfileScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const playerId = route?.params?.playerId;
	const initialDescription = route?.params?.description ?? '';

	const [description, setDescription] = useState(initialDescription);
	const [errorMsg, setErrorMsg] = useState('');
	const [loading, setLoading] = useState(false);

	const parseErrorMessage = (data) => {
		const firstField = data?.errors ? Object.values(data.errors)?.[0] : null;
		if (Array.isArray(firstField) && firstField[0]) {
			return firstField[0];
		}
		if (typeof data?.message === 'string') {
			return data.message;
		}
		return 'Nie udało się zapisać profilu';
	};

	const handleSubmit = async () => {
		if (loading) return;
		setErrorMsg('');

		if (!playerId || !auth?.accessToken) {
			setErrorMsg('Brak sesji — zaloguj się ponownie');
			return;
		}

		if (description.length > MAX_DESCRIPTION) {
			setErrorMsg(`Opis może mieć maksymalnie ${MAX_DESCRIPTION} znaków`);
			return;
		}

		setLoading(true);

		try {
			const { ok, data } = await updatePlayerProfile(
				playerId,
				auth.accessToken,
				{ description },
			);

			if (!ok) {
				setErrorMsg(parseErrorMessage(data));
				return;
			}

			navigation.goBack();
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
					<Text style={styles.hint}>Krótki opis widoczny na Twoim profilu.</Text>
					{errorMsg ? <Text style={styles.errorMessage}>{errorMsg}</Text> : null}
					<Text style={styles.fieldLabel}>Opis</Text>
					<TextInput
						style={styles.input}
						placeholder="Napisz coś o sobie…"
						placeholderTextColor={colors.placeholder}
						value={description}
						onChangeText={setDescription}
						multiline
						textAlignVertical="top"
						maxLength={MAX_DESCRIPTION}
						editable={!loading}
					/>
					<Text style={styles.counter}>
						{description.length}/{MAX_DESCRIPTION}
					</Text>
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
							<Text style={styles.buttonText}>Zapisz</Text>
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
	input: {
		minHeight: 140,
		marginBottom: 8,
		color: colors.text,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 14,
		fontSize: 15,
	},
	counter: {
		alignSelf: 'flex-end',
		color: colors.textDim,
		fontSize: 12,
		marginBottom: 16,
	},
	button: {
		alignItems: 'center',
		justifyContent: 'center',
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

export default EditPlayerProfileScreen;
