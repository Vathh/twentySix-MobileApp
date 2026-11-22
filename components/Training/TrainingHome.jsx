import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ModeTile from '../Common/ModeTile';
import useAuth from '../../hooks/useAuth';
import { prefetchTrainingCatalogs } from '../../helpers/training/catalogCache';
import { clearHangingPlan, loadHangingPlan } from '../../helpers/training/planSessionStore';
import { loadHangingEvent } from '../../helpers/training/eventAttemptStore';
import { TRAINING_SECTIONS } from './trainingSections';
import TrainingGridTile from './TrainingGridTile';
import TrainingHeroCta from './TrainingHeroCta';
import TrainingResumeBanner from './TrainingResumeBanner';
import { colors } from '../../theme/colors';

const CATALOG_GRID = [
	{ key: 'plans', section: 'plans' },
	{ key: 'exercises', section: 'exercises' },
	{ key: 'challenges', section: 'challenges' },
	{ key: 'events', section: 'events' },
];

/**
 * Ekran główny Trening: hero CTA, siatka katalogów, wznowienie sesji.
 */
const TrainingHome = ({ navigation }) => {
	const { auth } = useAuth();
	const [hanging, setHanging] = useState(null);
	const [hangingEvent, setHangingEvent] = useState(null);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			Promise.all([
				loadHangingPlan(auth?.userId),
				loadHangingEvent(auth?.userId),
			]).then(([hang, eventHang]) => {
				if (!live) {
					return;
				}
				setHanging(hang?.phase === 'running' ? hang : null);
				setHangingEvent(eventHang?.phase === 'running' ? eventHang : null);
			});
			if (auth?.accessToken) {
				prefetchTrainingCatalogs(auth.userId, auth.accessToken);
			}
			return () => {
				live = false;
			};
		}, [auth?.userId, auth?.accessToken]),
	);

	const openCatalog = (section) => {
		navigation.navigate('TrainingCatalog', { kind: section });
	};

	const resume = () => {
		navigation.navigate('TrainingPlan', { resume: true });
	};

	const resumeEvent = () => {
		navigation.navigate('TrainingEvent', { resume: true });
	};

	const cancelHang = async () => {
		await clearHangingPlan(auth?.userId);
		setHanging(null);
	};

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.container}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.form}>
				{hanging ? (
					<TrainingResumeBanner
						title={`Wznów trening${hanging.plan?.name ? `: ${hanging.plan.name}` : ''}`}
						primaryLabel="Wznów trening"
						onPrimary={resume}
						secondaryLabel="Anuluj trening"
						onSecondary={cancelHang}
					/>
				) : null}
				{hangingEvent ? (
					<TrainingResumeBanner
						title={`Wznów event${hangingEvent.event?.name ? `: ${hangingEvent.event.name}` : ''}`}
						primaryLabel="Wznów event"
						onPrimary={resumeEvent}
					/>
				) : null}

				<TrainingHeroCta
					title="Rozpocznij trening"
					subtitle="Ulubione i ostatnie sesje"
					onPress={() => navigation.navigate('TrainingStart')}
				/>

				<Text style={styles.sectionLabel}>Katalog</Text>
				<View style={styles.grid}>
					{CATALOG_GRID.map((tile) => {
						const section = TRAINING_SECTIONS[tile.section];
						return (
							<View key={tile.key} style={styles.gridCell}>
								<TrainingGridTile
									icon={section.icon}
									title={section.title}
									hint={section.hint}
									onPress={() => openCatalog(tile.section)}
								/>
							</View>
						);
					})}
				</View>

				<Text style={styles.sectionLabel}>Więcej</Text>
				<ModeTile
					icon="barbell-outline"
					title="Wolna gra"
					hint="Wybierz tryb i zagraj sam lub ze znajomymi"
					onPress={() => navigation.navigate('TrainingMatchSetup')}
				/>
				<ModeTile
					icon={TRAINING_SECTIONS.progress.icon}
					title={TRAINING_SECTIONS.progress.title}
					hint={TRAINING_SECTIONS.progress.hint}
					onPress={() => navigation.navigate('TrainingProgress')}
				/>
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
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
	},
	form: {
		width: '100%',
		maxWidth: 400,
	},
	sectionLabel: {
		marginTop: 4,
		marginBottom: 12,
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 10,
		marginBottom: 20,
	},
	gridCell: {
		width: '48.5%',
	},
});

export default TrainingHome;
