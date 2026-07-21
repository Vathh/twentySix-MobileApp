import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
	clearReverbDebugLog,
	isReverbDebugEnabled,
	subscribeReverbDebugLog,
} from '../helpers/reverbDebugLog';
import { colors } from '../theme/colors';

const LEVEL_COLOR = {
	info: colors.textDim,
	warn: colors.warning,
	error: colors.danger,
};

export default function ReverbDebugPanel() {
	const [rows, setRows] = useState([]);
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		if (!isReverbDebugEnabled()) {
			return undefined;
		}
		return subscribeReverbDebugLog(setRows);
	}, []);

	if (!isReverbDebugEnabled()) {
		return null;
	}

	return (
		<View style={styles.wrap}>
			<Pressable
				style={styles.header}
				onPress={() => setExpanded((v) => !v)}
			>
				<Text style={styles.headerText}>
					Diagnostyka sync ({rows.length}) {expanded ? '▾' : '▸'}
				</Text>
				<Pressable
					onPress={(e) => {
						e?.stopPropagation?.();
						clearReverbDebugLog();
					}}
					hitSlop={8}
				>
					<Text style={styles.clearBtn}>Wyczyść</Text>
				</Pressable>
			</Pressable>
			{expanded ? (
				<ScrollView style={styles.log} nestedScrollEnabled>
					{rows.length === 0 ? (
						<Text style={styles.empty}>Brak wpisów — otwórz lobby i poczekaj na WS.</Text>
					) : (
						rows.map((row) => (
							<Text
								key={row.id}
								style={[
									styles.line,
									{ color: LEVEL_COLOR[row.level] ?? LEVEL_COLOR.info },
								]}
							>
								{row.ts} [{row.scope}] {row.message}
								{row.detail ? `\n  → ${row.detail}` : ''}
							</Text>
						))
					)}
				</ScrollView>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		marginTop: 12,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		borderRadius: 8,
		backgroundColor: colors.scrim,
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: colors.scrimSoft,
	},
	headerText: {
		color: colors.textSecondary,
		fontSize: 12,
		fontWeight: '600',
	},
	clearBtn: {
		color: colors.textDim,
		fontSize: 11,
	},
	log: {
		maxHeight: 160,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	line: {
		fontSize: 10,
		fontFamily: 'monospace',
		marginBottom: 6,
	},
	empty: {
		fontSize: 11,
		color: colors.textDim,
		fontStyle: 'italic',
	},
});
