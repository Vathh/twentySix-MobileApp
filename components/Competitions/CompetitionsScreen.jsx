import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ModeTile from '../Common/ModeTile';
import { colors } from '../../theme/colors';

const SECTIONS = [
	{
		key: 'organizations',
		icon: 'business-outline',
		label: 'Organizacje',
		hint: 'Ligi, sezony i składy',
		route: 'OrganizationsList',
	},
	{
		key: 'seasons',
		icon: 'calendar-outline',
		label: 'Sezony',
		hint: 'Tabele i podziały ligowe',
		route: 'SeasonsList',
	},
	{
		key: 'tournaments',
		icon: 'trophy-outline',
		label: 'Turnieje',
		hint: 'Grupy, drabinki i wyniki',
		route: 'TournamentsList',
	},
];

/** Hub: Organizacje / Sezony / Turnieje (przeglądanie jak na webie). */
const CompetitionsScreen = ({ navigation }) => {
	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.container}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.form}>
				<Text style={styles.sectionLabel}>Przeglądaj</Text>
				{SECTIONS.map((section) => (
					<ModeTile
						key={section.key}
						icon={section.icon}
						title={section.label}
						hint={section.hint}
						onPress={() => navigation.navigate(section.route)}
					/>
				))}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	container: {
		flexGrow: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
	},
	form: {
		alignItems: 'stretch',
		width: '100%',
		maxWidth: 400,
	},
	sectionLabel: {
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
});

export default CompetitionsScreen;
