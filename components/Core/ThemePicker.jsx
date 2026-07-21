import React from 'react';
import { Alert, DevSettings, Pressable, StyleSheet, Text, View } from 'react-native';
import {
	THEME_OPTIONS,
	getActiveThemeId,
	setColorTheme,
	colors,
} from '../../theme/colors';

/**
 * Przełącznik Purple Night ↔ Arena Dark.
 * Po wyborze zapisuje motyw i przeładowuje appę (StyleSheet jest „zamrożony” przy starcie).
 */
export default function ThemePicker() {
	const activeId = getActiveThemeId();

	const handleSelect = async (themeId) => {
		if (themeId === activeId) return;
		try {
			await setColorTheme(themeId);
			const label = THEME_OPTIONS.find((t) => t.id === themeId)?.label ?? themeId;
			if (typeof DevSettings?.reload === 'function') {
				DevSettings.reload();
				return;
			}
			Alert.alert(
				'Motyw zapisany',
				`Wybrano: ${label}. Zrestartuj aplikację, żeby zobaczyć zmiany.`,
			);
		} catch (e) {
			Alert.alert('Błąd', 'Nie udało się zapisać motywu.');
			console.warn('setColorTheme', e);
		}
	};

	return (
		<View style={styles.section}>
			<Text style={styles.label}>Motyw kolorów</Text>
			<Text style={styles.hint}>
				Porównaj Purple Night i Arena Dark. Po zmianie aplikacja się przeładuje.
			</Text>
			<View style={styles.options}>
				{THEME_OPTIONS.map((opt) => {
					const selected = opt.id === activeId;
					return (
						<Pressable
							key={opt.id}
							style={[styles.option, selected && styles.optionSelected]}
							onPress={() => handleSelect(opt.id)}
						>
							<Text style={[styles.optionText, selected && styles.optionTextSelected]}>
								{opt.label}
							</Text>
							<Text style={styles.optionDesc}>{opt.description}</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		marginBottom: 24,
	},
	label: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 4,
	},
	hint: {
		color: colors.textDim,
		fontSize: 14,
		marginBottom: 12,
	},
	options: {
		gap: 12,
	},
	option: {
		padding: 16,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: colors.border,
		backgroundColor: colors.scrimSoft,
	},
	optionSelected: {
		borderColor: colors.accent,
		backgroundColor: colors.accentMuted,
	},
	optionText: {
		color: colors.textMuted,
		fontSize: 16,
		fontWeight: '600',
	},
	optionTextSelected: {
		color: colors.accent,
	},
	optionDesc: {
		color: colors.textDim,
		fontSize: 13,
		marginTop: 4,
	},
});
