import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ModeTile from '../Common/ModeTile';
import { colors } from '../../theme/colors';
import { TRAINING_SECTIONS } from './trainingSections';

const TILES = [
	{ key: 'analysis', section: 'analysis' },
	{ key: 'records', section: 'records' },
	{ key: 'goals', section: 'goals' },
	{ key: 'history', section: 'history' },
];

/**
 * Hub postępu: analiza, rekordy, cele i historia treningów.
 */
const TrainingProgressScreen = ({ navigation }) => {
	const open = (tile) => {
		if (tile.section === 'history') {
			navigation.navigate('TrainingHistory');
			return;
		}
		if (tile.section === 'analysis') {
			navigation.navigate('TrainingAnalysis');
			return;
		}
		if (tile.section === 'records') {
			navigation.navigate('TrainingRecords');
			return;
		}
		if (tile.section === 'goals') {
			navigation.navigate('TrainingGoals');
		}
	};

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
