import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
	DEFAULT_MATCH_FORMAT,
	STARTING_SCORE_OPTIONS,
	formatMatchLabel,
	normalizeMatchFormat,
} from '../../helpers/matchFormat/matchFormat';

export default function MatchFormatPicker({ value, onChange, disabled = false }) {
	const format = normalizeMatchFormat(value);

	const setField = (patch) => onChange(normalizeMatchFormat({ ...format, ...patch }));

	return (
		<View style={styles.wrap}>
			<Text style={styles.sectionLabel}>Format gry</Text>
			<Text style={styles.preview}>{formatMatchLabel(format)}</Text>

			<Text style={styles.label}>Punkty startowe</Text>
			<View style={styles.rowWrap}>
				{STARTING_SCORE_OPTIONS.map((score) => (
					<Pressable
						key={score}
						disabled={disabled}
						style={[
							styles.chip,
							format.startingScore === score && styles.chipActive,
						]}
						onPress={() => setField({ startingScore: score })}
					>
						<Text
							style={[
								styles.chipText,
								format.startingScore === score && styles.chipTextActive,
							]}
						>
							{score}
						</Text>
					</Pressable>
				))}
			</View>

			<Text style={styles.label}>Legi do wygrania seta</Text>
			<View style={styles.rowWrap}>
				{[1, 2, 3, 4, 5].map((n) => (
					<Pressable
						key={n}
						disabled={disabled}
						style={[
							styles.chip,
							format.legsToWinSet === n && styles.chipActive,
						]}
						onPress={() => setField({ legsToWinSet: n })}
					>
						<Text
							style={[
								styles.chipText,
								format.legsToWinSet === n && styles.chipTextActive,
							]}
						>
							{n}
						</Text>
					</Pressable>
				))}
			</View>

			<Text style={styles.label}>Sety do wygrania meczu</Text>
			<View style={styles.rowWrap}>
				{[1, 2, 3].map((n) => (
					<Pressable
						key={n}
						disabled={disabled}
						style={[
							styles.chip,
							format.setsToWinMatch === n && styles.chipActive,
						]}
						onPress={() => setField({ setsToWinMatch: n })}
					>
						<Text
							style={[
								styles.chipText,
								format.setsToWinMatch === n && styles.chipTextActive,
							]}
						>
							{n}
						</Text>
					</Pressable>
				))}
			</View>
		</View>
	);
}

export { DEFAULT_MATCH_FORMAT };

const styles = StyleSheet.create({
	wrap: { marginBottom: 16 },
	sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
	preview: { fontSize: 14, color: '#666', marginBottom: 12 },
	label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 8 },
	rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#eee',
	},
	chipActive: { backgroundColor: '#1a1a2e' },
	chipText: { fontSize: 14, color: '#333' },
	chipTextActive: { color: '#fff', fontWeight: '600' },
});
