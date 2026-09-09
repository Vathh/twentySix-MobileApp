import React, { useCallback, useState } from 'react';
import {
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
	formatTrainingGameDate,
	formatTrainingGameTitle,
} from '../../helpers/trainingHistory/buildTrainingGameRecord';
import { loadTrainingHistory } from '../../helpers/trainingHistory/persistTrainingHistory';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

const TrainingHistoryList = ({ navigation }) => {
	const [games, setGames] = useState([]);
	const [loading, setLoading] = useState(true);

	useFocusEffect(
		useCallback(() => {
			let cancelled = false;
			setLoading(true);
			loadTrainingHistory().then((list) => {
				if (!cancelled) {
					setGames(list);
					setLoading(false);
				}
			});
			return () => {
				cancelled = true;
			};
		}, []),
	);

	if (loading) {
		return <ScreenLoading />;
	}

	return (
		<FlatList
			style={styles.scroll}
			contentContainerStyle={styles.container}
			data={games}
			keyExtractor={(game) => String(game.id)}
			ListHeaderComponent={<Text style={styles.title}>Historia treningów</Text>}
			ListEmptyComponent={(
				<View style={styles.emptyBox}>
					<Text style={styles.emptyText}>
						Brak zapisanych treningów. Zagraj mecz treningowy, a wynik pojawi
						się tutaj.
					</Text>
				</View>
			)}
			renderItem={({ item: game }) => (
				<Pressable
					style={styles.row}
					onPress={() =>
						navigation.navigate('TrainingGameDetail', { gameId: game.id })
					}
				>
					<Text style={styles.rowTitle} numberOfLines={2}>
						{formatTrainingGameTitle(game)}
					</Text>
					<Text style={styles.rowDate}>
						{formatTrainingGameDate(game.playedAt)}
					</Text>
					{game.winnerName ? (
						<Text style={styles.rowWinner}>
							Zwycięzca: {game.winnerName}
						</Text>
					) : null}
				</Pressable>
			)}
		/>
	);
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	container: {
		padding: 20,
		paddingBottom: 40,
	},
	title: {
		fontSize: 22,
		color: colors.accent,
		fontWeight: '600',
		marginBottom: 20,
		textAlign: 'center',
	},
	emptyBox: {
		padding: 20,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
	},
	emptyText: {
		fontSize: 15,
		color: colors.textDim,
		textAlign: 'center',
		lineHeight: 22,
	},
	row: {
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	rowTitle: {
		fontSize: 16,
		color: colors.text,
		fontWeight: '600',
		marginBottom: 4,
	},
	rowDate: {
		fontSize: 13,
		color: colors.textMuted,
		marginBottom: 4,
	},
	rowWinner: {
		fontSize: 13,
		color: colors.accent,
	},
});

export default TrainingHistoryList;
