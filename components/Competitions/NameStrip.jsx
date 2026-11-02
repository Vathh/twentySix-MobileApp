import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Odczytowa lista nazw — administratorzy, skład, goście.
 *
 * @param {{ title: string, names?: Array<{ id?: number, name: string }>, empty: string }} props
 */
const NameStrip = ({ title, names, empty }) => {
	const rows = Array.isArray(names) ? names : [];

	return (
		<View style={styles.wrap}>
			<Text style={styles.title}>{title}</Text>
			{rows.length === 0 ? (
				<Text style={styles.empty}>{empty}</Text>
			) : (
				<View style={styles.chips}>
					{rows.map((person) => (
						<View key={String(person.id ?? person.name)} style={styles.chip}>
							<Text style={styles.chipText}>{person.name}</Text>
						</View>
					))}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		marginTop: 16,
	},
	title: {
		marginBottom: 8,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	empty: {
		color: colors.textMuted,
		fontSize: 14,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	chipText: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '600',
	},
});

export default NameStrip;
