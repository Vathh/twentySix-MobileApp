import React, { useCallback, useState } from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	addRelatedTournamentGuest,
	addTournamentGuest,
	approveTournamentJoinRequest,
	cancelTournamentInvitation,
	fetchTournamentSetup,
	inviteTournamentUser,
	joinTournamentSelf,
	rejectTournamentJoinRequest,
	removeTournamentGuest,
	removeTournamentParticipant,
	searchTournamentUsers,
} from '../../helpers/tournamentManageApi';
import { colors } from '../../theme/colors';

const TournamentRosterPanel = ({ tournamentId, navigation }) => {
	const { auth } = useAuth();
	const [setup, setSetup] = useState(null);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState('');
	const [query, setQuery] = useState('');
	const [users, setUsers] = useState([]);
	const [guestName, setGuestName] = useState('');

	const load = useCallback(async () => {
		const result = await fetchTournamentSetup(auth?.accessToken, tournamentId);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setError('');
		setSetup(result.data);
	}, [auth?.accessToken, tournamentId]);

	useFocusEffect(useCallback(() => {
		void load();
	}, [load]));

	const run = async (key, action) => {
		setBusy(key);
		setError('');
		const result = await action();
		setBusy('');
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setSetup(result.data);
	};

	const search = async () => {
		if (query.trim().length < 2) {
			setError('Wpisz co najmniej 2 znaki');
			return;
		}
		setBusy('search');
		setError('');
		const result = await searchTournamentUsers(auth?.accessToken, tournamentId, query.trim());
		setBusy('');
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

	const count = setup.participantCount ?? 0;
	const minPlayers = setup.minPlayers ?? 4;
	const ready = count >= minPlayers;

	return (
		<View style={styles.wrap}>
			<Text style={styles.counter}>{count} / min. {minPlayers}</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}

			{setup.joinCode ? (
				<View style={styles.block}>
					<Text style={styles.blockTitle}>Kod dołączenia</Text>
					<Text style={styles.code}>{setup.joinCode}</Text>
					{setup.joinUrl ? <Text style={styles.meta}>{setup.joinUrl}</Text> : null}
				</View>
			) : null}

			<Text style={styles.blockTitle}>Uczestnicy</Text>
			{(setup.participants ?? []).length === 0 ? (
				<Text style={styles.meta}>Jeszcze nikt nie jest w puli startowej.</Text>
			) : (
				(setup.participants ?? []).map((person) => (
					<View key={`${person.kind}-${person.playerId || person.invitationId}`} style={styles.row}>
						<Text style={styles.rowText}>
							{person.name}
							{person.kind === 'guest' ? ' · gość' : ''}
						</Text>
						<Pressable
							onPress={() => {
								if (person.kind === 'guest') {
									void run(`g-${person.playerId}`, () => removeTournamentGuest(
										auth?.accessToken,
										tournamentId,
										person.playerId,
									));
									return;
								}
								void run(`p-${person.invitationId}`, () => removeTournamentParticipant(
									auth?.accessToken,
									tournamentId,
									person.invitationId,
								));
							}}
						>
							<Text style={styles.link}>Usuń</Text>
						</Pressable>
					</View>
				))
			)}

			{(setup.invitationPipeline ?? []).length > 0 ? (
				<>
					<Text style={styles.blockTitle}>Zaproszenia</Text>
					{setup.invitationPipeline.map((invitation) => (
						<View key={invitation.id} style={styles.row}>
							<Text style={styles.rowText}>
								{invitation.name} · {invitation.statusLabel}
							</Text>
							{invitation.isPending ? (
								<Pressable
									onPress={() => run(`c-${invitation.id}`, () => cancelTournamentInvitation(
										auth?.accessToken,
										tournamentId,
										invitation.id,
									))}
								>
									<Text style={styles.link}>Anuluj</Text>
								</Pressable>
							) : null}
						</View>
					))}
				</>
			) : null}

			<Pressable
				style={styles.secondary}
				onPress={() => run('self', () => joinTournamentSelf(auth?.accessToken, tournamentId))}
			>
				<Text style={styles.secondaryText}>{busy === 'self' ? 'Dodawanie…' : 'Dodaj mnie'}</Text>
			</Pressable>

			<Text style={styles.blockTitle}>Zaproś gracza</Text>
			<View style={styles.searchRow}>
				<TextInput
					style={[styles.input, styles.searchInput]}
					placeholder="Nazwa gracza"
					placeholderTextColor={colors.placeholder}
					value={query}
					onChangeText={setQuery}
					autoCapitalize="none"
				/>
				<Pressable style={styles.smallButton} onPress={search}>
					<Text style={styles.smallButtonText}>{busy === 'search' ? '…' : 'Szukaj'}</Text>
				</Pressable>
			</View>
			{users.map((user) => (
				<Pressable
					key={user.id}
					style={styles.row}
					onPress={() => run(`i-${user.id}`, () => inviteTournamentUser(
						auth?.accessToken,
						tournamentId,
						user.id,
					))}
				>
					<Text style={styles.rowText}>{user.name}</Text>
					<Text style={styles.link}>Zaproś</Text>
				</Pressable>
			))}

			<Text style={styles.blockTitle}>Gość bez konta</Text>
			<View style={styles.searchRow}>
				<TextInput
					style={[styles.input, styles.searchInput]}
					placeholder="Nazwa gościa"
					placeholderTextColor={colors.placeholder}
					value={guestName}
					onChangeText={setGuestName}
				/>
				<Pressable
					style={styles.smallButton}
					onPress={() => {
						const name = guestName.trim();
						if (!name) {
							setError('Podaj imię gościa');
							return;
						}
						setGuestName('');
						void run('guest', () => addTournamentGuest(auth?.accessToken, tournamentId, name));
					}}
				>
					<Text style={styles.smallButtonText}>Dodaj</Text>
				</Pressable>
			</View>
			{(setup.relatedGuests ?? []).filter((guest) => !guest.inTournament).map((guest) => (
				<Pressable
					key={guest.playerId}
					style={styles.row}
					onPress={() => run(`rg-${guest.playerId}`, () => addRelatedTournamentGuest(
						auth?.accessToken,
						tournamentId,
						guest.playerId,
					))}
				>
					<Text style={styles.rowText}>{guest.name}</Text>
					<Text style={styles.link}>Dodaj z sezonu</Text>
				</Pressable>
			))}

			{(setup.joinRequests ?? []).length > 0 ? (
				<>
					<Text style={styles.blockTitle}>Prośby o dołączenie</Text>
					{setup.joinRequests.map((request) => (
						<View key={request.id} style={styles.row}>
							<Text style={styles.rowText}>{request.playerName}</Text>
							<Pressable
								onPress={() => run(`ja-${request.id}`, () => approveTournamentJoinRequest(
									auth?.accessToken,
									tournamentId,
									request.id,
								))}
							>
								<Text style={styles.link}>Przyjmij</Text>
							</Pressable>
							<Pressable
								onPress={() => run(`jr-${request.id}`, () => rejectTournamentJoinRequest(
									auth?.accessToken,
									tournamentId,
									request.id,
								))}
							>
								<Text style={styles.link}>Odrzuć</Text>
							</Pressable>
						</View>
					))}
				</>
			) : null}

			<Pressable
				style={[styles.button, !ready && styles.disabled]}
				disabled={!ready}
				onPress={() => navigation.navigate('TournamentSetup', { tournamentId })}
			>
				<Text style={styles.buttonText}>Wystartuj</Text>
			</Pressable>
			{!ready ? (
				<Text style={styles.meta}>Do startu potrzeba co najmniej {minPlayers} zawodników w puli.</Text>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: { marginTop: 16 },
	counter: { color: colors.text, fontWeight: '700', marginBottom: 8 },
	error: { color: colors.dangerText, marginBottom: 8 },
	block: { marginBottom: 12 },
	blockTitle: { color: colors.text, fontWeight: '700', marginTop: 14, marginBottom: 6 },
	code: { color: colors.accent, fontSize: 20, fontWeight: '700', letterSpacing: 2 },
	meta: { color: colors.textMuted, fontSize: 13 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
		gap: 8,
	},
	rowText: { color: colors.text, flex: 1 },
	link: { color: colors.accent, fontWeight: '700' },
	searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
	input: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
		color: colors.text,
	},
	searchInput: { flex: 1 },
	smallButton: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	smallButtonText: { color: colors.onAccent, fontWeight: '700' },
	secondary: {
		marginTop: 8,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
	},
	secondaryText: { color: colors.text, fontWeight: '700' },
	button: {
		marginTop: 16,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: { color: colors.onAccent, fontWeight: '700' },
	disabled: { opacity: 0.45 },
});

export default TournamentRosterPanel;
