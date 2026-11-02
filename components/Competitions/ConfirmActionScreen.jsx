import React, { useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import {
	cancelTournamentPlay,
	deleteOrganization,
	deleteSeason,
	deleteTournament,
} from '../../helpers/competitionManageApi';
import { colors } from '../../theme/colors';

const ConfirmActionScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const {
		mode = 'delete',
		entity,
		id,
		name,
		organizationId = null,
		seasonId = null,
	} = route.params ?? {};
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const deleting = mode === 'delete';

	const submit = async () => {
		if (!password) {
			setError('Podaj hasło konta');
			return;
		}
		if (deleting && confirmation !== name) {
			setError('Wpisz dokładnie nazwę, żeby potwierdzić usunięcie.');
			return;
		}
		setSaving(true);
		setError('');
		const token = auth?.accessToken;
		let result;
		if (!deleting) {
			result = await cancelTournamentPlay(token, id, password);
		} else if (entity === 'organization') {
			result = await deleteOrganization(token, id, {
				delete_password: password,
				entity_name_confirmation: confirmation,
			});
		} else if (entity === 'season') {
			result = await deleteSeason(token, id, {
				delete_password: password,
				entity_name_confirmation: confirmation,
			});
		} else {
			result = await deleteTournament(token, id, {
				delete_password: password,
				entity_name_confirmation: confirmation,
			});
		}
		setSaving(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		if (!deleting) {
			navigation.goBack();
			return;
		}
		if (entity === 'season' && organizationId) {
			navigation.navigate('OrganizationDetail', { id: organizationId });
			return;
		}
		if (entity === 'tournament' && seasonId) {
			navigation.navigate('SeasonDetail', { id: seasonId });
			return;
		}
		if (entity === 'tournament' && organizationId) {
			navigation.navigate('OrganizationDetail', { id: organizationId });
			return;
		}
		navigation.pop(2);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.lead}>
				{deleting
					? `„${name}” zniknie z aplikacji. Przez 90 dni przywrócić może operator platformy.`
					: 'Rozgrywki zostaną wyzerowane. Skład zostanie, turniej wróci do planowania.'}
			</Text>
			{deleting ? (
				<TextInput
					style={styles.input}
					placeholder="Wpisz nazwę"
					placeholderTextColor={colors.placeholder}
					value={confirmation}
					onChangeText={setConfirmation}
					autoCapitalize="none"
				/>
			) : null}
			<TextInput
				style={styles.input}
				placeholder="Hasło konta"
				placeholderTextColor={colors.placeholder}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Pressable style={[styles.button, deleting && styles.dangerButton]} onPress={submit} disabled={saving}>
				{saving ? <ActivityIndicator color={colors.onAccent} /> : (
					<Text style={styles.buttonText}>{deleting ? 'Usuń' : 'Anuluj rozgrywki'}</Text>
				)}
			</Pressable>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
	lead: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 },
	input: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		color: colors.text,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 12,
		fontSize: 16,
	},
	error: { color: colors.dangerText, marginBottom: 12, fontSize: 14 },
	button: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	dangerButton: { backgroundColor: colors.danger },
	buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
});

export default ConfirmActionScreen;
