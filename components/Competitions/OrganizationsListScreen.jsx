import React from 'react';
import CompetitionList from './CompetitionList';
import { getOrganizationsUrl } from '../../helpers/apiConfig';

const OrganizationsListScreen = ({ navigation }) => (
	<CompetitionList
		title="Organizacje"
		icon="business-outline"
		emptyTitle="Brak organizacji"
		emptyDescription="Utwórz pierwszą organizację na webie, aby organizować sezony i turnieje."
		searchPlaceholder="Szukaj organizacji"
		sortOptions={[
			{ key: 'activity', label: 'Aktywność' },
			{ key: 'members', label: 'Użytkownicy' },
		]}
		buildUrl={getOrganizationsUrl}
		detailRoute="OrganizationDetail"
		navigation={navigation}
		createLabel="Nowa organizacja"
		onCreate={() => navigation.navigate('OrganizationForm')}
	/>
);

export default OrganizationsListScreen;
