import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ModeTile from '../Common/ModeTile';
import { colors } from '../../theme/colors';
import { TRAINING_SECTIONS } from './trainingSections';

const TILES = [
	{ key: 'analysis', section: 'analysis', route: 'TrainingAnalysis' },
	{ key: 'records', section: 'records', route: 'TrainingRecords' },
	{ key: 'medals', section: 'medals', route: 'TrainingMedals' },
	{ key: 'history', section: 'history', route: 'TrainingHistory' },
];

/**
 * Hub postępu: analiza, rekordy, medale i historia treningów.
 */
const TrainingProgressScreen = ({ navigation }) => {
	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.container}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.form}>
				<Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>Postępy</Text>
				{TILES.map((tile) => {
					const section = TRAINING_SECTIONS[tile.section];
					return (
						<ModeTile
							key={tile.key}
							icon={section.icon}
							title={section.title}
							onPress={() => navigation.navigate(tile.route)}
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
		width: '100%',
		maxWidth: 400,
	},
	sectionLabel: {
		marginTop: 8,
		marginBottom: 12,
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	sectionLabelFirst: {
		marginTop: 0,
	},
});

export default TrainingProgressScreen;
