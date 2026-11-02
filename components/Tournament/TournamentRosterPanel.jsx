import React, { useCallback, useRef, useState } from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { useTournamentRosterLive } from '../../hooks/useTournamentRosterLive';
import {
	addRelatedTournamentGuest,
	addTournamentGuest,
	approveTournamentJoinRequest,
	cancelTournamentInvitation,
	fetchTournamentSetup,
	inviteTournamentUser,
	inviteTournamentUsers,
	joinTournamentSelf,
	regenerateTournamentJoinCode,
	rejectTournamentJoinRequest,
	removeTournamentGuest,
	removeTournamentParticipant,
	searchTournamentUsers,
	toggleTournamentJoinCode,
} from '../../helpers/tournamentManageApi';
import QrCode from '../Common/QrCode';
import { colors } from '../../theme/colors';

const TournamentRosterPanel = ({ tournamentId, navigation }) => {
	const { auth } = useAuth();
	const [setup, setSetup] = useState(null);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [busy, setBusy] = useState('');
	const [query, setQuery] = useState('');
	const [users, setUsers] = useState([]);
	const [searched, setSearched] = useState(false);
	const [guestName, setGuestName] = useState('');
	const [selectedRegulars, setSelectedRegulars] = useState([]);
	const [addTab, setAddTab] = useState('registered');
	const fetchSeq = useRef(0);

	const load = useCallback(async () => {
		const seq = ++fetchSeq.current;
		const result = await fetchTournamentSetup(auth?.accessToken, tournamentId);
		if (seq !== fetchSeq.current) {
			return;
		}
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setError('');
		setSetup(result.data);
	}, [auth?.accessToken, tournamentId]);

	const applyLiveRoster = useCallback((payload) => {
		if (!payload || !Array.isArray(payload.participants)) {
			return;
		}
		fetchSeq.current += 1;
		setSetup((current) => {
			if (!current) {
				return current;
			}
			return {
				...current,
				participants: payload.participants,
				participantCount: Number(payload.participantCount ?? payload.participants.length) || 0,
				...(Array.isArray(payload.invitationPipeline)
					? { invitationPipeline: payload.invitationPipeline }
					: {}),
				...(payload.minPlayers != null
					? { minPlayers: Number(payload.minPlayers) || current.minPlayers }
					: {}),
			};
		});
	}, []);

	useFocusEffect(useCallback(() => {
		void load();
	}, [load]));

	useTournamentRosterLive({
		tournamentId,
		enabled: true,
		onReload: (payload) => {
			applyLiveRoster(payload);
			void load();
		},
	});

	const run = async (key, action) => {
		setBusy(key);
		setError('');
		setNotice('');
		const result = await action();
		setBusy('');
		if (!result.ok) {
			setError(result.message);
			return false;
		}
		fetchSeq.current += 1;
		setSetup(result.data);
		if (result.data?.message) {
			setNotice(result.data.message);
		}
		return true;
	};

	const search = async () => {
		if (query.trim().length < 2) {
			setError('Wpisz co najmniej 2 znaki');
			return;
		}
		setBusy('search');
		setError('');
		setSearched(false);
		const result = await searchTournamentUsers(auth?.accessToken, tournamentId, query.trim());
		setBusy('');
		setSearched(true);
		if (!result.ok) {
			setError(result.message);
			setUsers([]);
			return;
		}
		setUsers(result.data.users ?? []);
	};

	if (!setup) {
		return error ? <Text style={styles.error}>{error}</Text> : null;
	}

	const count = setup.participants?.length ?? setup.participantCount ?? 0;
	const minPlayers = setup.minPlayers ?? 4;
	const ready = count >= minPlayers;
	const participants = setup.participants ?? [];
	const selfIn = participants.some(
		(person) => person.userId != null && Number(person.userId) === Number(auth?.userId),
	);
	const requests = setup.joinRequests ?? [];
	const pipeline = setup.invitationPipeline ?? [];
	const regulars = setup.regulars ?? [];
	const relatedGuests = setup.relatedGuests ?? [];

	const toggleRegular = (userId) => {
		setSelectedRegulars((current) => (
			current.includes(userId)
				? current.filter((id) => id !== userId)
				: [...current, userId]
		));
	};

	return (
		<View style={styles.wrap}>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{notice ? <Text style={styles.notice}>{notice}</Text> : null}

			<View style={[styles.card, styles.participantsCard]}>
				<View style={styles.headerRow}>
					<Text style={styles.title}>Uczestnicy turnieju</Text>
					<Text style={[styles.badge, ready ? styles.badgeReady : styles.badgeShort]}>
						{count} / min. {minPlayers}
					</Text>
				</View>
				<Text style={styles.hint}>
					W turnieju grają wszyscy z tej listy — zaakceptowane zaproszenia oraz goście dodani do turnieju.
				</Text>
				{participants.length === 0 ? (
					<Text style={styles.empty}>
						Brak uczestników. Użyj sekcji poniżej, aby wysłać zaproszenia lub dodać gości.
					</Text>
				) : (
					<View style={styles.chips}>
						{participants.map((person) => {
							const key = `${person.kind}-${person.invitationId || person.playerId}`;
							return (
								<View key={key} style={styles.chip}>
									<Text style={styles.chipText}>
										{person.name}
										{person.kind === 'guest' ? '  gość' : ''}
									</Text>
									<Pressable
										accessibilityLabel="Usuń z turnieju"
										hitSlop={6}
										disabled={busy === key}
										onPress={() => {
											if (person.kind === 'guest') {
												void run(key, () => removeTournamentGuest(
													auth?.accessToken,
													tournamentId,
													person.playerId,
												));
												return;
											}
											void run(key, () => removeTournamentParticipant(
												auth?.accessToken,
												tournamentId,
												person.invitationId,
											));
										}}
									>
										<Text style={styles.remove}>×</Text>
									</Pressable>
								</View>
							);
						})}
					</View>
				)}
			</View>

			<View style={styles.card}>
				<Text style={styles.title}>Dodaj uczestników</Text>

				{setup.joinCode ? (
					<View style={styles.block}>
						<Text style={styles.blockTitle}>Dołącz przez QR</Text>
						<Text style={styles.hint}>
							Zawodnik skanuje kod albo otwiera turniej w aplikacji i klika Zgłoś się. Zgłoszenia pojawiają się poniżej — zatwierdzasz Dołącz albo Odrzuć.
						</Text>
						{setup.joinUrl ? <QrCode value={setup.joinUrl} size={160} /> : null}
						<Text style={styles.code}>{setup.joinCode}</Text>
						{setup.joinUrl ? <Text style={styles.meta}>{setup.joinUrl}</Text> : null}
						<View style={styles.actions}>
							<Pressable
								style={styles.mini}
								disabled={busy === 'code'}
								onPress={() => run('code', () => regenerateTournamentJoinCode(
									auth?.accessToken,
									tournamentId,
								))}
							>
								<Text style={styles.miniText}>{busy === 'code' ? '…' : 'Nowy kod'}</Text>
							</Pressable>
							<Pressable
								style={styles.mini}
								disabled={busy === 'toggle'}
								onPress={() => run('toggle', () => toggleTournamentJoinCode(
									auth?.accessToken,
									tournamentId,
									!setup.joinCodeEnabled,
								))}
							>
								<Text style={styles.miniText}>
									{setup.joinCodeEnabled ? 'Wyłącz zgłoszenia' : 'Włącz zgłoszenia'}
								</Text>
							</Pressable>
						</View>
						{setup.joinCodeEnabled ? null : (
							<Text style={styles.error}>Przyjmowanie zgłoszeń jest wyłączone.</Text>
						)}
					</View>
				) : null}

				<Text style={styles.blockTitle}>
					Zgłoszenia{requests.length > 0 ? ` (${requests.length})` : ''}
				</Text>
				{requests.length === 0 ? (
					<Text style={styles.meta}>Brak oczekujących zgłoszeń.</Text>
				) : (
					requests.map((request) => (
						<View key={request.id} style={styles.row}>
							<View style={styles.rowBody}>
								<Text style={styles.rowText}>{request.playerName}</Text>
								{request.createdAt ? (
									<Text style={styles.meta}>{request.createdAt}</Text>
								) : null}
							</View>
							<Pressable
								disabled={busy === `ja-${request.id}`}
								onPress={() => run(`ja-${request.id}`, () => approveTournamentJoinRequest(
									auth?.accessToken,
									tournamentId,
									request.id,
								))}
							>
								<Text style={styles.link}>Dołącz</Text>
							</Pressable>
							<Pressable
								disabled={busy === `jr-${request.id}`}
								onPress={() => run(`jr-${request.id}`, () => rejectTournamentJoinRequest(
									auth?.accessToken,
									tournamentId,
									request.id,
								))}
							>
								<Text style={styles.link}>Odrzuć</Text>
							</Pressable>
						</View>
					))
				)}

				<Text style={styles.blockTitle}>Wyszukaj użytkownika</Text>
				{selfIn ? null : (
					<View style={styles.selfBlock}>
						<Pressable
							style={styles.button}
							disabled={busy === 'self'}
							onPress={() => run('self', () => joinTournamentSelf(auth?.accessToken, tournamentId))}
						>
							<Text style={styles.buttonText}>{busy === 'self' ? 'Dodawanie…' : 'Dodaj mnie'}</Text>
						</Pressable>
						<Text style={styles.hint}>
							Wejdziesz od razu na listę uczestników, bez akceptacji w aplikacji.
						</Text>
					</View>
				)}
				<Text style={styles.hint}>Wpisz imię lub fragment nazwy gracza i wyślij zaproszenie.</Text>
				<View style={styles.searchRow}>
					<TextInput
						style={[styles.input, styles.searchInput]}
						placeholder="Min. 2 znaki..."
						placeholderTextColor={colors.placeholder}
						value={query}
						onChangeText={setQuery}
						autoCapitalize="none"
					/>
					<Pressable style={styles.smallButton} onPress={search} disabled={busy === 'search'}>
						<Text style={styles.smallButtonText}>{busy === 'search' ? '…' : 'Szukaj'}</Text>
					</Pressable>
				</View>
				{searched && users.length === 0 ? (
					<Text style={styles.meta}>Brak wyników.</Text>
				) : null}
				{users.map((user) => (
					<View key={user.id} style={styles.row}>
						<Text style={styles.rowText}>{user.name}</Text>
						<Pressable
							disabled={busy === `i-${user.id}`}
							onPress={() => run(`i-${user.id}`, async () => {
								const result = await inviteTournamentUser(
									auth?.accessToken,
									tournamentId,
									user.id,
								);
								if (result.ok) {
									setUsers((current) => current.filter((row) => row.id !== user.id));
								}
								return result;
							})}
						>
							<Text style={styles.link}>Zaproś</Text>
						</Pressable>
					</View>
				))}

				<Text style={styles.blockTitle}>Dodaj gościa (bez konta)</Text>
				<Text style={styles.hint}>
					Gracz niezarejestrowany w aplikacji — trafi od razu na listę uczestników turnieju.
				</Text>
				<View style={styles.searchRow}>
					<TextInput
						style={[styles.input, styles.searchInput]}
						placeholder="Imię gościa..."
						placeholderTextColor={colors.placeholder}
						value={guestName}
						onChangeText={setGuestName}
						maxLength={20}
					/>
					<Pressable
						style={styles.smallButton}
						disabled={busy === 'guest'}
						onPress={() => {
							const name = guestName.trim();
							if (!name) {
								setError('Podaj imię gościa');
								return;
							}
							void run('guest', () => addTournamentGuest(auth?.accessToken, tournamentId, name))
								.then((ok) => {
									if (ok) setGuestName('');
								});
						}}
					>
						<Text style={styles.smallButtonText}>{busy === 'guest' ? '…' : 'Dodaj gościa'}</Text>
					</Pressable>
				</View>

				{pipeline.length > 0 ? (
					<>
						<Text style={styles.blockTitle}>Zaproszenia w toku</Text>
						{pipeline.map((invitation) => (
							<View key={invitation.id} style={styles.row}>
								<View style={styles.rowBody}>
									<Text style={styles.rowText}>{invitation.name}</Text>
									<Text style={styles.meta}>{invitation.statusLabel}</Text>
								</View>
								{invitation.isPending ? (
									<Pressable
										disabled={busy === `c-${invitation.id}`}
										onPress={() => run(`c-${invitation.id}`, () => cancelTournamentInvitation(
											auth?.accessToken,
											tournamentId,
											invitation.id,
										))}
									>
										<Text style={styles.link}>Anuluj</Text>
									</Pressable>
								) : null}
								{invitation.canReinvite ? (
									<Pressable
										disabled={busy === `r-${invitation.id}`}
										onPress={() => run(`r-${invitation.id}`, () => inviteTournamentUser(
											auth?.accessToken,
											tournamentId,
											invitation.userId,
										))}
									>
										<Text style={styles.link}>Zaproś ponownie</Text>
									</Pressable>
								) : null}
								{!invitation.isPending && !invitation.canReinvite ? (
									<Text style={styles.meta}>—</Text>
								) : null}
							</View>
						))}
					</>
				) : null}

				{setup.hasSeason ? (
					<View style={styles.seasonBlock}>
						<View style={styles.tabs}>
							<Pressable
								style={[styles.tab, addTab === 'registered' && styles.tabOn]}
								onPress={() => setAddTab('registered')}
							>
								<Text style={[styles.tabText, addTab === 'registered' && styles.tabTextOn]}>
									Stały skład
								</Text>
							</Pressable>
							<Pressable
								style={[styles.tab, addTab === 'guests' && styles.tabOn]}
								onPress={() => setAddTab('guests')}
							>
								<Text style={[styles.tabText, addTab === 'guests' && styles.tabTextOn]}>
									Goście organizacji
								</Text>
							</Pressable>
						</View>

						{addTab === 'registered' ? (
							<View>
								<Text style={styles.blockTitle}>Stały skład organizacji</Text>
								<Text style={styles.hint}>Zaznacz bywalców i wyślij masowe zaproszenia.</Text>
								{regulars.length === 0 ? (
									<Text style={styles.meta}>Brak powiązanych użytkowników.</Text>
								) : (
									<View style={styles.chips}>
										{regulars.map((regular) => {
											const selected = selectedRegulars.includes(regular.userId);
											if (!regular.canInvite) {
												return (
													<View key={regular.userId} style={[styles.chip, styles.chipMuted]}>
														<Text style={styles.chipMutedText}>
															{regular.name}
															{regular.invitationStatusLabel
																? ` · ${regular.invitationStatusLabel}`
																: ''}
														</Text>
													</View>
												);
											}
											return (
												<Pressable
													key={regular.userId}
													style={[styles.chip, selected && styles.chipOn]}
													onPress={() => toggleRegular(regular.userId)}
												>
													<Text style={[styles.chipText, selected && styles.chipTextOn]}>
														{regular.name}
													</Text>
												</Pressable>
											);
										})}
									</View>
								)}
								<Pressable
									style={[styles.button, selectedRegulars.length === 0 && styles.disabled]}
									disabled={selectedRegulars.length === 0 || busy === 'bulk'}
									onPress={() => {
										const ids = selectedRegulars;
										void run('bulk', () => inviteTournamentUsers(
											auth?.accessToken,
											tournamentId,
											ids,
										)).then((ok) => {
											if (ok) setSelectedRegulars([]);
										});
									}}
								>
									<Text style={styles.buttonText}>
										Wyślij zaproszenie ({selectedRegulars.length})
									</Text>
								</Pressable>
							</View>
						) : (
							<View>
								<Text style={styles.blockTitle}>Powiązani goście</Text>
								<Text style={styles.hint}>Dodaj gości z puli organizacji do tego turnieju.</Text>
								{relatedGuests.length === 0 ? (
									<Text style={styles.meta}>Brak powiązanych gości.</Text>
								) : (
									relatedGuests.map((guest) => (
										<View key={guest.playerId} style={styles.row}>
											<Text style={styles.rowText}>{guest.name}</Text>
											{guest.inTournament ? (
												<Text style={styles.meta}>W turnieju</Text>
											) : (
												<Pressable
													disabled={busy === `rg-${guest.playerId}`}
													onPress={() => run(`rg-${guest.playerId}`, () => addRelatedTournamentGuest(
														auth?.accessToken,
														tournamentId,
														guest.playerId,
													))}
												>
													<Text style={styles.link}>Dodaj</Text>
												</Pressable>
											)}
										</View>
									))
								)}
							</View>
						)}
					</View>
				) : null}
			</View>

			<Pressable
				style={[styles.button, styles.startButton, !ready && styles.disabled]}
				disabled={!ready}
				onPress={() => navigation.navigate('TournamentSetup', { tournamentId })}
			>
				<Text style={styles.buttonText}>Wystartuj</Text>
			</Pressable>
			{ready ? null : (
				<Text style={styles.meta}>Potrzeba co najmniej {minPlayers} osób w składzie.</Text>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: { marginTop: 16 },
	card: {
		marginBottom: 16,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	participantsCard: {
		borderColor: 'rgba(34,197,94,0.4)',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	title: {
		flex: 1,
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		overflow: 'hidden',
		fontSize: 12,
		fontWeight: '700',
	},
	badgeReady: {
		backgroundColor: colors.successMuted,
		color: colors.successBright,
	},
	badgeShort: {
		backgroundColor: colors.accentSoft,
		color: colors.accent,
	},
	hint: {
		marginTop: 8,
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 20,
	},
	empty: {
		marginTop: 8,
		color: colors.textMuted,
		fontStyle: 'italic',
		fontSize: 14,
	},
	error: { color: colors.dangerText, marginTop: 8, marginBottom: 8 },
	notice: { color: colors.successBright, marginBottom: 8 },
	block: { marginTop: 12 },
	blockTitle: {
		color: colors.accent,
		fontWeight: '700',
		marginTop: 16,
		marginBottom: 6,
	},
	code: {
		marginTop: 8,
		color: colors.accent,
		fontSize: 22,
		fontWeight: '700',
		letterSpacing: 2,
	},
	meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
	actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
	mini: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	miniText: { color: colors.text, fontWeight: '700' },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: colors.bg,
		borderRadius: 8,
		paddingLeft: 12,
		paddingRight: 8,
		paddingVertical: 6,
	},
	chipOn: { backgroundColor: colors.accent },
	chipMuted: { opacity: 0.55 },
	chipText: { color: colors.textSecondary, fontSize: 14 },
	chipTextOn: { color: colors.onAccent, fontWeight: '700' },
	chipMutedText: { color: colors.textMuted, fontSize: 14 },
	remove: { color: colors.dangerText, fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
		gap: 8,
	},
	rowBody: { flex: 1 },
	rowText: { color: colors.text, flex: 1 },
	link: { color: colors.accent, fontWeight: '700' },
	searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
	input: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
		color: colors.text,
		backgroundColor: colors.bg,
	},
	searchInput: { flex: 1 },
	smallButton: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	smallButtonText: { color: colors.onAccent, fontWeight: '700' },
	selfBlock: { marginTop: 8 },
	button: {
		marginTop: 8,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	startButton: { marginTop: 0 },
	buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
	disabled: { opacity: 0.45 },
	seasonBlock: { marginTop: 8 },
	tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
	tab: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: colors.bg,
	},
	tabOn: { backgroundColor: colors.accent },
	tabText: { color: colors.textSecondary, fontWeight: '700' },
	tabTextOn: { color: colors.onAccent },
});

export default TournamentRosterPanel;
