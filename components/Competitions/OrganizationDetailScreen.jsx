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
import { Ionicons } from '@expo/vector-icons';
import { STATUS_STYLES } from './DetailHeader';
import PlayerAvatar from '../Common/PlayerAvatar';
import NameStrip from './NameStrip';
import { scaleSize } from '../../theme/uiScale';
import ManageLinks from './ManageLinks';
import FollowButton from '../Activity/FollowButton';
import { applyOrganizationJoinRequest } from '../../helpers/competitionManageApi';
import ScreenLoading from '../Common/ScreenLoading';
import { colors } from '../../theme/colors';

const OrganizationDetailScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const organizationId = route.params?.id;
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [joining, setJoining] = useState(false);

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

	const applyToOrganization = async () => {
		setJoining(true);
		setError('');
		const result = await applyOrganizationJoinRequest(auth?.accessToken, organizationId);
		setJoining(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setData((current) => (current ? { ...current, join: result.data?.join ?? current.join } : current));
	};

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
					<View style={styles.hero}>
						<Text style={styles.eyebrow}>Organizacja</Text>
						<View style={styles.heroRow}>
							<PlayerAvatar
								name={organization.name}
								initials={organization.initials}
								avatarUrl={organization.logoUrl}
								size={56}
								rounded={12}
							/>
							<Text style={styles.heroTitle}>{organization.name}</Text>
						</View>
						{organization.description?.trim() ? (
							<Text style={styles.heroLead}>{organization.description.trim()}</Text>
						) : null}
					</View>
					<View style={styles.stats}>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Sezony</Text>
							<Text style={styles.statValue}>{organization.seasonCount ?? data?.seasons?.length ?? 0}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Ligi</Text>
							<Text style={styles.statValue}>{data?.leagues?.length ?? 0}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Turnieje</Text>
							<Text style={styles.statValue}>{organization.tournamentCount ?? 0}</Text>
						</View>
						<View style={styles.stat}>
							<Text style={styles.statLabel}>Skład</Text>
							<Text style={styles.statValue}>{organization.relatedUserCount ?? 0}</Text>
						</View>
					</View>
					{(organization.createdAt || organization.updatedAt) ? (
						<Text style={styles.dates}>
							{[
								organization.createdAt ? `Utworzono ${organization.createdAt}` : null,
								organization.updatedAt ? `Aktywność ${organization.updatedAt}` : null,
							].filter(Boolean).join(' · ')}
						</Text>
					) : null}

					<FollowButton
						accessToken={auth?.accessToken}
						subjectType="organization"
						subjectKey={organizationId}
					/>

					{data?.join?.alreadyMember ? (
						<Text style={styles.joinNote}>Jesteś w składzie tej organizacji.</Text>
					) : data?.join?.alreadyPending ? (
						<Text style={styles.joinNote}>Zgłoszenie wysłane. Czekasz na decyzję organizatora.</Text>
					) : data?.join?.hasInvitation ? (
						<Text style={styles.joinNote}>Masz zaproszenie do tej organizacji.</Text>
					) : data?.join?.canApply ? (
						<Pressable style={styles.manageButton} disabled={joining} onPress={applyToOrganization}>
							<Text style={styles.manageButtonText}>{joining ? 'Wysyłanie…' : 'Zgłoś się'}</Text>
						</Pressable>
					) : data?.join?.reason ? (
						<Text style={styles.joinNote}>{data.join.reason}</Text>
					) : null}

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

					<NameStrip title="Administratorzy" names={data?.admins} empty="Brak administratorów." collapsible />
					<NameStrip
						title="Skład"
						names={data?.relatedUsers}
						empty="Brak powiązanych użytkowników."
						collapsible
						onNamePress={(person) => navigation.navigate('PlayerProfile', {
							playerId: person.playerId,
							name: person.name,
						})}
					/>
					<NameStrip title="Goście" names={data?.guests} empty="Brak gości." collapsible />

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
								<View style={styles.cardHeader}>
									<Text style={styles.linkCardText}>{league.name}</Text>
									<Ionicons name="chevron-forward" size={scaleSize(18)} color={colors.textDim} />
								</View>
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
										<Ionicons name="chevron-forward" size={scaleSize(18)} color={colors.textDim} />
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
								<View style={styles.cardHeader}>
									<Text style={styles.linkCardText}>{season.name}</Text>
									<Ionicons name="chevron-forward" size={scaleSize(18)} color={colors.textDim} />
								</View>
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
	hero: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		padding: 14,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		color: colors.textDim,
		marginBottom: 8,
	},
	heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	heroTitle: { flex: 1, color: colors.text, fontSize: 24, fontWeight: '700' },
	heroLead: { marginTop: 10, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
	stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
	stat: {
		flex: 1,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 6,
		alignItems: 'center',
	},
	statLabel: { color: colors.textDim, fontSize: 11 },
	statValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
	dates: { marginTop: 8, color: colors.textDim, fontSize: 12 },
	sectionTitle: {
		marginTop: 24,
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
	joinNote: { color: colors.textMuted, marginTop: 12, marginBottom: 8 },
});

export default OrganizationDetailScreen;
