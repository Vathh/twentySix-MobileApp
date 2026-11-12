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
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	addOrganizationAdmin,
	addOrganizationGuest,
	addSeasonAdmin,
	addTournamentAdmin,
	approveOrganizationJoinRequest,
	cancelOrganizationInvitation,
	fetchOrganizationManage,
	fetchSeasonManage,
	fetchTournamentAdmins,
	inviteOrganizationUser,
	rejectOrganizationJoinRequest,
	removeOrganizationAdmin,
	removeOrganizationGuest,
	removeOrganizationMember,
	removeSeasonAdmin,
	removeTournamentAdmin,
	searchOrganizationUsers,
	searchTournamentAdmins,
} from '../../helpers/competitionManageApi';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const TITLES = {
	roster: 'Skład',
	guests: 'Goście',
	'org-admins': 'Administratorzy',
	'season-admins': 'Administratorzy',
	'tournament-admins': 'Administratorzy',
};

const PeopleManageScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const mode = route.params?.mode;
	const entityId = route.params?.id;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [found, setFound] = useState([]);
	const [guestName, setGuestName] = useState('');
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		const token = auth?.accessToken;
		const result = mode === 'season-admins'
			? await fetchSeasonManage(token, entityId)
			: mode === 'tournament-admins'
				? await fetchTournamentAdmins(token, entityId)
				: await fetchOrganizationManage(token, entityId);
		if (!result.ok) {
			setError(result.message);
		} else {
			setError('');
			setData(result.data);
		}
		setLoading(false);
	}, [auth?.accessToken, entityId, mode]);

	useFocusEffect(useCallback(() => {
		navigation.setOptions({ title: TITLES[mode] || 'Ludzie' });
		void load();
	}, [load, mode, navigation]));

	const run = async (action) => {
		setBusy(true);
		setError('');
		const result = await action();
		setBusy(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setData(result.data);
		setFound([]);
		setQuery('');
		setGuestName('');
	};

	const search = async () => {
		setBusy(true);
		setError('');
		const result = mode === 'tournament-admins'
			? await searchTournamentAdmins(auth?.accessToken, entityId, query.trim())
			: await searchOrganizationUsers(auth?.accessToken, entityId, query.trim());
		setBusy(false);
		if (!result.ok) {
			setFound([]);
			setError(result.message);
			return;
		}
		setFound(result.data?.users ?? []);
	};

	if (loading) {
		return <ScreenLoading />;
	}

	const admins = data?.admins ?? [];
	const canRemove = Boolean(data?.canRemoveAdmin);
	const candidates = data?.adminCandidates ?? [];

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
			{error ? <Text style={styles.error}>{error}</Text> : null}

			{mode === 'roster' ? (
				<>
					<Text style={styles.section}>W składzie</Text>
					<PersonList
						people={data?.relatedUsers}
						empty="Nikt jeszcze nie jest powiązany z tą organizacją."
						actionLabel="Usuń"
						busy={busy}
						onAction={(person) => run(() => removeOrganizationMember(auth?.accessToken, entityId, person.id))}
					/>
					<Text style={styles.section}>Oczekujące zaproszenia</Text>
					<PersonList
						people={data?.pendingInvitations}
						empty="Brak oczekujących zaproszeń."
						actionLabel="Anuluj"
						busy={busy}
						onAction={(person) => run(() => cancelOrganizationInvitation(auth?.accessToken, entityId, person.id))}
					/>
					<Text style={styles.section}>Zgłoszenia</Text>
					{(data?.pendingJoinRequests ?? []).length === 0 ? (
						<Text style={styles.empty}>Brak zgłoszeń.</Text>
					) : (
						(data?.pendingJoinRequests ?? []).map((request) => (
							<View key={request.id} style={styles.person}>
								<Text style={styles.personName}>{request.name}</Text>
								<View style={styles.joinActions}>
									<Pressable
										disabled={busy}
										onPress={() => run(() => approveOrganizationJoinRequest(auth?.accessToken, entityId, request.id))}
									>
										<Text style={styles.action}>Dołącz</Text>
									</Pressable>
									<Pressable
										disabled={busy}
										onPress={() => run(() => rejectOrganizationJoinRequest(auth?.accessToken, entityId, request.id))}
									>
										<Text style={styles.action}>Odrzuć</Text>
									</Pressable>
								</View>
							</View>
						))
					)}
					<Text style={styles.section}>Zaproś</Text>
					<SearchRow query={query} setQuery={setQuery} onSearch={search} busy={busy} placeholder="Min. 5 znaków" />
					<PersonList
						people={found}
						empty=""
						actionLabel="Zaproś"
						busy={busy}
						onAction={(person) => run(() => inviteOrganizationUser(auth?.accessToken, entityId, person.id))}
					/>
				</>
			) : null}

			{mode === 'guests' ? (
				<>
					<TextInput
						style={styles.input}
						placeholder="Imię gościa, do 20 znaków"
						placeholderTextColor={colors.placeholder}
						value={guestName}
						onChangeText={setGuestName}
						maxLength={20}
					/>
					<Pressable
						style={styles.button}
						disabled={busy}
						onPress={() => run(() => addOrganizationGuest(auth?.accessToken, entityId, guestName.trim()))}
					>
						<Text style={styles.buttonText}>Dodaj gościa</Text>
					</Pressable>
					<PersonList
						people={data?.guests}
						empty="W tej organizacji nie ma jeszcze gości."
						actionLabel="Usuń"
						busy={busy}
						onAction={(person) => run(() => removeOrganizationGuest(auth?.accessToken, entityId, person.id))}
					/>
				</>
			) : null}

			{mode === 'org-admins' || mode === 'season-admins' ? (
				<>
					<Text style={styles.section}>Obecni</Text>
					<PersonList
						people={admins}
						empty="Brak administratorów."
						actionLabel={canRemove ? 'Usuń' : null}
						busy={busy}
						onAction={(person) => run(() => (
							mode === 'season-admins'
								? removeSeasonAdmin(auth?.accessToken, entityId, person.id)
								: removeOrganizationAdmin(auth?.accessToken, entityId, person.id)
						))}
					/>
					<Text style={styles.section}>Ze składu organizacji</Text>
					<PersonList
						people={candidates}
						empty="Brak osób, którym można nadać uprawnienia."
						actionLabel="Dodaj"
						busy={busy}
						onAction={(person) => run(() => (
							mode === 'season-admins'
								? addSeasonAdmin(auth?.accessToken, entityId, person.id)
								: addOrganizationAdmin(auth?.accessToken, entityId, person.id)
						))}
					/>
				</>
			) : null}

			{mode === 'tournament-admins' ? (
				<>
					<Text style={styles.section}>Obecni</Text>
					<PersonList
						people={admins}
						empty="Brak administratorów."
						actionLabel={canRemove ? 'Usuń' : null}
						busy={busy}
						onAction={(person) => run(() => removeTournamentAdmin(auth?.accessToken, entityId, person.id))}
					/>
					<Text style={styles.section}>Dodaj</Text>
					<SearchRow query={query} setQuery={setQuery} onSearch={search} busy={busy} placeholder="Min. 5 znaków" />
					<PersonList
						people={found}
						empty=""
						actionLabel="Dodaj"
						busy={busy}
						onAction={(person) => run(() => addTournamentAdmin(auth?.accessToken, entityId, person.id))}
					/>
				</>
			) : null}

			{busy ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
		</ScrollView>
	);
};

