import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Odczytowa lista nazw — administratorzy, skład, goście.
 *
 * @param {{
 *   title: string,
 *   names?: Array<{ id?: number, playerId?: number|null, name: string }>,
 *   empty: string,
 *   collapsible?: boolean,
 *   onNamePress?: (person: { id?: number, playerId?: number|null, name: string }) => void,
 * }} props
 */
const NameStrip = ({ title, names, empty, collapsible = false, onNamePress }) => {
	const rows = Array.isArray(names) ? names : [];
	const [open, setOpen] = useState(!collapsible);
	const countLabel = `${title} (${rows.length})`;

	const header = collapsible ? (
		<Pressable
			style={styles.header}
			onPress={() => setOpen((current) => !current)}
			accessibilityRole="button"
		>
			<Text style={styles.title}>{countLabel}</Text>
			<Ionicons
				name={open ? 'chevron-up' : 'chevron-down'}
				size={scaleSize(16)}
				color={colors.textDim}
			/>
		</Pressable>
	) : (
		<Text style={styles.title}>{title}</Text>
	);

	return (
		<View style={[styles.wrap, collapsible && styles.card]}>
			{header}
			{open ? (
				rows.length === 0 ? (
					<Text style={styles.empty}>{empty}</Text>
				) : (
					<View style={styles.chips}>
						{rows.map((person) => {
							const pressable = typeof onNamePress === 'function' && person.playerId != null;
							const chip = (
								<Text style={[styles.chipText, pressable && styles.chipLink]}>{person.name}</Text>
							);
							if (!pressable) {
								return (
									<View key={String(person.id ?? person.name)} style={styles.chip}>
										{chip}
									</View>
								);
							}
							return (
								<Pressable
									key={String(person.playerId)}
									style={styles.chip}
									onPress={() => onNamePress(person)}
									accessibilityRole="button"
								>
									{chip}
								</Pressable>
							);
						})}
					</View>
				)
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		marginTop: 16,
	},
	card: {
		marginTop: 10,
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	title: {
		marginBottom: 0,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textDim,
		flex: 1,
	},
	empty: {
		marginTop: 8,
		color: colors.textMuted,
		fontSize: 14,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 10,
	},
	chip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: colors.bg,
		borderWidth: 1,
		borderColor: colors.border,
	},
	chipText: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '600',
	},
	chipLink: {
		color: colors.accent,
	},
});

export default NameStrip;
