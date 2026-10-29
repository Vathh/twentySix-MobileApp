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
import DetailHeader from './DetailHeader';
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
						meta={[
							{ label: 'Opis', value: organization.description?.trim() ? organization.description : '—' },
							{ label: 'Utworzono', value: organization.createdAt || '—' },
							{ label: 'Ostatnia aktywność', value: organization.updatedAt || '—' },
							{ label: 'Ligi', value: String(data?.leagues?.length ?? 0) },
							{ label: 'Sezony', value: String(data?.seasons?.length ?? 0) },
							{ label: 'Jednorazowe', value: String(data?.oneOffTournaments?.length ?? 0) },
						]}
					/>

					<FeedMuteButton
						accessToken={auth?.accessToken}
						subjectType="organization"
						subjectKey={organizationId}
					/>

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
							</Pressable>
						))
					)}

					<Text style={styles.sectionTitle}>Turnieje jednorazowe</Text>
					{(data?.oneOffTournaments ?? []).length === 0 ? (
						<Text style={styles.empty}>Brak turniejów jednorazowych.</Text>
					) : (
						(data?.oneOffTournaments ?? []).map((tournament) => (
							<Pressable
								key={tournament.id}
								style={styles.linkCard}
								onPress={() => navigation.navigate('TournamentDetail', { id: tournament.id })}
							>
								<Text style={styles.linkCardText}>{tournament.name}</Text>
							</Pressable>
						))
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
	linkCardText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});

export default OrganizationDetailScreen;
