import React, { useCallback, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	fetchTournamentSetup,
	startTournament,
} from '../../helpers/tournamentManageApi';
import ScreenLoading from '../Common/ScreenLoading';
import { colors } from '../../theme/colors';

const FORMATS = [
	{ value: 'groups_playoff', label: 'Grupy i playoff' },
	{ value: 'single_elimination', label: 'Single elimination' },
	{ value: 'double_elimination', label: 'Double elimination' },
];

function nextPowerOfTwo(value) {
	let size = 1;
	while (size < value) {
		size *= 2;
	}
	return size;
}

const TournamentSetupScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const tournamentId = route.params?.tournamentId;
	const [setup, setSetup] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState('');
	const [format, setFormat] = useState('groups_playoff');
	const [groupsCount, setGroupsCount] = useState(null);
	const [bracketSize, setBracketSize] = useState(null);
	const [grandFinalMode, setGrandFinalMode] = useState('reset');
	const [consolation, setConsolation] = useState(false);
	const [consolationThird, setConsolationThird] = useState(false);
	const [formats, setFormats] = useState({});
	const seededFor = useRef(null);

	const applySetup = (data) => {
		setSetup(data);
		if (seededFor.current === tournamentId) {
			return;
		}
		seededFor.current = tournamentId;
		const groups = data.groupCountOptions ?? [];
		const firstGroups = groups[0] ?? null;
		setGroupsCount((current) => (groups.includes(current) ? current : firstGroups));
		const options = firstGroups != null ? data.bracketOptionsByGroupCount?.[String(firstGroups)] ?? [] : [];
		setBracketSize((current) => (
			options.some((option) => option.value === current) ? current : options[0]?.value ?? null
		));
		setFormat(groups.length > 0 ? 'groups_playoff' : 'single_elimination');
		const nextFormats = {};
		Object.entries(data.defaultMatchFormatsByStage ?? {}).forEach(([stage, row]) => {
			nextFormats[stage] = {
				startingScore: row.startingScore ?? 501,
				legsToWinSet: row.legsToWinSet ?? 2,
			};
		});
		setFormats(nextFormats);
	};

	const load = useCallback(async () => {
		const result = await fetchTournamentSetup(auth?.accessToken, tournamentId);
		if (!result.ok) {
			setError(result.message);
			setSetup(null);
		} else {
			setError('');
			applySetup(result.data);
		}
		setLoading(false);
	}, [auth?.accessToken, tournamentId]);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			void load();
		}, [load]),
	);

	if (loading) {
		return <ScreenLoading />;
	}

	if (!setup) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>{error || 'Nie udało się wczytać turnieju.'}</Text>
			</View>
		);
	}

	const count = setup.participantCount ?? 0;
	const minPlayers = setup.minPlayers ?? 4;
	const ready = count >= minPlayers;
	const groupOptions = setup.groupCountOptions ?? [];
	const bracketOptions = groupsCount != null
		? setup.bracketOptionsByGroupCount?.[String(groupsCount)] ?? []
		: [];
	const preview = groupsCount != null && bracketSize != null
		? setup.startConfigPreview?.[String(groupsCount)]?.[String(bracketSize)]
		: null;
	const stages = stagesFor(setup, format, bracketSize);
	const remaining = Math.max(0, count - (bracketSize ?? 0));
	const consolationSize = nextPowerOfTwo(Math.max(remaining, 1));

	const start = async () => {
		const matchFormats = {};
		stages.forEach((stage) => {
			const row = formats[stage.value] ?? {};
			const base = setup.defaultMatchFormatsByStage?.[stage.value] ?? {};
			matchFormats[stage.value] = {
				...base,
				startingScore: Number(row.startingScore) || 501,
				legsToWinSet: Number(row.legsToWinSet) || 2,
			};
		});
		setBusy('start');
		setError('');
		const result = await startTournament(auth?.accessToken, tournamentId, {
			tournamentFormat: format,
			groupsCount: format === 'groups_playoff' ? groupsCount : null,
			playoffBracketSize: format === 'groups_playoff' ? bracketSize : null,
			grandFinalMode: format === 'double_elimination' ? grandFinalMode : null,
			hasConsolationBracket: format === 'groups_playoff' && consolation,
			hasConsolationThirdPlace: format === 'groups_playoff' && consolation && consolationThird,
			matchFormats,
		});
		setBusy('');
		if (!result.ok) {
			setError(result.message);
			return;
		}
		navigation.replace('TournamentDetail', { id: tournamentId });
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Text style={styles.title}>{setup.tournament?.name}</Text>
			<Text style={styles.counter}>
				{count} / min. {minPlayers}
			</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}

				<>
					<Text style={styles.blockTitle}>Format turnieju</Text>
					{FORMATS.map((item) => {
						const disabled = item.value === 'groups_playoff' && groupOptions.length === 0;
						return (
							<Pressable
								key={item.value}
								style={[styles.choice, format === item.value && styles.choiceOn, disabled && styles.disabled]}
								disabled={disabled}
								onPress={() => setFormat(item.value)}
							>
								<Text style={styles.rowText}>{item.label}</Text>
							</Pressable>
						);
					})}
					{groupOptions.length === 0 ? (
						<Text style={styles.meta}>Grupy wymagają co najmniej 6 zawodników.</Text>
					) : null}

					{format === 'groups_playoff' ? (
						<>
							<Text style={styles.blockTitle}>Liczba grup</Text>
							<View style={styles.chips}>
								{groupOptions.map((value) => (
									<Pressable
										key={value}
										style={[styles.chip, groupsCount === value && styles.choiceOn]}
										onPress={() => {
											setGroupsCount(value);
											const next = setup.bracketOptionsByGroupCount?.[String(value)] ?? [];
											setBracketSize(next[0]?.value ?? null);
											setConsolation(false);
										}}
									>
										<Text style={styles.rowText}>{value}</Text>
									</Pressable>
								))}
							</View>
							<Text style={styles.blockTitle}>Drabinka</Text>
							<View style={styles.chips}>
								{bracketOptions.map((option) => (
									<Pressable
										key={option.value}
										style={[styles.chip, bracketSize === option.value && styles.choiceOn]}
										onPress={() => setBracketSize(option.value)}
									>
										<Text style={styles.rowText}>{option.label}</Text>
									</Pressable>
								))}
							</View>
							{preview ? (
								<View style={styles.block}>
									{preview.groupSizes.map((size, index) => (
										<Text key={index} style={styles.meta}>
											Grupa {index + 1}: {size} graczy → {preview.advances[index]} awansuje
										</Text>
									))}
								</View>
							) : null}
							{remaining >= 2 ? (
								<Pressable style={styles.row} onPress={() => setConsolation((value) => !value)}>
									<Text style={styles.rowText}>
										Drabinka pocieszenia {consolation ? '· włączona' : ''}
									</Text>
								</Pressable>
							) : null}
							{consolation && consolationSize >= 4 ? (
								<Pressable style={styles.row} onPress={() => setConsolationThird((value) => !value)}>
									<Text style={styles.rowText}>
										Mecz o 3. miejsce w pocieszeniu {consolationThird ? '· włączony' : ''}
									</Text>
								</Pressable>
							) : null}
						</>
					) : null}

					{format !== 'groups_playoff' ? (
						<Text style={styles.meta}>
							{count} graczy → drabinka {setup.seBracketSize}, wolne losy {setup.seByeCount}
						</Text>
					) : null}

					{format === 'double_elimination' ? (
						<View style={styles.chips}>
							{[
								['reset', 'Wielki finał z resetem'],
								['single', 'Jeden mecz'],
							].map(([value, label]) => (
								<Pressable
									key={value}
									style={[styles.chip, grandFinalMode === value && styles.choiceOn]}
									onPress={() => setGrandFinalMode(value)}
								>
									<Text style={styles.rowText}>{label}</Text>
								</Pressable>
							))}
						</View>
					) : null}

					<Text style={styles.blockTitle}>Format meczu</Text>
					{stages.map((stage) => {
						const row = formats[stage.value] ?? { startingScore: 501, legsToWinSet: 2 };
						return (
							<View key={stage.value} style={styles.formatRow}>
								<Text style={styles.rowText}>{stage.label}</Text>
								<TextInput
									style={styles.formatInput}
									keyboardType="number-pad"
									value={String(row.startingScore)}
									onChangeText={(value) => setFormats((current) => ({
										...current,
										[stage.value]: { ...row, startingScore: value.replace(/[^0-9]/g, '') },
									}))}
								/>
								<TextInput
									style={styles.formatInput}
									keyboardType="number-pad"
									value={String(row.legsToWinSet)}
									onChangeText={(value) => setFormats((current) => ({
										...current,
										[stage.value]: { ...row, legsToWinSet: value.replace(/[^0-9]/g, '') },
									}))}
								/>
							</View>
						);
					})}
					<Text style={styles.meta}>Punkty startowe i liczba legów do wygrania seta.</Text>

					{!ready ? (
						<Text style={styles.meta}>
							Wróć do widoku turnieju i zbierz co najmniej {minPlayers} osób.
						</Text>
					) : null}
					<Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
						<Text style={styles.secondaryText}>Wróć do składu</Text>
					</Pressable>
					<Pressable style={styles.button} onPress={start} disabled={busy === 'start' || !ready}>
						{busy === 'start' ? (
							<ActivityIndicator color={colors.onAccent} />
						) : (
							<Text style={styles.buttonText}>Wystartuj turniej</Text>
						)}
					</Pressable>
				</>
		</ScrollView>
	);
};

