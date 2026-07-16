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
						placeholderTextColor="#999"
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
		backgroundColor: '#363062',
	},
	container: {
		padding: 20,
		paddingBottom: 40,
	},
	title: {
		fontSize: 22,
		color: '#F99417',
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	hint: {
		fontSize: 14,
		color: '#c5c5c5',
		textAlign: 'center',
		marginBottom: 24,
		lineHeight: 20,
	},
	section: {
		marginBottom: 22,
	},
	label: {
		fontSize: 16,
		color: '#f5f5f5',
		marginBottom: 14,
		fontWeight: '500',
	},
	hintSmall: {
		fontSize: 13,
		color: '#aaa',
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
		backgroundColor: '#f5f5f5cc',
		alignItems: 'center',
		justifyContent: 'center',
	},
	countBtnText: {
		fontSize: 24,
		color: '#363062',
		fontWeight: '600',
	},
	countValue: {
		fontSize: 28,
		color: '#F99417',
		minWidth: 40,
		textAlign: 'center',
	},
	input: {
		backgroundColor: '#f5f5f5cc',
		borderRadius: 6,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		color: '#363062',
		marginBottom: 8,
	},
	startBtn: {
		backgroundColor: '#F99417',
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
	},
	startBtnText: {
		color: '#363062',
		fontSize: 17,
		fontWeight: '600',
	},
	backBtn: {
		marginTop: 16,
		alignItems: 'center',
		paddingVertical: 10,
	},
	backBtnText: {
		color: '#c5c5c5',
		fontSize: 15,
	},
});

export default TrainingMatchSetup;
