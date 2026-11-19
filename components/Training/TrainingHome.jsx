import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ModeTile from '../Common/ModeTile';
import { TRAINING_SECTIONS } from './trainingSections';
import { colors } from '../../theme/colors';

const TILES = [
	{ key: 'start', title: 'Rozpocznij trening', icon: 'play-outline', variant: 'primary' },
	{ key: 'plans', section: 'plans' },
	{ key: 'challenges', section: 'challenges' },
	{ key: 'exercises', section: 'exercises' },
	{ key: 'free', title: 'Wolna gra', icon: 'barbell-outline' },
	{ key: 'analysis', section: 'analysis' },
	{ key: 'records', section: 'records' },
	{ key: 'goals', section: 'goals' },
	{ key: 'favorites', section: 'favorites' },
	{ key: 'history', section: 'history' },
];

/**
 * Ekran główny Trening. Wiszący plan (Wznów / Anuluj) dochodzi razem z silnikiem planu.
 */
const TrainingHome = ({ navigation }) => {
	const open = (tile) => {
		if (tile.key === 'start') {
			navigation.navigate('TrainingStart');
			return;
		}
		if (tile.key === 'free') {
			navigation.navigate('TrainingMatchSetup');
			return;
		}
		if (tile.section === 'favorites') {
			navigation.navigate('TrainingFavorites');
			return;
		}
		if (tile.section === 'plans' || tile.section === 'exercises' || tile.section === 'challenges') {
			navigation.navigate('TrainingCatalog', { kind: tile.section });
			return;
		}
		navigation.navigate('TrainingSection', { section: tile.section });
	};

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.container}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.form}>
				<Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>Trening</Text>
				{TILES.map((tile) => {
					const section = tile.section ? TRAINING_SECTIONS[tile.section] : null;
					return (
						<ModeTile
							key={tile.key}
							variant={tile.variant}
							icon={tile.icon ?? section.icon}
							title={tile.title ?? section.title}
							onPress={() => open(tile)}
						/>
					);
				})}
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
		marginTop: 20,
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	sectionLabelFirst: {
		marginTop: 0,
	},
});

export default TrainingHome;
