import React from 'react';
import CompetitionList from './CompetitionList';
import { getOrganizationsUrl } from '../../helpers/apiConfig';

const OrganizationsListScreen = ({ navigation }) => (
	<CompetitionList
		title="Organizacje"
		icon="business-outline"
		emptyTitle="Brak organizacji"
		emptyDescription="Utwórz pierwszą organizację na webie, aby organizować sezony i turnieje."
		buildUrl={getOrganizationsUrl}
		detailRoute="OrganizationDetail"
		navigation={navigation}
	/>
);

export default OrganizationsListScreen;
