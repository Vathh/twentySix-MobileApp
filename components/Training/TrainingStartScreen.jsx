import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { loadRecentTraining } from '../../helpers/training/recentTrainingStore';
import ModeTile from '../Common/ModeTile';
import { TRAINING_SECTIONS } from './trainingSections';
import { colors } from '../../theme/colors';

const ENTRIES = [
	{ key: 'plans', title: 'Plan', section: 'plans' },
	{ key: 'exercise', title: 'Pojedyncze ćwiczenie', section: 'exercises', titleOverride: 'Pojedyncze ćwiczenie' },
	{ key: 'challenges', title: 'Wyzwanie', section: 'challenges' },
	{ key: 'favorites', title: 'Ulubione', section: 'favorites' },
];

/**
 * Ostatnio używane czytamy tylko z telefonu. Lista jest pusta, dopóki start sesji jej nie zapisze.
 * Wybranie otwiera szczegóły i nie startuje sesji.
 */
const TrainingStartScreen = ({ navigation }) => {
	const { auth } = useAuth();
	const [recent, setRecent] = useState([]);

	useFocusEffect(
		useCallback(() => {
			let cancelled = false;
			loadRecentTraining(auth?.userId).then((items) => {
				if (!cancelled) {
					setRecent(items);
				}
			});
			return () => {
				cancelled = true;
			};
		}, [auth?.userId]),
	);

	const open = (entry) => {
		if (entry.section === 'favorites') {
			navigation.navigate('TrainingFavorites');
			return;
		}
		navigation.navigate('TrainingCatalog', {
			kind: entry.section,
			title: entry.titleOverride,
		});
	};

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.container}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.form}>
				<Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>Rozpocznij trening</Text>
				{recent.length > 0 ? (
					<View style={styles.recent}>
						<Text style={styles.recentLabel}>Ostatnio używane</Text>
						{recent.map((item) => (
							<Pressable
								key={item.key}
								accessibilityRole="button"
								accessibilityLabel={item.name}
								style={styles.recentRow}
								onPress={() => navigation.navigate('TrainingDefinition', { id: item.id })}
							>
								<Text style={styles.recentName} numberOfLines={1}>
									{item.name}
								</Text>
							</Pressable>
						))}
					</View>
				) : null}
				{ENTRIES.map((entry) => {
					const section = TRAINING_SECTIONS[entry.section];
					return (
						<ModeTile
							key={entry.key}
							icon={section.icon}
							title={entry.title}
							onPress={() => open(entry)}
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
	recent: {
		marginBottom: 8,
	},
	recentLabel: {
		marginBottom: 8,
		fontSize: 13,
		fontWeight: '700',
		color: colors.textMuted,
	},
	recentRow: {
		backgroundColor: colors.bgElevated,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 8,
	},
	recentName: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
});

export default TrainingStartScreen;
