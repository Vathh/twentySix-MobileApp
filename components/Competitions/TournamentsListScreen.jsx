import React from 'react';
import CompetitionList from './CompetitionList';
import { getTournamentsUrl } from '../../helpers/apiConfig';

const TournamentsListScreen = ({ navigation }) => (
	<CompetitionList
		title="Turnieje"
		icon="trophy-outline"
		emptyTitle="Brak turniejów"
		emptyDescription="Turnieje pojawią się po utworzeniu ich na webie."
		searchPlaceholder="Szukaj turnieju"
		statusOptions={[
			{ key: '', label: 'Wszystkie' },
			{ key: 'planned', label: 'Zaplanowane' },
			{ key: 'live', label: 'W trakcie' },
			{ key: 'finished', label: 'Zakończone' },
		]}
		sortOptions={[
			{ key: 'activity', label: 'Aktywność' },
			{ key: 'members', label: 'Uczestnicy' },
		]}
		buildUrl={getTournamentsUrl}
		detailRoute="TournamentDetail"
		navigation={navigation}
	/>
);

export default TournamentsListScreen;
