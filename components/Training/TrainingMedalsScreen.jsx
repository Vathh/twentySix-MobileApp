import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchTrainingMedals } from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';

function medalLabel(color) {
	const key = String(color || '').toLowerCase();
	if (key.includes('gold') || key.includes('złot')) {
		return 'Złoto';
	}
	if (key.includes('silver') || key.includes('srebr')) {
		return 'Srebro';
	}
	if (key.includes('bronze') || key.includes('brąz')) {
		return 'Brąz';
	}
	return color || '—';
}

/**
 * Galeria medali z zakończonych eventów treningowych.
 */
const TrainingMedalsScreen = () => {
	const { auth } = useAuth();
	const [medals, setMedals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken) {
			setError('Zaloguj się, żeby zobaczyć medale.');
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		const result = await fetchTrainingMedals(auth.accessToken);
		setLoading(false);
		if (!result.ok) {
			setMedals([]);
			setError(result.data?.message || 'Nie udało się pobrać medali.');
			return;
		}
		setMedals(Array.isArray(result.data?.medals) ? result.data.medals : []);
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const visible = medals.filter((row) => !row.placeholder);
	const showPlaceholder = !loading && !error && visible.length === 0;

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
						<Text style={styles.section}>Medale</Text>
						{showPlaceholder ? (
							<Text style={styles.empty}>
								Medale pojawią się po zajęciu miejsca 1–3 w zakończonym evencie.
							</Text>
						) : (
							<View style={styles.slotRow}>
								{visible.map((medal) => (
									<View key={medal.id} style={styles.slot}>
										<View style={[styles.iconBox, styles.iconOn]}>
											<Text style={styles.iconText}>Medal</Text>
										</View>
										<Text style={styles.slotName}>{medal.eventName || medal.name}</Text>
										<Text style={styles.slotMeta}>{medalLabel(medal.color)}</Text>
									</View>
								))}
							</View>
						)}
					</>
				) : null}
			</ScrollView>
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
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
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
		textAlign: 'center',
	},
	slotMeta: {
		marginTop: 2,
		marginBottom: 6,
		color: colors.textMuted,
		fontSize: 12,
	},
});

export default TrainingMedalsScreen;
