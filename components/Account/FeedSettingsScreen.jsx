import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchFeedPreferences, updateFeedPreferences } from '../../helpers/feedApi';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

const VISIBILITY = [
	{ value: 'public', label: 'Wszyscy' },
	{ value: 'friends', label: 'Tylko znajomi' },
	{ value: 'friends_and_circle', label: 'Znajomi i gracze ze wspólnych rozgrywek' },
];

const FeedSettingsScreen = () => {
	const { auth } = useAuth();
	const [prefs, setPrefs] = useState(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		if (!auth?.accessToken) return;
		const result = await fetchFeedPreferences(auth.accessToken);
		if (!result.ok) {
			Alert.alert('Tablica', result.data?.message || 'Nie udało się wczytać ustawień.');
			return;
		}
		setPrefs(result.data);
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	const save = async (next) => {
		if (!auth?.accessToken || saving) return;
		setSaving(true);
		setPrefs(next);
		const result = await updateFeedPreferences(auth.accessToken, {
			profileFeedVisibility: next.profileFeedVisibility,
			channels: next.channels,
		});
		setSaving(false);
		if (!result.ok) {
			Alert.alert('Tablica', result.data?.message || 'Nie udało się zapisać.');
			void load();
		}
	};

	if (!prefs) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={colors.accent} />
			</View>
		);
	}

	return (
		<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
			<Text style={styles.section}>Kto widzi moją tablicę profilu</Text>
			{VISIBILITY.map((option) => {
				const selected = prefs.profileFeedVisibility === option.value;
				return (
					<Pressable
						key={option.value}
						style={styles.row}
						onPress={() => save({ ...prefs, profileFeedVisibility: option.value })}
					>
						<View style={[styles.radio, selected && styles.radioOn]} />
						<Text style={styles.rowText}>{option.label}</Text>
					</Pressable>
				);
			})}

			<Text style={styles.section}>Strona główna</Text>
			<View style={styles.row}>
				<Text style={styles.rowText}>Historie graczy</Text>
				<Switch
					value={!!prefs.channels?.friends}
					onValueChange={(value) =>
						save({ ...prefs, channels: { ...prefs.channels, friends: value } })
					}
					trackColor={{ true: colors.accent }}
				/>
			</View>
			<View style={styles.row}>
				<Text style={styles.rowText}>Historie organizacji</Text>
				<Switch
					value={!!prefs.channels?.organization}
					onValueChange={(value) =>
						save({ ...prefs, channels: { ...prefs.channels, organization: value } })
					}
					trackColor={{ true: colors.accent }}
				/>
			</View>

			{saving ? <ActivityIndicator color={colors.accent} style={styles.saving} /> : null}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: { flex: 1, backgroundColor: colors.bg },
	content: { padding: scaleSize(16), paddingBottom: scaleSize(32) },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
	section: {
		color: colors.textMuted,
		fontSize: scaleSize(12),
		fontWeight: '700',
		textTransform: 'uppercase',
		marginTop: scaleSize(18),
		marginBottom: scaleSize(8),
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleSize(10),
		paddingVertical: scaleSize(10),
	},
	rowText: { color: colors.text, flex: 1, fontSize: scaleSize(15) },
	radio: {
		width: scaleSize(16),
		height: scaleSize(16),
		borderRadius: scaleSize(8),
		borderWidth: 2,
		borderColor: colors.textDim,
	},
	radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
	saving: { marginTop: scaleSize(12) },
});

export default FeedSettingsScreen;
