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
import * as ImagePicker from 'expo-image-picker';
import useAuth from '../../hooks/useAuth';
import { deletePlayerAvatar, updatePlayerProfile, uploadPlayerAvatar } from '../../helpers/playerProfileApi';
import { userFacingErrorMessage } from '../../helpers/userFacingError';
import { colors } from '../../theme/colors';
import PlayerAvatar from '../Common/PlayerAvatar';

const MAX_DESCRIPTION = 1000;

const EditPlayerProfileScreen = ({ navigation, route }) => {
	const { auth, setAuth, persistSession, rememberMePreferred } = useAuth();
	const playerId = route?.params?.playerId;
	const initialDescription = route?.params?.description ?? '';
	const initialAvatarUrl = route?.params?.avatarUrl ?? null;

	const [description, setDescription] = useState(initialDescription);
	const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
	const [picked, setPicked] = useState(null);
	const [removeAvatar, setRemoveAvatar] = useState(false);
	const [errorMsg, setErrorMsg] = useState('');
	const [loading, setLoading] = useState(false);

	const previewUrl = removeAvatar ? null : (picked?.uri || avatarUrl);

	const parseErrorMessage = (data, extras = {}) => userFacingErrorMessage({
		data,
		...extras,
		fallback: extras.fallback || 'Nie udało się zapisać profilu',
	});

	const pickImage = async () => {
		if (loading) return;
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.85,
		});
		if (result.canceled) return;
		const asset = result.assets?.[0];
		if (!asset?.uri) return;
		setPicked({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
		setRemoveAvatar(false);
		setErrorMsg('');
	};

	const clearImage = () => {
		setPicked(null);
		setRemoveAvatar(true);
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
			let nextAvatarUrl = removeAvatar ? null : avatarUrl;

			if (picked) {
				const uploaded = await uploadPlayerAvatar(playerId, auth.accessToken, picked);
				if (!uploaded.ok) {
					setErrorMsg(parseErrorMessage(uploaded.data, {
						status: uploaded.status,
						fallback: 'Nie udało się zapisać zdjęcia',
					}));
					return;
				}
				nextAvatarUrl = uploaded.data?.avatarUrl ?? null;
			} else if (removeAvatar && avatarUrl) {
				const removed = await deletePlayerAvatar(playerId, auth.accessToken);
				if (!removed.ok) {
					setErrorMsg(parseErrorMessage(removed.data, {
						status: removed.status,
						fallback: 'Nie udało się usunąć zdjęcia',
					}));
					return;
				}
				nextAvatarUrl = null;
			}

			const { ok, data, status, error } = await updatePlayerProfile(
				playerId,
				auth.accessToken,
				{ description },
			);

			if (!ok) {
				setErrorMsg(parseErrorMessage(data, { error, status }));
				return;
			}

			if (auth?.playerId != null && String(auth.playerId) === String(playerId)) {
				const nextAuth = { ...auth, avatarUrl: nextAvatarUrl };
				setAuth(nextAuth);
				await persistSession(nextAuth, rememberMePreferred);
			}

			navigation.goBack();
		} catch (error) {
			setErrorMsg(userFacingErrorMessage({
				error,
				fallback: 'Nie udało się zapisać profilu',
			}));
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
					<Text style={styles.hint}>Krótki opis i zdjęcie widoczne na Twoim profilu.</Text>
					{errorMsg ? <Text style={styles.errorMessage}>{errorMsg}</Text> : null}
					<View style={styles.avatarBlock}>
						<PlayerAvatar
							name={auth?.playerName}
							avatarUrl={previewUrl}
							size={72}
							rounded={16}
						/>
						<View style={styles.avatarActions}>
							<Pressable
								style={styles.secondaryButton}
								onPress={pickImage}
								disabled={loading}
							>
								<Text style={styles.secondaryButtonText}>Wybierz zdjęcie</Text>
							</Pressable>
							{previewUrl ? (
								<Pressable
									style={styles.secondaryButton}
									onPress={clearImage}
									disabled={loading}
								>
									<Text style={styles.secondaryButtonText}>Usuń zdjęcie</Text>
								</Pressable>
							) : null}
						</View>
						<Text style={styles.avatarHint}>JPEG, PNG lub WebP, do 2 MB. Systemowy kadr przytnie zdjęcie do kwadratu.</Text>
					</View>
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
	avatarBlock: {
		alignItems: 'center',
		gap: 12,
		marginBottom: 20,
	},
	avatarActions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
	},
	secondaryButton: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	secondaryButtonText: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '700',
	},
	avatarHint: {
		fontSize: 12,
		lineHeight: 16,
		color: colors.textMuted,
		textAlign: 'center',
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
