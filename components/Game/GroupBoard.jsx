import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CompetitionTable from '../Competitions/CompetitionTable';
import GroupRefereeLine from '../Competitions/GroupRefereeLine';
import { layoutGroupBoard } from '../../helpers/groupBoardLayout';
import { colors } from '../../theme/colors';
import { getUiScale, scaleSize } from '../../theme/uiScale';

export default function GroupBoard({
	groupNumber,
	matrix,
	games,
	empty = false,
	onBack,
	onGamePress,
	lockingGameId = null,
}) {
	const { width } = useWindowDimensions();
	const [pane, setPane] = useState('matches');
	const [boardWidth, setBoardWidth] = useState(0);
	const available = boardWidth > 0 ? boardWidth : Math.max(0, width - scaleSize(32));
	const layout = layoutGroupBoard(matrix?.columns ?? [], available, getUiScale());
	const active = layout.showAll ? layout.full : pane === 'table' ? layout.standings : layout.matches;

	useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			onBack();
			return true;
		});
		return () => subscription.remove();
	}, [onBack]);

	return (
		<View style={styles.screen}>
			<View style={styles.top}>
				<Pressable
					onPress={onBack}
					style={styles.back}
					accessibilityRole="button"
					accessibilityLabel="Wróć do listy meczów"
				>
					<Ionicons name="arrow-back" size={scaleSize(22)} color={colors.accent} />
					<Text style={styles.backText}>Mecze</Text>
				</Pressable>
				<Text style={styles.title}>Grupa {groupNumber}</Text>
			</View>

			{empty ? (
				<Text style={styles.empty}>Wszystkie mecze w tej grupie zostały już rozegrane.</Text>
			) : (
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					nestedScrollEnabled
				>
					{layout.showAll ? null : (
						<View style={styles.switch}>
							<Pressable
								style={[styles.switchButton, pane === 'matches' && styles.switchButtonOn]}
								onPress={() => setPane('matches')}
								accessibilityRole="button"
								accessibilityState={{ selected: pane === 'matches' }}
							>
								<Text style={[styles.switchText, pane === 'matches' && styles.switchTextOn]}>
									Mecze
								</Text>
							</Pressable>
							<Pressable
								style={[styles.switchButton, pane === 'table' && styles.switchButtonOn]}
								onPress={() => setPane('table')}
								accessibilityRole="button"
								accessibilityState={{ selected: pane === 'table' }}
							>
								<Text style={[styles.switchText, pane === 'table' && styles.switchTextOn]}>
									Tabela
								</Text>
							</Pressable>
						</View>
					)}
					<View onLayout={(event) => setBoardWidth(event.nativeEvent.layout.width)}>
						<CompetitionTable
							columns={active.columns}
							rows={matrix?.rows ?? []}
							emptyText="Brak tabeli."
							showHorizontalScroll={active.needsScroll}
							onGameCellPress={onGamePress}
							lockingGameId={lockingGameId}
							playerLines={2}
							rowMinHeight={scaleSize(64)}
							contentInset={scaleSize(16)}
						/>
					</View>
					<View style={styles.referees}>
						<GroupRefereeLine games={games} />
					</View>
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	top: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 12,
		paddingHorizontal: 16,
	},
	back: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 4,
	},
	backText: {
		color: colors.accent,
		fontSize: 16,
		fontWeight: '700',
	},
	title: {
		color: colors.accent,
		fontSize: 20,
		fontWeight: '700',
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 12,
	},
	referees: {
		paddingHorizontal: 16,
	},
	switch: {
		flexDirection: 'row',
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		overflow: 'hidden',
		marginBottom: 12,
		marginHorizontal: 16,
	},
	switchButton: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		backgroundColor: colors.bgElevated,
	},
	switchButtonOn: {
		backgroundColor: colors.accent,
	},
	switchText: {
		color: colors.textSecondary,
		fontSize: 15,
		fontWeight: '700',
	},
	switchTextOn: {
		color: colors.onAccent,
	},
	empty: {
		fontSize: 15,
		color: colors.textMuted,
		textAlign: 'center',
		paddingVertical: 24,
		paddingHorizontal: 16,
	},
});
