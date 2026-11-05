import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchPlayoffFormats, updatePlayoffFormats } from '../../helpers/tournamentManageApi';
import ScreenLoading from '../Common/ScreenLoading';
import { colors } from '../../theme/colors';

const PlayoffFormatsScreen = ({ route }) => {
	const { auth } = useAuth();
	const tournamentId = route.params?.tournamentId;
	const [sides, setSides] = useState([]);
	const [loading, setLoading] = useState(true);
	const [savingSide, setSavingSide] = useState('');
	const [error, setError] = useState('');
	const [info, setInfo] = useState('');

	const load = useCallback(async () => {
		const result = await fetchPlayoffFormats(auth?.accessToken, tournamentId);
		setLoading(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setSides(result.data.sides ?? []);
	}, [auth?.accessToken, tournamentId]);

	useFocusEffect(useCallback(() => {
		setLoading(true);
		void load();
	}, [load]));

	const setField = (side, stage, field, value) => {
		setSides((current) => current.map((block) => {
			if (block.side !== side) return block;
			return {
				...block,
				stages: block.stages.map((row) => (
					row.stage === stage ? { ...row, [field]: value.replace(/[^0-9]/g, '') } : row
				)),
			};
		}));
	};

	const save = async (block) => {
		const stages = {};
		block.stages.filter((row) => row.editable).forEach((row) => {
			stages[row.stage] = {
				legsToWinSet: Number(row.legsToWinSet) || 1,
				setsToWinMatch: Number(row.setsToWinMatch) || 1,
			};
		});
		if (Object.keys(stages).length === 0) {
			setError('Żaden szczebel nie jest jeszcze do zmiany.');
			return;
		}
		setSavingSide(block.side);
		setError('');
		setInfo('');
		const result = await updatePlayoffFormats(auth?.accessToken, tournamentId, {
			bracketSide: block.side,
			stages,
		});
		setSavingSide('');
		if (!result.ok) {
			setError(result.message);
			return;
		}
		const rejected = result.data.rejected ?? [];
		setInfo(rejected.length > 0
			? rejected.map((row) => row.message).join(' ')
			: 'Zapisano dystans rund.');
		void load();
	};

	if (loading) {
		return <ScreenLoading />;
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Text style={styles.lead}>
				Szczebel można zmienić, dopóki żaden jego mecz nie ruszył.
			</Text>
			{sides.map((block) => (
				<View key={block.side} style={styles.card}>
					<Text style={styles.title}>{block.label}</Text>
					{block.stages.map((row) => (
						<View key={row.stage} style={styles.stage}>
							<Text style={styles.stageTitle}>{row.label}</Text>
							{row.reason ? <Text style={styles.reason}>{row.reason}</Text> : null}
							<View style={styles.row}>
								<TextInput
									style={styles.input}
									keyboardType="number-pad"
									editable={row.editable}
									value={String(row.legsToWinSet ?? '')}
									onChangeText={(value) => setField(block.side, row.stage, 'legsToWinSet', value)}
									placeholder="Legi"
									placeholderTextColor={colors.placeholder}
								/>
								<TextInput
									style={styles.input}
									keyboardType="number-pad"
									editable={row.editable}
									value={String(row.setsToWinMatch ?? '')}
									onChangeText={(value) => setField(block.side, row.stage, 'setsToWinMatch', value)}
									placeholder="Sety"
									placeholderTextColor={colors.placeholder}
								/>
							</View>
						</View>
					))}
					<Pressable style={styles.button} onPress={() => save(block)} disabled={savingSide !== ''}>
						{savingSide === block.side
							? <ActivityIndicator color={colors.onAccent} />
							: <Text style={styles.buttonText}>Zapisz</Text>}
					</Pressable>
				</View>
			))}
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{info ? <Text style={styles.info}>{info}</Text> : null}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 20, paddingBottom: 40 },
	lead: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
	card: {
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
		marginBottom: 16,
	},
	title: { color: colors.accent, fontWeight: '700', fontSize: 16, marginBottom: 10 },
	stage: { marginBottom: 12 },
	stageTitle: { color: colors.text, fontWeight: '600' },
	reason: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
	row: { flexDirection: 'row', gap: 8, marginTop: 6 },
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
		color: colors.text,
		backgroundColor: colors.bg,
	},
	button: {
		marginTop: 4,
		backgroundColor: colors.accent,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	buttonText: { color: colors.onAccent, fontWeight: '700' },
	error: { color: colors.dangerText, marginTop: 8 },
	info: { color: colors.textSecondary, marginTop: 8 },
});

export default PlayoffFormatsScreen;
