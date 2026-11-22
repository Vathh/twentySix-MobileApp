import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchTrainingGoals } from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';

function formatThreshold(goal) {
	if (goal.unit === 'percent') {
		return `${goal.threshold}%`;
	}
	return String(goal.threshold);
}

function formatValue(goal) {
	if (goal.unit === 'percent') {
		return `${goal.value}%`;
	}
	return String(goal.value);
}

function progressPercent(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return 0;
	}
	return Math.min(100, Math.max(0, n <= 1 ? n * 100 : n));
}

const TrainingGoalsScreen = () => {
	const { auth } = useAuth();
	const [goals, setGoals] = useState([]);
	const [badges, setBadges] = useState([]);
	const [medals, setMedals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [rule, setRule] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken) {
			setError('Zaloguj się, żeby zobaczyć cele.');
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		const result = await fetchTrainingGoals(auth.accessToken);
		setLoading(false);
		if (!result.ok) {
			setGoals([]);
			setBadges([]);
			setMedals([]);
			setError(result.data?.message || 'Nie udało się pobrać celów.');
			return;
		}
		setGoals(Array.isArray(result.data?.goals) ? result.data.goals : []);
		setBadges(Array.isArray(result.data?.badges) ? result.data.badges : []);
		setMedals(Array.isArray(result.data?.medals) ? result.data.medals : []);
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.content}>
				{loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
				{error ? (
					<View>
						<Text style={styles.error}>{error}</Text>
						<Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
							<Text style={styles.retryText}>Spróbuj ponownie</Text>
						</Pressable>
					</View>
				) : null}

				{!loading && !error ? (
					<>
						<Text style={styles.section}>Cele</Text>
						{goals.map((goal) => (
							<Pressable
								key={goal.id}
								accessibilityRole="button"
								accessibilityLabel={`${goal.name}, cel ${formatThreshold(goal)}`}
								onPress={() => setRule(goal)}
								style={styles.goalCard}
							>
								<View style={styles.goalHead}>
									<Text style={styles.goalName}>{goal.name}</Text>
									<Text style={styles.goalTarget}>{formatThreshold(goal)}</Text>
								</View>
								<Text style={styles.goalProgress}>
									{formatValue(goal)} / {formatThreshold(goal)}
									{goal.completed ? ' · ukończone' : ''}
								</Text>
								<View style={styles.barTrack}>
									<View style={[styles.barFill, { width: `${progressPercent(goal.progress)}%` }]} />
								</View>
							</Pressable>
						))}

						<Text style={styles.section}>Odznaki</Text>
						<View style={styles.slotRow}>
							{badges.map((badge) => (
								<View key={badge.id} style={styles.slot}>
									<View style={[styles.iconBox, badge.level ? styles.iconOn : styles.iconMuted]}>
										<Text style={styles.iconText}>Ikona</Text>
									</View>
									<Text style={styles.slotName}>{badge.name}</Text>
									<Text style={styles.slotMeta}>
										{badge.levelLabel || `Do ${badge.nextLevelLabel || 'Żelaza'}`}
									</Text>
									<View style={styles.barTrack}>
										<View style={[styles.barFill, { width: `${progressPercent(badge.progressToNext)}%` }]} />
									</View>
								</View>
							))}
						</View>

						<Text style={styles.section}>Medale</Text>
						<View style={styles.slotRow}>
							{medals.map((medal) => (
								<View key={medal.id} style={styles.slot}>
									<View style={[styles.iconBox, medal.placeholder ? styles.iconMuted : styles.iconOn]}>
										<Text style={styles.iconText}>Medal</Text>
									</View>
									<Text style={styles.slotName}>{medal.eventName || medal.name}</Text>
									<Text style={styles.slotMeta}>
										{medal.placeholder ? 'Puste miejsce' : (medal.color || '—')}
									</Text>
								</View>
							))}
						</View>
					</>
				) : null}
			</ScrollView>

			<Modal
				visible={Boolean(rule)}
				transparent
				animationType="fade"
				presentationStyle="overFullScreen"
				statusBarTranslucent
				onRequestClose={() => setRule(null)}
			>
				<Pressable style={styles.modalBackdrop} onPress={() => setRule(null)}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>{rule?.name}</Text>
						<Text style={styles.modalBody}>{rule?.rule}</Text>
						<Pressable accessibilityRole="button" onPress={() => setRule(null)} style={styles.retry}>
							<Text style={styles.retryText}>Zamknij</Text>
						</Pressable>
					</View>
				</Pressable>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		padding: 20,
		paddingBottom: 40,
	},
	loader: {
		marginTop: 24,
	},
	error: {
		color: colors.warning,
		fontSize: 14,
		marginBottom: 12,
	},
	retry: {
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryText: {
		color: colors.text,
		fontWeight: '700',
	},
	section: {
		marginTop: 8,
		marginBottom: 12,
		color: colors.text,
		fontSize: 18,
		fontWeight: '700',
	},
	goalCard: {
		marginBottom: 12,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	goalHead: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	goalName: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	goalTarget: {
		color: colors.accent,
		fontSize: 16,
		fontWeight: '700',
	},
	goalProgress: {
		marginTop: 8,
		marginBottom: 8,
		color: colors.textMuted,
		fontSize: 13,
	},
	barTrack: {
		height: 8,
		borderRadius: 999,
		backgroundColor: colors.bg,
		overflow: 'hidden',
	},
	barFill: {
		height: '100%',
		backgroundColor: colors.accent,
	},
	slotRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6,
		marginBottom: 8,
	},
	slot: {
		width: '50%',
		paddingHorizontal: 6,
		paddingVertical: 8,
		alignItems: 'center',
	},
	iconBox: {
		width: 72,
		height: 72,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	iconMuted: {
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		opacity: 0.55,
	},
	iconOn: {
		borderColor: colors.accent,
		backgroundColor: colors.bgElevated,
	},
	iconText: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
	},
	slotName: {
		color: colors.textSecondary,
		fontSize: 14,
		fontWeight: '700',
	},
	slotMeta: {
		marginTop: 2,
		marginBottom: 6,
		color: colors.textMuted,
		fontSize: 12,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		padding: 24,
	},
	modalCard: {
		borderRadius: 14,
		padding: 18,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 12,
	},
	modalTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '700',
	},
	modalBody: {
		color: colors.textSecondary,
		fontSize: 15,
		lineHeight: 22,
	},
});

export default TrainingGoalsScreen;
