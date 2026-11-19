import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TRAINING_SECTIONS } from './trainingSections';
import { colors } from '../../theme/colors';

const TrainingSectionScreen = ({ route }) => {
	const section = TRAINING_SECTIONS[route?.params?.section] ?? {
		title: 'Trening',
		empty: 'Brak pozycji.',
	};
	const title = route?.params?.title || section.title;

	return (
		<View style={styles.container}>
			<View style={styles.form}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.empty}>{section.empty}</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	form: {
		width: '100%',
		maxWidth: 400,
		alignSelf: 'center',
	},
	title: {
		fontSize: 22,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 8,
	},
	empty: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
	},
});

export default TrainingSectionScreen;
