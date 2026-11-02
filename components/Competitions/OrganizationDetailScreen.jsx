import React, { useCallback, useState } from 'react';
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchCompetitionDetail } from '../../helpers/competitionsApi';
import { getOrganizationUrl } from '../../helpers/apiConfig';
import DetailHeader, { STATUS_STYLES } from './DetailHeader';
import NameStrip from './NameStrip';
import ManageLinks from './ManageLinks';
import FeedMuteButton from '../Activity/FeedMuteButton';
import ScreenLoading from '../Common/ScreenLoading';
import { colors } from '../../theme/colors';

const OrganizationDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const organizationId = route.params?.id;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(
		async ({ soft } = {}) => {
			if (!auth?.accessToken || !organizationId) {
				setError('Brak danych organizacji.');
				setLoading(false);
				return;
			}
			if (!soft) setLoading(true);

			const result = await fetchCompetitionDetail(getOrganizationUrl(organizationId), auth.accessToken);
			if (result.error) {
				setError(result.error);
				if (!soft) setData(null);
			} else {
				setError('');
				setData(result.data);
			}
			setLoading(false);
			setRefreshing(false);
		},
		[auth?.accessToken, organizationId],
	);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	if (loading) {
		return <ScreenLoading />;
	}

	const organization = data?.organization;

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={() => {
						setRefreshing(true);
						void load({ soft: true });
					}}
					colors={[colors.accent]}
				/>
			}
		>
			{error ? <Text style={styles.error}>{error}</Text> : null}

			{organization ? (
				<>
					<DetailHeader
						title={organization.name}
						eyebrow="Organizacja"
						avatar={{
							name: organization.name,
							initials: organization.initials,
							logoUrl: organization.logoUrl,
						}}
						meta={[
							{ label: 'Opis', value: organization.description?.trim() ? organization.description : '—' },
							{ label: 'Utworzono', value: organization.createdAt || '—' },
							{ label: 'Ostatnia aktywność', value: organization.updatedAt || '—' },
							{ label: 'Sezony', value: String(organization.seasonCount ?? data?.seasons?.length ?? 0) },
							{ label: 'Ligi', value: String(data?.leagues?.length ?? 0) },
							{ label: 'Turnieje', value: String(organization.tournamentCount ?? 0) },
							{ label: 'Użytkownicy', value: String(organization.relatedUserCount ?? 0) },
							{ label: 'Goście', value: String(organization.guestCount ?? 0) },
						]}
					/>

					<FeedMuteButton
						accessToken={auth?.accessToken}
						subjectType="organization"
						subjectKey={organizationId}
					/>

					{data?.canManage ? (
						<ManageLinks
							actions={[
								{
									label: 'Edytuj organizację',
									onPress: () => navigation.navigate('OrganizationForm', { organizationId }),
								},
								{
									label: 'Dodaj sezon',
									onPress: () => navigation.navigate('SeasonForm', { organizationId }),
								},
								{
									label: 'Administratorzy',
									onPress: () => navigation.navigate('PeopleManage', { mode: 'org-admins', id: organizationId }),
								},
								{
									label: 'Skład',
									onPress: () => navigation.navigate('PeopleManage', { mode: 'roster', id: organizationId }),
								},
								{
									label: 'Goście',
									onPress: () => navigation.navigate('PeopleManage', { mode: 'guests', id: organizationId }),
								},
								{
									label: 'Usuń organizację',
									danger: true,
									onPress: () => navigation.navigate('ConfirmAction', {
										mode: 'delete',
										entity: 'organization',
										id: organizationId,
										name: organization.name,
									}),
								},
							]}
						/>
					) : null}

					<NameStrip title="Administratorzy" names={data?.admins} empty="Brak administratorów." />
					<NameStrip title="Skład" names={data?.relatedUsers} empty="Brak powiązanych użytkowników." />
					<NameStrip title="Goście" names={data?.guests} empty="Brak gości." />

					<Text style={styles.sectionTitle}>Ligi</Text>
					{(data?.leagues ?? []).length === 0 ? (
						<Text style={styles.empty}>Brak lig.</Text>
					) : (
						(data?.leagues ?? []).map((league) => (
							<Pressable
								key={league.id}
								style={styles.linkCard}
								onPress={() => navigation.navigate('LeagueDetail', { id: league.id })}
							>
								<Text style={styles.linkCardText}>{league.name}</Text>
								{league.divisionLabel ? (
									<Text style={styles.cardSub}>{league.divisionLabel}</Text>
								) : null}
							</Pressable>
						))
					)}

					<Text style={styles.sectionTitle}>Turnieje jednorazowe</Text>
					{data?.canManage ? (
						<Pressable
							style={styles.manageButton}
							onPress={() => navigation.navigate('CreateTournament', { organizationId })}
						>
							<Text style={styles.manageButtonText}>Nowy turniej</Text>
						</Pressable>
					) : null}
					{(data?.oneOffTournaments ?? []).length === 0 ? (
						<Text style={styles.empty}>Brak turniejów jednorazowych.</Text>
					) : (
						(data?.oneOffTournaments ?? []).map((tournament) => {
							const statusStyle =
								STATUS_STYLES[tournament.statusVariant] ?? STATUS_STYLES.finished;
							return (
								<Pressable
									key={tournament.id}
									style={styles.linkCard}
									onPress={() => navigation.navigate('TournamentDetail', { id: tournament.id })}
								>
									<View style={styles.cardHeader}>
										<Text style={styles.linkCardText}>{tournament.name}</Text>
										{tournament.statusLabel ? (
											<View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
												<Text style={[styles.badgeText, { color: statusStyle.text }]}>
													{tournament.statusLabel}
												</Text>
											</View>
										) : null}
									</View>
									<Text style={styles.cardSub}>
										{tournament.date
											? `Data: ${tournament.date}`
											: 'Data rozgrywek: nie ustawiono'}
									</Text>
								</Pressable>
							);
						})
					)}

					<Text style={styles.sectionTitle}>Sezony</Text>
					{(data?.seasons ?? []).length === 0 ? (
						<Text style={styles.empty}>Brak sezonów.</Text>
					) : (
						(data?.seasons ?? []).map((season) => (
							<Pressable
								key={season.id}
								style={styles.linkCard}
								onPress={() => navigation.navigate('SeasonDetail', { id: season.id })}
							>
								<Text style={styles.linkCardText}>{season.name}</Text>
								<Text style={styles.cardSub}>
									{season.dateLabel || 'Data rozgrywek: nie ustawiono'}
								</Text>
								{season.tournamentCountLabel ? (
									<Text style={styles.cardSub}>{season.tournamentCountLabel}</Text>
								) : null}
							</Pressable>
						))
					)}
				</>
			) : null}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, paddingBottom: 40 },
	centered: {
		flex: 1,
		backgroundColor: colors.bg,
		justifyContent: 'center',
		alignItems: 'center',
	},
	error: { color: colors.dangerText, marginBottom: 16, fontSize: 14 },
	sectionTitle: {
		marginTop: 20,
		marginBottom: 12,
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	empty: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
	linkCard: {
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 10,
	},
	linkCardText: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 10,
	},
	cardSub: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
	badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
	badgeText: { fontSize: 11, fontWeight: '600' },
	manageButton: {
		marginBottom: 12,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	manageButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
});

export default OrganizationDetailScreen;
