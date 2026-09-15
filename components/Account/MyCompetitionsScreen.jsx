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
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { fetchMyCompetitions } from '../../helpers/myCompetitionsApi';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

function formatSeasonMeta(item) {
	const parts = [];
	if (item.organizationName) {
		parts.push(item.organizationName);
	}
	if (item.startDate && item.endDate) {
		parts.push(`${item.startDate} – ${item.endDate}`);
	}
	return parts.join(' · ');
}

function formatLeagueMeta(item) {
	const parts = [];
	if (item.organizationName) {
		parts.push(item.organizationName);
	}
	if (item.divisionName) {
		parts.push(item.divisionName);
	}
	return parts.join(' · ');
}

const Section = ({ title, emptyText, items, onPress, subtitle, icon }) => (
	<View style={styles.section}>
		<Text style={styles.sectionLabel}>{title}</Text>
		{items.length === 0 ? (
			<Text style={styles.empty}>{emptyText}</Text>
		) : (
			<View style={styles.group}>
				{items.map((item, index) => {
					const last = index === items.length - 1;
					return (
						<Pressable
							key={`${title}-${item.id}`}
							accessibilityRole="button"
							onPress={() => onPress(item)}
							style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
						>
							<View style={styles.rowIcon}>
								<Ionicons name={icon} size={18} color={colors.accent} />
							</View>
							<View style={[styles.rowBody, !last && styles.rowBodyDivider]}>
								<View style={styles.cardHeader}>
									<Text style={styles.cardTitle} numberOfLines={1}>
										{item.name}
									</Text>
									<Text
										style={[
											styles.role,
											item.role === 'admin' ? styles.roleAdmin : styles.roleMember,
										]}
									>
										{item.roleLabel}
									</Text>
								</View>
								{subtitle(item) ? (
									<Text style={styles.cardSub} numberOfLines={1}>
										{subtitle(item)}
									</Text>
								) : null}
							</View>
							<Ionicons name="chevron-forward" size={16} color={colors.textDim} />
						</Pressable>
					);
				})}
			</View>
		)}
	</View>
);

/** Sezony turniejowe, ligi i organizacje, z którymi użytkownik jest powiązany. */
const MyCompetitionsScreen = ({ navigation }) => {
	const { auth } = useAuth();
	const [seasons, setSeasons] = useState([]);
	const [leagues, setLeagues] = useState([]);
	const [organizations, setOrganizations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(
		async ({ soft } = {}) => {
			if (!auth?.accessToken) {
				setError('Brak autoryzacji.');
				setLoading(false);
				return;
			}
			if (!soft) {
				setLoading(true);
			}

			const result = await fetchMyCompetitions(auth.accessToken);
			if (!result.ok) {
				if (!soft) {
					setSeasons([]);
					setLeagues([]);
					setOrganizations([]);
				}
				setError(result.message);
			} else {
				setError('');
				setSeasons(result.data.seasons);
				setLeagues(result.data.leagues);
				setOrganizations(result.data.organizations);
			}

			setLoading(false);
			setRefreshing(false);
		},
		[auth?.accessToken],
	);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	if (loading) {
		return <ScreenLoading />;
	}

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
			<View style={styles.form}>
				<Text style={styles.lead}>
					Sezony, ligi i organizacje, w których jesteś w składzie albo którymi zarządzasz.
				</Text>
				{error ? <Text style={styles.error}>{error}</Text> : null}

				<Section
					title="Sezony"
					icon="calendar-outline"
					emptyText="Nie jesteś powiązany z żadnym trwającym sezonem turniejowym."
					items={seasons}
					subtitle={formatSeasonMeta}
					onPress={(item) => navigation.navigate('SeasonDetail', { id: item.id })}
				/>
				<Section
					title="Ligi"
					icon="layers-outline"
					emptyText="Nie jesteś w żadnej lidze piramidowej."
					items={leagues}
					subtitle={formatLeagueMeta}
					onPress={(item) => navigation.navigate('LeagueDetail', { id: item.id })}
				/>
				<Section
					title="Organizacje"
					icon="business-outline"
					emptyText="Nie jesteś powiązany z żadną organizacją."
					items={organizations}
					subtitle={(item) => item.description || 'Organizacja'}
					onPress={(item) => navigation.navigate('OrganizationDetail', { id: item.id })}
				/>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		flexGrow: 1,
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		paddingBottom: 40,
	},
	form: {
		alignItems: 'stretch',
		width: '100%',
		maxWidth: 400,
	},
	lead: {
		color: colors.textMuted,
		fontSize: 13,
		lineHeight: 19,
		marginBottom: 8,
	},
	error: {
		color: colors.dangerText,
		marginBottom: 12,
		fontSize: 14,
	},
	section: {
		marginTop: 18,
	},
	sectionLabel: {
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	empty: {
		color: colors.textDim,
		fontSize: 13,
		lineHeight: 18,
	},
	group: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: 12,
		paddingRight: 10,
		minHeight: 56,
		gap: 12,
	},
	rowPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	rowIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	rowBody: {
		flex: 1,
		minWidth: 0,
		paddingVertical: 12,
	},
	rowBodyDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	cardTitle: {
		flex: 1,
		color: colors.text,
		fontSize: 15,
		fontWeight: '600',
	},
	cardSub: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 12,
	},
	role: {
		fontSize: 11,
		fontWeight: '700',
	},
	roleAdmin: {
		color: colors.accent,
	},
	roleMember: {
		color: colors.textDim,
	},
});

export default MyCompetitionsScreen;