function PersonList({ people, empty, actionLabel, onAction, busy }) {
	const rows = Array.isArray(people) ? people : [];
	if (rows.length === 0) {
		return empty ? <Text style={styles.empty}>{empty}</Text> : null;
	}
	return rows.map((person) => (
		<View key={String(person.id)} style={styles.person}>
			<Text style={styles.personName}>{person.name}</Text>
			{actionLabel ? (
				<Pressable disabled={busy} onPress={() => onAction(person)}>
					<Text style={styles.action}>{actionLabel}</Text>
				</Pressable>
			) : null}
		</View>
	));
}

function SearchRow({ query, setQuery, onSearch, busy, placeholder }) {
	return (
		<View style={styles.searchRow}>
			<TextInput
				style={[styles.input, styles.searchInput]}
				placeholder={placeholder}
				placeholderTextColor={colors.placeholder}
				value={query}
				onChangeText={setQuery}
				autoCapitalize="none"
			/>
			<Pressable style={styles.button} onPress={onSearch} disabled={busy}>
				<Text style={styles.buttonText}>Szukaj</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, paddingBottom: 40 },
	section: {
		marginTop: 8,
		marginBottom: 8,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	empty: { color: colors.textMuted, marginBottom: 12 },
	person: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
		gap: 12,
	},
	personName: { flex: 1, color: colors.text, fontWeight: '600' },
	action: { color: colors.accent, fontWeight: '700' },
	joinActions: { flexDirection: 'row', gap: 16 },
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
	searchRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
	searchInput: { flex: 1 },
	button: {
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 14,
		alignItems: 'center',
	},
	buttonText: { color: colors.onAccent, fontWeight: '700' },
	error: { color: colors.dangerText, marginBottom: 12 },
	spinner: { marginTop: 8 },
});

export default PeopleManageScreen;
