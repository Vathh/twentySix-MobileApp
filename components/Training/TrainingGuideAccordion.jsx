import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Zwijaalne sekcje instrukcji (Cel / Jak / Punktacja / Limit).
 *
 * @param {{
 *   sections: Array<{ key: string, title: string, body?: string, lines?: string[] }>,
 * }} props
 */
export default function TrainingGuideAccordion({ sections }) {
	const [openKey, setOpenKey] = useState(sections?.[0]?.key ?? null);

	if (!Array.isArray(sections) || sections.length === 0) {
		return null;
	}

	return (
		<View style={styles.wrap}>
			{sections.map((section, sectionIndex) => {
				const open = openKey === section.key;
				const last = sectionIndex === sections.length - 1;
				const lines = Array.isArray(section.lines)
					? section.lines
					: section.body
						? [section.body]
						: [];
				return (
					<View key={section.key} style={[styles.item, last && styles.itemLast]}>
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ expanded: open }}
							accessibilityLabel={section.title}
							onPress={() => setOpenKey(open ? null : section.key)}
							style={({ pressed }) => [styles.head, pressed && styles.headPressed]}
						>
							<Text style={styles.title}>{section.title}</Text>
							<Ionicons
								name={open ? 'chevron-up' : 'chevron-down'}
								size={scaleSize(18)}
								color={colors.textMuted}
							/>
						</Pressable>
						{open ? (
							<View style={styles.body}>
								{lines.map((line, index) => (
									<Text key={`${section.key}-${index}`} style={styles.line}>
										{line}
									</Text>
								))}
							</View>
						) : null}
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		marginTop: 20,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	item: {
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	itemLast: {
		borderBottomWidth: 0,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	headPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	title: {
		flex: 1,
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	body: {
		paddingHorizontal: 14,
		paddingBottom: 14,
		gap: 6,
	},
	line: {
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 21,
	},
});
