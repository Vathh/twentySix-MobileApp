import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * @param {{ actions: Array<{ label: string, onPress: () => void, danger?: boolean }> }} props
 */
const ManageLinks = ({ actions }) => {
	if (!actions || actions.length === 0) {
		return null;
	}

	return (
		<View style={styles.wrap}>
			<Text style={styles.title}>Zarządzaj</Text>
			{actions.map((action) => (
				<Pressable
					key={action.label}
					style={styles.row}
					onPress={action.onPress}
					accessibilityRole="button"
				>
					<Text style={[styles.label, action.danger && styles.danger]}>{action.label}</Text>
				</Pressable>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: { marginTop: 8, marginBottom: 8 },
	title: {
		marginBottom: 8,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textDim,
	},
	row: {
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
	},
	label: { color: colors.text, fontSize: 15, fontWeight: '600' },
	danger: { color: colors.dangerText },
});

export default ManageLinks;
