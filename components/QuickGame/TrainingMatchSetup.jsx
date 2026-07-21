import React, { useEffect, useMemo, useState } from 'react';
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import MatchFormatPicker, { DEFAULT_MATCH_FORMAT } from './MatchFormatPicker';
import { normalizeMatchFormat } from '../../helpers/matchFormat/matchFormat';
import {
	loadPersistedMatchFormat,
	savePersistedMatchFormat,
} from '../../helpers/matchFormat/persistMatchFormat';
import { colors } from '../../theme/colors';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

const TrainingMatchSetup = ({ navigation }) => {
	const [playerCount, setPlayerCount] = useState(2);
	const [names, setNames] = useState(['Gracz 1', 'Gracz 2']);
	const [matchFormat, setMatchFormat] = useState(DEFAULT_MATCH_FORMAT);

	useEffect(() => {
		loadPersistedMatchFormat('training').then(setMatchFormat);
	}, []);

	const trimmedNames = useMemo(
		() =>
			names.slice(0, playerCount).map((n, i) => {
				const t = (n ?? '').trim();
				return t.length > 0 ? t : `Gracz ${i + 1}`;
			}),
		[names, playerCount],
	);

	const setCount = (count) => {
		const next = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));
		setPlayerCount(next);
		setNames((prev) => {
			const copy = [...prev];
			while (copy.length < next) {
				copy.push(`Gracz ${copy.length + 1}`);
			}
			return copy;
		});
	};

	const updateName = (index, value) => {
		setNames((prev) => {
			const copy = [...prev];
			copy[index] = value;
			return copy;
		});
	};

	const startTraining = async () => {
		const format = normalizeMatchFormat(matchFormat);
		await savePersistedMatchFormat('training', format);

		const players = trimmedNames.map((name, i) => ({
			id: i + 1,
			name,
			playerId: null,
		}));

		navigation.navigate('GameScoring', {
			trainingGame: {
				players,
				matchFormat: format,
				gameType: format.gameType,
				scoringMode: 'one_device',
				isHost: true,
				myPlayerIndex: 0,
			},
		});
	};

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={styles.title}>Mecz treningowy</Text>
			<Text style={styles.hint}>
				Bez konta i bez internetu. Wynik nie jest zapisywany — aplikacja służy
				tylko do liczenia punktów podczas gry.
			</Text>

			<View style={styles.section}>
				<Text style={styles.label}>Liczba graczy (2–8)</Text>
				<View style={styles.countRow}>
					<Pressable
						style={styles.countBtn}
						onPress={() => setCount(playerCount - 1)}
					>
						<Text style={styles.countBtnText}>−</Text>
					</Pressable>
					<Text style={styles.countValue}>{playerCount}</Text>
					<Pressable
						style={styles.countBtn}
						onPress={() => setCount(playerCount + 1)}
					>
						<Text style={styles.countBtnText}>+</Text>
					</Pressable>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Imiona zawodników</Text>
				<Text style={styles.hintSmall}>
					Jeden telefon wpisuje rzuty wszystkich (tryb jedno urządzenie).
				</Text>
				{trimmedNames.map((_, i) => (
					<TextInput
						key={i}
						style={styles.input}
						value={names[i] ?? ''}
						onChangeText={(v) => updateName(i, v)}
						placeholder={`Gracz ${i + 1}`}
						placeholderTextColor={colors.placeholder}
						maxLength={32}
					/>
				))}
			</View>

			<View style={styles.section}>
				<MatchFormatPicker
					value={matchFormat}
					onChange={setMatchFormat}
				/>
			</View>

			<Pressable style={styles.startBtn} onPress={startTraining}>
				<Text style={styles.startBtnText}>Rozpocznij trening</Text>
			</Pressable>

			<Pressable
				style={styles.backBtn}
				onPress={() => {
					if (navigation.canGoBack()) {
						navigation.goBack();
					}
				}}
			>
				<Text style={styles.backBtnText}>Wróć</Text>
			</Pressable>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	container: {
		padding: 20,
		paddingBottom: 40,
	},
	title: {
		fontSize: 22,
		color: colors.accent,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	hint: {
		fontSize: 14,
		color: colors.textMuted,
		textAlign: 'center',
		marginBottom: 24,
		lineHeight: 20,
	},
	section: {
		marginBottom: 22,
	},
	label: {
		fontSize: 16,
		color: colors.text,
		marginBottom: 14,
		fontWeight: '500',
	},
	hintSmall: {
		fontSize: 13,
		color: colors.textDim,
		marginBottom: 10,
	},
	countRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
	},
	countBtn: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countBtnText: {
		fontSize: 24,
		color: colors.text,
		fontWeight: '600',
	},
	countValue: {
		fontSize: 28,
		color: colors.accent,
		minWidth: 40,
		textAlign: 'center',
	},
	input: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 6,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		color: colors.text,
		marginBottom: 8,
	},
	startBtn: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
	},
	startBtnText: {
		color: colors.onAccent,
		fontSize: 17,
		fontWeight: '600',
	},
	backBtn: {
		marginTop: 16,
		alignItems: 'center',
		paddingVertical: 10,
	},
	backBtnText: {
		color: colors.textMuted,
		fontSize: 15,
	},
});

export default TrainingMatchSetup;
