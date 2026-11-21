import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ModeTile from '../Common/ModeTile';
import useAuth from '../../hooks/useAuth';
import { clearHangingPlan, loadHangingPlan } from '../../helpers/training/planSessionStore';
import { loadHangingEvent } from '../../helpers/training/eventAttemptStore';
import { TRAINING_SECTIONS } from './trainingSections';
import { colors } from '../../theme/colors';

const TILES = [
	{ key: 'start', title: 'Rozpocznij trening', icon: 'play-outline', variant: 'primary' },
	{ key: 'plans', section: 'plans' },
	{ key: 'challenges', section: 'challenges' },
	{ key: 'events', section: 'events' },
	{ key: 'exercises', section: 'exercises' },
	{ key: 'free', title: 'Wolna gra', icon: 'barbell-outline' },
	{ key: 'analysis', section: 'analysis' },
	{ key: 'records', section: 'records' },
	{ key: 'goals', section: 'goals' },
	{ key: 'favorites', section: 'favorites' },
	{ key: 'history', section: 'history' },
];

/**
 * Ekran główny Trening. Baner wiszącego planu: Wznów / Anuluj (bez drugiego pytania).
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
			return () => {
				live = false;
			};
		}, [auth?.userId]),
	);

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
		if (tile.section === 'plans' || tile.section === 'exercises' || tile.section === 'challenges' || tile.section === 'events') {
			navigation.navigate('TrainingCatalog', { kind: tile.section });
			return;
		}
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
			return;
		}
		navigation.navigate('TrainingSection', { section: tile.section });
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
					<View style={styles.banner}>
						<Text style={styles.bannerText}>
							Wznów trening{hanging.plan?.name ? `: ${hanging.plan.name}` : ''}
						</Text>
						<View style={styles.bannerRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Wznów trening"
								onPress={resume}
								style={[styles.bannerButton, styles.bannerPrimary]}
							>
								<Text style={styles.bannerPrimaryText}>Wznów trening</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Anuluj trening"
								onPress={cancelHang}
								style={styles.bannerButton}
							>
								<Text style={styles.bannerGhostText}>Anuluj trening</Text>
							</Pressable>
						</View>
					</View>
				) : null}
				{hangingEvent ? (
					<View style={styles.banner}>
						<Text style={styles.bannerText}>
							Wznów event{hangingEvent.event?.name ? `: ${hangingEvent.event.name}` : ''}
						</Text>
						<View style={styles.bannerRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Wznów event"
								onPress={resumeEvent}
								style={[styles.bannerButton, styles.bannerPrimary]}
							>
								<Text style={styles.bannerPrimaryText}>Wznów event</Text>
							</Pressable>
						</View>
					</View>
				) : null}
				<Text style={[styles.sectionLabel, (hanging || hangingEvent) ? null : styles.sectionLabelFirst]}>Trening</Text>
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
	banner: {
		marginBottom: 16,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		backgroundColor: colors.accentMuted,
	},
	bannerText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		marginBottom: 10,
	},
	bannerRow: {
		flexDirection: 'row',
		gap: 8,
	},
	bannerButton: {
		flex: 1,
		minHeight: 42,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	bannerPrimary: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	bannerPrimaryText: {
		color: colors.onAccent ?? colors.bgDeep,
		fontSize: 14,
		fontWeight: '700',
	},
	bannerGhostText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
});

export default TrainingHome;