function stagesFor(setup, format, bracketSize) {
	if (format === 'single_elimination') {
		return setup.matchFormatStagesByBracketSe?.[String(setup.seBracketSize)] ?? [];
	}
	if (format === 'double_elimination') {
		return setup.matchFormatStagesByBracketDe?.[String(setup.seBracketSize)] ?? [];
	}
	return setup.matchFormatStagesByBracket?.[String(bracketSize)] ?? [];
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, paddingBottom: 48 },
	centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
	title: { color: colors.text, fontSize: 22, fontWeight: '700' },
	counter: { marginTop: 6, marginBottom: 12, color: colors.accent, fontWeight: '700' },
	error: { color: colors.dangerText, marginBottom: 12, fontSize: 14 },
	block: { marginBottom: 12 },
	blockTitle: { marginTop: 16, marginBottom: 8, color: colors.text, fontSize: 15, fontWeight: '700' },
	code: { color: colors.accent, fontSize: 24, fontWeight: '700', letterSpacing: 3 },
	meta: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	rowText: { flex: 1, color: colors.text, fontSize: 15 },
	link: { color: colors.accent, fontWeight: '700', fontSize: 14 },
	input: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		color: colors.text,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
	},
	searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
	searchInput: { flex: 1 },
	smallButton: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	smallButtonText: { color: colors.onAccent, fontWeight: '700' },
	button: {
		marginTop: 20,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
	secondary: {
		marginTop: 12,
		borderWidth: 1,
		borderColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
	},
	secondaryText: { color: colors.accent, fontWeight: '700' },
	disabled: { opacity: 0.45 },
	choice: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
	},
	choiceOn: { borderColor: colors.accent },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
	},
	formatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
	formatInput: {
		width: 72,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		color: colors.text,
		paddingHorizontal: 8,
		paddingVertical: 8,
		textAlign: 'center',
	},
});

export default TournamentSetupScreen;
