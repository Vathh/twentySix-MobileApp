import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useAuth from '../../hooks/useAuth';
import {
	createOrganization,
	fetchOrganizationManage,
	updateOrganization,
	uploadOrganizationLogo,
} from '../../helpers/competitionManageApi';
import { colors } from '../../theme/colors';
import PlayerAvatar from '../Common/PlayerAvatar';
import ScreenLoading from '../Common/ScreenLoading';

const OrganizationFormScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const organizationId = route.params?.organizationId ?? null;
	const editing = organizationId != null;
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [logoUrl, setLogoUrl] = useState(null);
	const [initials, setInitials] = useState('');
	const [picked, setPicked] = useState(null);
	const [removeLogo, setRemoveLogo] = useState(false);
	const [stages, setStages] = useState([]);
	const [formats, setFormats] = useState({});
	const [loading, setLoading] = useState(editing);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(async () => {
		if (!editing) return;
		const result = await fetchOrganizationManage(auth?.accessToken, organizationId);
		if (!result.ok) {
			setError(result.message);
			setLoading(false);
			return;
		}
		const organization = result.data.organization ?? {};
		setName(organization.name ?? '');
		setDescription(organization.description ?? '');
		setLogoUrl(organization.logoUrl ?? null);
		setInitials(organization.initials ?? '');
		setStages(result.data.matchFormatStages ?? []);
		setFormats(result.data.matchFormats ?? {});
		setLoading(false);
	}, [auth?.accessToken, editing, organizationId]);

	React.useEffect(() => {
		void load();
	}, [load]);

	const pickLogo = async () => {
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
		setRemoveLogo(false);
	};

	const setFormat = (stage, field, value) => {
		setFormats((current) => ({
			...current,
			[stage]: {
				...(current[stage] ?? {}),
				[field]: value.replace(/[^0-9]/g, ''),
			},
		}));
	};

	const submit = async () => {
		const trimmed = name.trim();
		if (!trimmed) {
			setError('Podaj nazwę organizacji');
			return;
		}
		if (description.length > 500) {
			setError('Opis może mieć najwyżej 500 znaków');
			return;
		}
		setSaving(true);
		setError('');
		const token = auth?.accessToken;
		if (!editing) {
			const created = await createOrganization(token, {
				name: trimmed,
				description: description.trim() || null,
			});
			setSaving(false);
			if (!created.ok) {
				setError(created.message);
				return;
			}
			navigation.replace('OrganizationDetail', { id: created.data.id });
			return;
		}

		const matchFormats = {};
		stages.forEach((stage) => {
			const row = formats[stage.value] ?? {};
			matchFormats[stage.value] = {
				...row,
				startingScore: Number(row.startingScore) || 501,
				legsToWinSet: Number(row.legsToWinSet) || 2,
				setsToWinMatch: Number(row.setsToWinMatch) || 1,
			};
		});
		const saved = await updateOrganization(token, organizationId, {
			name: trimmed,
			description: description.trim() || null,
			matchFormats,
			removeLogo: removeLogo && !picked,
		});
		if (!saved.ok) {
			setSaving(false);
			setError(saved.message);
			return;
		}
		if (picked) {
			const uploaded = await uploadOrganizationLogo(token, organizationId, picked);
			setSaving(false);
			if (!uploaded.ok) {
				setError(uploaded.message);
				return;
			}
		} else {
			setSaving(false);
		}
		navigation.goBack();
	};

	if (loading) {
		return <ScreenLoading />;
	}

	const preview = removeLogo && !picked ? null : (picked?.uri || logoUrl);

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
			{editing ? (
				<View style={styles.logoBlock}>
					<PlayerAvatar name={name} initials={initials} avatarUrl={preview} size={72} rounded={16} />
					<View style={styles.logoActions}>
						<Pressable style={styles.secondary} onPress={pickLogo}>
							<Text style={styles.secondaryText}>Wybierz logo</Text>
						</Pressable>
						{preview ? (
							<Pressable
								style={styles.secondary}
								onPress={() => {
									setPicked(null);
									setRemoveLogo(true);
								}}
							>
								<Text style={styles.secondaryText}>Usuń logo</Text>
							</Pressable>
						) : null}
					</View>
					<Text style={styles.hint}>Kwadratowy kadr, JPEG, PNG lub WebP, do 2 MB.</Text>
				</View>
			) : null}
			<TextInput
				style={styles.input}
				placeholder="Nazwa organizacji"
				placeholderTextColor={colors.placeholder}
				value={name}
				onChangeText={setName}
			/>
			<TextInput
				style={[styles.input, styles.area]}
				placeholder="Opis (opcjonalnie)"
				placeholderTextColor={colors.placeholder}
				value={description}
				onChangeText={setDescription}
				multiline
				maxLength={500}
			/>
			<Text style={styles.counter}>{description.length}/500</Text>
			{editing && stages.length > 0 ? (
				<View style={styles.block}>
					<Text style={styles.section}>Presety formatu gry</Text>
					<Text style={styles.hint}>
						Te wartości wczytają się przy starcie turnieju. Przy starcie nadal można je nadpisać.
					</Text>
					{stages.map((stage) => {
						const row = formats[stage.value] ?? {};
						return (
							<View key={stage.value} style={styles.stage}>
								<Text style={styles.stageTitle}>{stage.label}</Text>
								<View style={styles.stageRow}>
									<TextInput
										style={[styles.input, styles.compact]}
										keyboardType="number-pad"
										value={String(row.startingScore ?? '')}
										onChangeText={(value) => setFormat(stage.value, 'startingScore', value)}
										placeholder="Punkty"
										placeholderTextColor={colors.placeholder}
									/>
									<TextInput
										style={[styles.input, styles.compact]}
										keyboardType="number-pad"
										value={String(row.legsToWinSet ?? '')}
										onChangeText={(value) => setFormat(stage.value, 'legsToWinSet', value)}
										placeholder="Legi"
										placeholderTextColor={colors.placeholder}
									/>
									<TextInput
										style={[styles.input, styles.compact]}
										keyboardType="number-pad"
										value={String(row.setsToWinMatch ?? '')}
										onChangeText={(value) => setFormat(stage.value, 'setsToWinMatch', value)}
										placeholder="Sety"
										placeholderTextColor={colors.placeholder}
									/>
								</View>
							</View>
						);
					})}
				</View>
			) : null}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Pressable style={styles.button} onPress={submit} disabled={saving}>
				{saving ? <ActivityIndicator color={colors.onAccent} /> : (
					<Text style={styles.buttonText}>{editing ? 'Zapisz' : 'Stwórz organizację'}</Text>
				)}
			</Pressable>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, paddingBottom: 40 },
	logoBlock: { alignItems: 'center', marginBottom: 16 },
	logoActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
	secondary: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	secondaryText: { color: colors.text, fontWeight: '600' },
	hint: { color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' },
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
	area: { minHeight: 110, textAlignVertical: 'top' },
	counter: { textAlign: 'right', color: colors.textMuted, marginTop: -8, marginBottom: 12 },
	block: { marginBottom: 12 },
	section: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 4 },
	stage: { marginTop: 10 },
	stageTitle: { color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
	stageRow: { flexDirection: 'row', gap: 8 },
	compact: { flex: 1, marginBottom: 0 },
	error: { color: colors.dangerText, marginBottom: 12, fontSize: 14 },
	button: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
});

export default OrganizationFormScreen;
