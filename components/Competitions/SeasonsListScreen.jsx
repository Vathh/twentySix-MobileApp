import React from 'react';
import CompetitionList from './CompetitionList';
import { getSeasonsUrl } from '../../helpers/apiConfig';

const SeasonsListScreen = ({ navigation }) => (
	<CompetitionList
		title="Sezony"
		icon="calendar-outline"
		emptyTitle="Brak sezonów"
		emptyDescription="Sezony pojawią się po utworzeniu ich w organizacji na webie."
		buildUrl={getSeasonsUrl}
		detailRoute="SeasonDetail"
		navigation={navigation}
	/>
);

export default SeasonsListScreen;
