import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import { createSeason, fetchSeasonManage, updateSeason } from '../../helpers/competitionManageApi';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const SeasonFormScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const organizationId = route.params?.organizationId ?? null;
	const seasonId = route.params?.seasonId ?? null;
	const editing = seasonId != null;
	const [name, setName] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [loading, setLoading] = useState(editing);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(async () => {
		if (!editing) return;
		const result = await fetchSeasonManage(auth?.accessToken, seasonId);
		if (!result.ok) {
			setError(result.message);
			setLoading(false);
			return;
		}
		const season = result.data.season ?? {};
		setName(season.name ?? '');
		setStartDate(season.startDate ?? '');
		setEndDate(season.endDate ?? '');
		setLoading(false);
	}, [auth?.accessToken, editing, seasonId]);

	React.useEffect(() => {
		void load();
	}, [load]);

	const submit = async () => {
		const trimmed = name.trim();
		if (!trimmed) {
			setError('Podaj nazwę sezonu');
			return;
		}
		if (trimmed.length > 25) {
			setError('Nazwa może mieć najwyżej 25 znaków');
			return;
		}
		if (!DATE.test(startDate.trim()) || !DATE.test(endDate.trim())) {
			setError('Daty w formacie RRRR-MM-DD');
			return;
		}
		if (endDate.trim() < startDate.trim()) {
			setError('Data końca jest wcześniejsza niż start');
			return;
		}
		setSaving(true);
		setError('');
		const body = { name: trimmed, startDate: startDate.trim(), endDate: endDate.trim() };
		const result = editing
			? await updateSeason(auth?.accessToken, seasonId, body)
			: await createSeason(auth?.accessToken, organizationId, body);
		setSaving(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		if (!editing && result.data?.id) {
			navigation.replace('SeasonDetail', { id: result.data.id });
			return;
		}
		navigation.goBack();
	};

	if (loading) {
		return <ScreenLoading />;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.lead}>
				{editing ? 'Nazwa i zakres dat sezonu.' : 'Sezon zostanie dodany do tej organizacji.'}
			</Text>
			<TextInput
				style={styles.input}
				placeholder="Nazwa sezonu"
				placeholderTextColor={colors.placeholder}
				value={name}
				onChangeText={setName}
				maxLength={25}
			/>
			<TextInput
				style={styles.input}
				placeholder="Start RRRR-MM-DD"
				placeholderTextColor={colors.placeholder}
				value={startDate}
				onChangeText={setStartDate}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				placeholder="Koniec RRRR-MM-DD"
				placeholderTextColor={colors.placeholder}
				value={endDate}
				onChangeText={setEndDate}
				autoCapitalize="none"
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Pressable style={styles.button} onPress={submit} disabled={saving}>
				{saving ? <ActivityIndicator color={colors.onAccent} /> : (
					<Text style={styles.buttonText}>{editing ? 'Zapisz' : 'Stwórz sezon'}</Text>
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

export default SeasonFormScreen;
