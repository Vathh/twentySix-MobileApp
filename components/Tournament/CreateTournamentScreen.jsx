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
	createOrganizationTournament,
	createSeasonTournament,
} from '../../helpers/tournamentManageApi';
import { colors } from '../../theme/colors';

const CreateTournamentScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const organizationId = route.params?.organizationId ?? null;
	const seasonId = route.params?.seasonId ?? null;
	const [name, setName] = useState('');
	const [date, setDate] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const submit = async () => {
		const trimmed = name.trim();
		if (!trimmed) {
			setError('Podaj nazwę turnieju');
			return;
		}
		if (trimmed.length > 25) {
			setError('Nazwa może mieć najwyżej 25 znaków');
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
			setError('Data w formacie RRRR-MM-DD');
			return;
		}

		setLoading(true);
		setError('');
		const body = { name: trimmed, date: date.trim() };
		const result = seasonId
			? await createSeasonTournament(auth?.accessToken, seasonId, body)
			: await createOrganizationTournament(auth?.accessToken, organizationId, body);
		setLoading(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		navigation.replace('TournamentDetail', { id: result.data.id });
	};

	return (
		<View style={styles.container}>
			<Text style={styles.lead}>
				{seasonId
					? 'Turniej zostanie dodany do tego sezonu.'
					: 'Turniej jednorazowy. Nie wchodzi do żadnego sezonu.'}
			</Text>
			<TextInput
				style={styles.input}
				placeholder="Nazwa turnieju"
				placeholderTextColor={colors.placeholder}
				value={name}
				onChangeText={setName}
				maxLength={25}
				editable={!loading}
			/>
			<TextInput
				style={styles.input}
				placeholder="Data RRRR-MM-DD"
				placeholderTextColor={colors.placeholder}
				value={date}
				onChangeText={setDate}
				autoCapitalize="none"
				editable={!loading}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Pressable style={styles.button} onPress={submit} disabled={loading}>
				{loading ? (
					<ActivityIndicator color={colors.onAccent} />
				) : (
					<Text style={styles.buttonText}>Stwórz turniej</Text>
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
	buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
});

export default CreateTournamentScreen;
