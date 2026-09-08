import React, { useState } from 'react';
import {
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import MatchFormatPicker, { DEFAULT_MATCH_FORMAT } from './MatchFormatPicker';
import { normalizeMatchFormat } from '../../helpers/matchFormat/matchFormat';
import {
	loadPersistedMatchFormat,
	savePersistedMatchFormat,
} from '../../helpers/matchFormat/persistMatchFormat';
import {
	addCachedTempName,
	getCachedTempNames,
	removeCachedTempName,
} from '../../helpers/tempPlayerCache';
import {
	loadPersistedTrainingPlayers,
	savePersistedTrainingPlayers,
	displayTrainingPlayerName,
	makeSelfTrainingPlayer,
	dropStaleSelfSlots,
} from '../../helpers/persistTrainingPlayers';
import useAuth from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmProvider';
import { removeTempPlayerStats } from '../../helpers/trainingHistory/persistTempPlayerStats';
import { colors } from '../../theme/colors';

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 8;

const TrainingMatchSetup = ({ navigation, route }) => {
	const { auth } = useAuth();
	const confirm = useConfirm();
	const [players, setPlayers] = useState([]);
	const [playersLoaded, setPlayersLoaded] = useState(false);
	const [matchFormat, setMatchFormat] = useState(DEFAULT_MATCH_FORMAT);
	const [playerModalVisible, setPlayerModalVisible] = useState(false);
	const [playerName, setPlayerName] = useState('');
	const [cachedPlayerNames, setCachedPlayerNames] = useState([]);
	const [selectedNames, setSelectedNames] = useState([]);

	React.useEffect(() => {
		const prefill = route?.params?.prefill;
		if (prefill) {
			if (Array.isArray(prefill.players) && prefill.players.length > 0) {
				setPlayers(
					prefill.players.map((p, i) => ({
						id: p.id ?? Date.now() + i,
						name: p.name,
					})),
				);
			}
			if (prefill.matchFormat) {
				setMatchFormat(normalizeMatchFormat(prefill.matchFormat));
			}
			setPlayersLoaded(true);
			return;
		}

		loadPersistedMatchFormat('training').then(setMatchFormat);
		loadPersistedTrainingPlayers().then((list) => {
			const cleaned = dropStaleSelfSlots(list, auth?.playerId);
			if (cleaned.length === 0 && auth?.playerId) {
				const self = makeSelfTrainingPlayer(auth);
				setPlayers(self ? [self] : []);
			} else {
				setPlayers(cleaned);
			}
			setPlayersLoaded(true);
		});
	}, [route?.params?.prefill, auth?.playerId, auth?.playerName]);

	React.useEffect(() => {
		if (!playersLoaded) return;
		if (auth?.playerId && players.length === 0) {
			const self = makeSelfTrainingPlayer(auth);
			if (self) {
				setPlayers([self]);
				return;
			}
		}
		savePersistedTrainingPlayers(players);
	}, [players, playersLoaded, auth?.playerId, auth?.playerName]);

	const isAlreadyInGame = (name) =>
		players.some((p) => p.name.toLowerCase() === name.toLowerCase());

	const openPlayerModal = async () => {
		setPlayerName('');
		setSelectedNames([]);
		setPlayerModalVisible(true);
		const names = await getCachedTempNames();
		setCachedPlayerNames(names);
	};

	const handleAddToBase = async () => {
		const name = playerName.trim();
		if (!name) {
			Alert.alert('Błąd', 'Podaj imię zawodnika');
			return;
		}
		const existsInBase = cachedPlayerNames.some(
			(n) => n.toLowerCase() === name.toLowerCase(),
		);
		if (existsInBase) {
			Alert.alert('Błąd', 'Ten zawodnik jest już w bazie');
			return;
		}
		await addCachedTempName(name);
		setCachedPlayerNames((prev) => [name, ...prev.filter((n) => n !== name)]);
		if (!isAlreadyInGame(name)) {
			setSelectedNames((prev) =>
				prev.some((n) => n.toLowerCase() === name.toLowerCase())
					? prev
					: [...prev, name],
			);
		}
		setPlayerName('');
	};

	const toggleSelected = (name) => {
		if (isAlreadyInGame(name)) return;
		setSelectedNames((prev) =>
			prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
		);
	};

	const handleConfirmAdd = () => {
		if (selectedNames.length === 0) {
			Alert.alert('Błąd', 'Zaznacz co najmniej jednego gracza z bazy');
			return;
		}
		const slotsLeft = MAX_PLAYERS - players.length;
		if (slotsLeft <= 0) {
			Alert.alert('Błąd', `Maksymalnie ${MAX_PLAYERS} graczy`);
			return;
		}
		const toAdd = selectedNames.filter((name) => !isAlreadyInGame(name));
		if (toAdd.length === 0) {
			Alert.alert('Błąd', 'Wybrani gracze są już na liście');
			return;
		}
		if (toAdd.length > slotsLeft) {
			Alert.alert(
				'Błąd',
				`Możesz dodać jeszcze tylko ${slotsLeft} graczy (limit ${MAX_PLAYERS})`,
			);
			return;
		}
		const now = Date.now();
		setPlayers((prev) => [
			...prev,
			...toAdd.map((name, i) => ({ id: now + i, name })),
		]);
		setPlayerModalVisible(false);
	};

	const handleRemoveFromBase = async (name) => {
		setPlayerModalVisible(false);
		const ok = await confirm({
			title: 'Usuń z bazy',
			message: `Czy na pewno chcesz usunąć z bazy gracza ${name}?`,
			confirmLabel: 'Usuń',
		});
		if (!ok) {
			setPlayerModalVisible(true);
			return;
		}
		await removeCachedTempName(name);
		await removeTempPlayerStats(name);
		setCachedPlayerNames((prev) => prev.filter((n) => n !== name));
		setSelectedNames((prev) => prev.filter((n) => n !== name));
		setPlayerModalVisible(true);
	};

	const removePlayer = (id) => {
		setPlayers((prev) => prev.filter((p) => p.id !== id));
	};

	const shufflePlayerOrder = () => {
		setPlayers((prev) => {
			const arr = [...prev];
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		});
	};

	const startTraining = async () => {
		const format = normalizeMatchFormat(matchFormat);
		const minPlayers = MIN_PLAYERS;
		if (players.length < minPlayers) {
			Alert.alert(
				'Błąd',
				'Dodaj co najmniej jednego gracza',
			);
			return;
		}
		await savePersistedMatchFormat('training', format);
		await savePersistedTrainingPlayers(players);

		const trainingPlayers = players.map((p, i) => ({
			id: i + 1,
			name: displayTrainingPlayerName(p),
			playerId: p.isSelf ? p.accountPlayerId : null,
			isSelf: !!p.isSelf,
			accountPlayerId: p.isSelf ? p.accountPlayerId : null,
		}));

		navigation.navigate('GameScoring', {
			trainingGame: {
				players: trainingPlayers,
				matchFormat: format,
				gameType: format.gameType,
				scoringMode: 'one_device',
				isHost: true,
				myPlayerIndex: 0,
			},
		});
	};

	const canStart = players.length >= MIN_PLAYERS;

	const listHeader = (
		<>
			<Text style={styles.title}>Mecz treningowy</Text>
			<Text style={styles.hint}>
				{auth?.playerId
					? 'Slot „JA” to Twoje konto — tylko jego statystyki trafiają do kariery. Kumpli z imion lokalnych nie zapisujemy na serwerze. Możesz usunąć JA i grać pod innym imieniem.'
					: 'Bez konta trening zostaje tylko na tym telefonie. Zaloguj się, żeby slot JA zapisywał się w karierze.'}
			</Text>

			<View style={styles.section}>
				<Text style={styles.label}>Zawodnicy (max 8)</Text>
				<Text style={styles.hintSmall}>
					Jeden telefon wpisuje rzuty wszystkich (tryb jedno urządzenie).
					Można grać solo albo z innymi (max 8).
					{players.length > 0
						? ' Kolejność rzucania od góry — przytrzymaj wiersz i przeciągnij, albo użyj „Kolejność losowa”.'
						: ''}
				</Text>
				{players.length < MAX_PLAYERS && (
					<Pressable style={styles.addPlayerButton} onPress={openPlayerModal}>
						<Text style={styles.addPlayerButtonText}>+ Dodaj gracza</Text>
					</Pressable>
				)}
				{players.length >= MAX_PLAYERS && (
					<Text style={styles.hintSmall}>
						Osiągnięto limit {MAX_PLAYERS} graczy.
					</Text>
				)}
			</View>
		</>
	);

	const listFooter = (
		<>
			{players.length > 1 && (
				<Pressable style={styles.reorderButtonSecondary} onPress={shufflePlayerOrder}>
					<Text style={styles.reorderButtonTextSecondary}>Kolejność losowa</Text>
				</Pressable>
			)}

			<View style={styles.section}>
				<MatchFormatPicker
					value={matchFormat}
					onChange={setMatchFormat}
				/>
			</View>

			<Pressable
				style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
				onPress={startTraining}
				disabled={!canStart}
			>
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
		</>
	);

	const playerModal = (
		<Modal
			visible={playerModalVisible}
			transparent
			animationType="fade"
			onRequestClose={() => setPlayerModalVisible(false)}
		>
			<View style={styles.modalOverlay}>
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={() => setPlayerModalVisible(false)}
				/>
				<View style={styles.modalContent}>
					<Text style={styles.modalTitle}>Dodaj gracza</Text>

					<Text style={styles.modalSectionLabel}>Imię zawodnika</Text>
					<TextInput
						style={styles.guestInput}
						value={playerName}
						onChangeText={setPlayerName}
						placeholder="Wpisz imię"
						placeholderTextColor={colors.placeholder}
						maxLength={50}
						autoCapitalize="words"
					/>
					<Pressable
						style={[
							styles.addToBaseBtn,
							!playerName.trim() && styles.addToBaseBtnDisabled,
						]}
						onPress={handleAddToBase}
						disabled={!playerName.trim()}
					>
						<Text style={styles.addToBaseBtnText}>Dodaj do bazy</Text>
					</Pressable>

					<View style={styles.playerBaseWrap}>
						<Text style={styles.modalSectionLabel}>Baza graczy</Text>
						{cachedPlayerNames.length === 0 ? (
							<Text style={styles.playerBaseEmpty}>
								Brak zapisanych graczy. Wpisz imię powyżej i dodaj do bazy.
							</Text>
						) : (
							<ScrollView
								style={styles.playerBaseList}
								nestedScrollEnabled
								keyboardShouldPersistTaps="handled"
							>
								{cachedPlayerNames.map((n) => {
									const alreadyIn = isAlreadyInGame(n);
									const selected = selectedNames.includes(n);
									const rowBody = (
										<>
											<View style={styles.checkboxPress}>
												<View
													style={[
														styles.checkbox,
														selected && styles.checkboxChecked,
														alreadyIn && styles.checkboxDisabled,
													]}
												>
													{(selected || alreadyIn) && (
														<Text style={styles.checkboxMark}>✓</Text>
													)}
												</View>
											</View>
											<Text
												style={[
													styles.playerBaseName,
													alreadyIn && styles.playerBaseNameDisabled,
												]}
												numberOfLines={1}
											>
												{n}
												{alreadyIn ? ' (już w grze)' : ''}
											</Text>
										</>
									);
									return (
										<View
											key={n}
											style={[
												styles.playerBaseRow,
												alreadyIn && styles.playerBaseRowDisabled,
											]}
										>
											{alreadyIn ? (
												<View style={styles.playerBaseSelect}>{rowBody}</View>
											) : (
												<Pressable
													style={styles.playerBaseSelect}
													onPress={() => toggleSelected(n)}
												>
													{rowBody}
												</Pressable>
											)}
											<Pressable
												style={styles.playerBaseRemove}
												onPress={() => handleRemoveFromBase(n)}
												hitSlop={8}
											>
												<Text style={styles.playerBaseRemoveText}>×</Text>
											</Pressable>
										</View>
									);
								})}
							</ScrollView>
						)}
					</View>

					<Pressable
						style={[
							styles.modalAddBtn,
							selectedNames.length === 0 && styles.modalAddBtnDisabled,
						]}
						onPress={handleConfirmAdd}
						disabled={selectedNames.length === 0}
					>
						<Text style={styles.modalAddBtnText}>
							{selectedNames.length > 0
								? `Dodaj (${selectedNames.length})`
								: 'Dodaj'}
						</Text>
					</Pressable>
					<Pressable
						style={styles.modalCancelBtn}
						onPress={() => setPlayerModalVisible(false)}
					>
						<Text style={styles.modalCancelBtnText}>Anuluj</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);

	return (
		<View style={styles.wrapper}>
			{players.length > 0 ? (
				<DraggableFlatList
					data={players}
					keyExtractor={(item) => String(item.id)}
					onDragEnd={({ data }) => setPlayers(data)}
					containerStyle={styles.scroll}
					contentContainerStyle={styles.container}
					ListHeaderComponent={listHeader}
					renderItem={({ item, drag, isActive }) => (
						<ScaleDecorator>
							<Pressable
								onLongPress={drag}
								disabled={isActive}
								style={[styles.playerTile, isActive && styles.playerTileActive]}
							>
								<Text style={styles.playerTileName} numberOfLines={1}>
									{displayTrainingPlayerName(item)}
								</Text>
								<Pressable
									style={styles.removeButton}
									onPress={() => removePlayer(item.id)}
									hitSlop={8}
								>
									<Text style={styles.removeButtonText}>×</Text>
								</Pressable>
								<View style={styles.dragHandle}>
									<Text style={styles.dragHandleText}>≡</Text>
								</View>
							</Pressable>
						</ScaleDecorator>
					)}
					ListFooterComponent={listFooter}
				/>
			) : (
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.container}
					keyboardShouldPersistTaps="handled"
				>
					{listHeader}
					<View style={styles.emptyPlayersBox}>
						<Text style={styles.emptyPlayersText}>
							Dodaj co najmniej jednego gracza, aby rozpocząć trening.
						</Text>
					</View>
					{listFooter}
				</ScrollView>
			)}
			{playerModal}
		</View>
	);
};

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	scroll: {
		flex: 1,
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
	addPlayerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 2,
		borderColor: colors.accent,
		backgroundColor: 'transparent',
	},
	addPlayerButtonText: {
		fontSize: 16,
		color: colors.accent,
		fontWeight: 'bold',
	},
	emptyPlayersBox: {
		paddingVertical: 16,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		marginBottom: 22,
	},
	emptyPlayersText: {
		fontSize: 15,
		color: colors.textDim,
		textAlign: 'center',
	},
	playerTile: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		marginBottom: 8,
	},
	playerTileActive: {
		backgroundColor: colors.bgElevatedHover,
		opacity: 0.95,
	},
	playerTileName: {
		flex: 1,
		fontSize: 16,
		color: colors.textMuted,
		fontWeight: '500',
	},
	removeButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginLeft: 8,
	},
	removeButtonText: {
		fontSize: 24,
		color: colors.textDim,
		lineHeight: 26,
	},
	dragHandle: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginLeft: 4,
		minWidth: 44,
		minHeight: 44,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dragHandleText: {
		fontSize: 26,
		color: colors.accent,
		fontWeight: '700',
		lineHeight: 28,
	},
	reorderButtonSecondary: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4,
		marginBottom: 22,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: colors.accentBorder,
		backgroundColor: 'transparent',
	},
	reorderButtonTextSecondary: {
		fontSize: 16,
		color: colors.textMuted,
		fontWeight: '600',
	},
	startBtn: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
	},
	startBtnDisabled: {
		opacity: 0.5,
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
	modalOverlay: {
		flex: 1,
		backgroundColor: colors.overlay,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	modalContent: {
		backgroundColor: colors.bg,
		borderRadius: 12,
		padding: 24,
		width: '100%',
		maxHeight: '80%',
		zIndex: 1,
	},
	modalTitle: {
		fontSize: 20,
		color: colors.accent,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	guestInput: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 6,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		color: colors.text,
		marginBottom: 10,
	},
	modalSectionLabel: {
		fontSize: 14,
		color: colors.text,
		fontWeight: '500',
		marginBottom: 8,
	},
	addToBaseBtn: {
		borderWidth: 2,
		borderColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
		marginBottom: 18,
	},
	addToBaseBtnDisabled: {
		opacity: 0.45,
	},
	addToBaseBtnText: {
		color: colors.accent,
		fontSize: 15,
		fontWeight: 'bold',
	},
	playerBaseWrap: {
		marginBottom: 12,
	},
	playerBaseEmpty: {
		fontSize: 13,
		color: colors.textDim,
		marginBottom: 4,
	},
	playerBaseList: {
		maxHeight: 220,
	},
	playerBaseRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		marginBottom: 6,
		paddingLeft: 8,
		paddingRight: 4,
		paddingVertical: 10,
	},
	playerBaseRowDisabled: {
		opacity: 0.55,
	},
	playerBaseSelect: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	checkboxPress: {
		padding: 4,
		marginRight: 6,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'transparent',
	},
	checkboxChecked: {
		backgroundColor: colors.accent,
	},
	checkboxDisabled: {
		borderColor: colors.textDim,
		backgroundColor: colors.textDim,
	},
	checkboxMark: {
		color: colors.onAccent,
		fontSize: 13,
		fontWeight: '700',
		lineHeight: 16,
	},
	playerBaseName: {
		flex: 1,
		fontSize: 15,
		color: colors.text,
		fontWeight: '500',
		marginRight: 4,
	},
	playerBaseNameDisabled: {
		color: colors.textDim,
	},
	playerBaseRemove: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		minWidth: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	playerBaseRemoveText: {
		fontSize: 22,
		color: colors.textDim,
		lineHeight: 24,
	},
	modalAddBtn: {
		backgroundColor: colors.accent,
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginBottom: 12,
		alignItems: 'center',
	},
	modalAddBtnDisabled: {
		opacity: 0.5,
	},
	modalAddBtnText: {
		color: colors.bg,
		fontWeight: 'bold',
		fontSize: 16,
	},
	modalCancelBtn: {
		paddingVertical: 12,
		alignItems: 'center',
	},
	modalCancelBtnText: {
		color: colors.textMuted,
		fontSize: 16,
	},
});

export default TrainingMatchSetup;
