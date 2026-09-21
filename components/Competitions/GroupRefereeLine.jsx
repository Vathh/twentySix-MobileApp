import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { groupRefereeSlots } from '../../helpers/groupMatrix';
import { colors } from '../../theme/colors';

export default function GroupRefereeLine({ games }) {
	const slots = groupRefereeSlots(games);
	if (slots.length === 0) {
		return null;
	}

	return (
		<Text style={styles.line}>
			<Text style={styles.label}>Sędziowie: </Text>
			{slots.map((slot, index) => (
				<Text key={slot.id}>
					<Text
						style={[
							slot.status === 'finished' && styles.done,
							slot.status === 'in_progress' && styles.live,
						]}
					>
						{slot.referee.name}
					</Text>
					{index < slots.length - 1 ? ', ' : ''}
				</Text>
			))}
		</Text>
	);
}

const styles = StyleSheet.create({
	line: {
		marginTop: 12,
		fontSize: 14,
		lineHeight: 20,
		color: colors.textSecondary,
		textAlign: 'center',
	},
	label: {
		color: colors.textMuted,
	},
	done: {
		color: colors.textMuted,
		textDecorationLine: 'line-through',
	},
	live: {
		color: colors.accent,
		fontWeight: '700',
	},
});
