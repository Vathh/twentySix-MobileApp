import React from 'react';
import CompetitionList from './CompetitionList';
import { getSeasonsUrl } from '../../helpers/apiConfig';

const SeasonsListScreen = ({ navigation }) => (
	<CompetitionList
		title="Sezony"
		icon="calendar-outline"
		emptyTitle="Brak sezonów"
		emptyDescription="Sezony pojawią się po utworzeniu ich w organizacji na webie."
		searchPlaceholder="Szukaj sezonu"
		statusOptions={[
			{ key: '', label: 'Wszystkie' },
			{ key: 'planned', label: 'Zaplanowane' },
			{ key: 'live', label: 'W trakcie' },
			{ key: 'finished', label: 'Zakończone' },
		]}
		sortOptions={[
			{ key: 'activity', label: 'Aktywność' },
			{ key: 'members', label: 'Użytkownicy' },
		]}
		buildUrl={getSeasonsUrl}
		detailRoute="SeasonDetail"
		navigation={navigation}
	/>
);

export default SeasonsListScreen;
