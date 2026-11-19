import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function useTrainingNotice() {
	const [text, setText] = useState(null);
	const timer = useRef(null);

	useEffect(() => () => clearTimeout(timer.current), []);

	const show = useCallback((message) => {
		if (!message) {
			return;
		}
		setText(message);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setText(null), 2500);
	}, []);

	return { text, show };
}

export default function TrainingNotice({ text }) {
	if (!text) {
		return null;
	}
	return (
		<View style={styles.banner}>
			<Text style={styles.text}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		backgroundColor: colors.bgElevated,
		borderColor: colors.accentBorder,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginBottom: 12,
	},
	text: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '600',
	},
});
