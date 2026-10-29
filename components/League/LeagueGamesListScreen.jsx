import React, { useCallback, useState } from 'react';
import {
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	fetchMyLeagueGames,
	openLeagueGameLobby,
} from '../../helpers/leagueGamesApi';
import { colors } from '../../theme/colors';
import ScreenLoading from '../Common/ScreenLoading';

function statusLabel(game) {
	if (game.status === 'finished') {
		return game.winnerId == null && game.player1Score != null
			? `Remis ${game.player1Score}:${game.player2Score}`
			: `Zakończony ${game.player1Score ?? 0}:${game.player2Score ?? 0}`;
	}
	if (game.status === 'in_progress') {
		return 'W trakcie';
	}
	if (game.status === 'lobby') {
		return game.opponentAccepted ? 'Lobby — zaakceptowane' : 'Lobby — czekamy na akceptację';
	}
	if (!game.inCurrentWindow) {
		return 'Poza oknem kolejki';
	}
	if (!game.opponentHasAccount) {
		return 'Przeciwnik bez konta — wynik wpisze admin';
	}
	return 'Zaplanowany';
}

export default function LeagueGamesListScreen({ navigation }) {
	const { auth } = useAuth();
	const [games, setGames] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [busyId, setBusyId] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken) {
			return;
		}
		try {
			const { ok, data } = await fetchMyLeagueGames(auth.accessToken);
			if (ok) {
				setGames(data?.games ?? []);
				setError('');
			} else {
				setError(data?.message || 'Nie udało się pobrać meczów.');
			}
		} catch {
			setError('Błąd połączenia.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			setLoading(true);
			load();
		}, [load]),
	);

	const openLobby = async (game) => {
		if (!auth?.accessToken || busyId) {
			return;
		}
		setBusyId(game.id);
		try {
			const { ok, data } = await openLeagueGameLobby(game.id, auth.accessToken);
			if (ok && data?.id) {
				navigation.navigate('LeagueGameLobby', { gameId: data.id, initialGame: data });
			} else {
				Alert.alert('Nie można rozpocząć', data?.message || 'Spróbuj ponownie.');
			}
		} catch {
			Alert.alert('Błąd', 'Błąd połączenia.');
		} finally {
			setBusyId(null);
		}
	};

	const openExisting = (game) => {
		if (game.status === 'in_progress' && game.canResumeScoring) {
			navigation.navigate('GameScoring', {
				game: {
					id: game.id,
					type: 'league',
					player1: game.player1,
					player2: game.player2,
					matchFormat: game.format,
				},
				askOpener: false,
			});
			return;
		}
		if (game.canEnterLobby) {
			navigation.navigate('LeagueGameLobby', { gameId: game.id, initialGame: game });
		}
	};

	if (!auth?.accessToken) {
		return (
			<View style={styles.container}>
				<Text style={styles.hint}>Zaloguj się, aby zobaczyć mecze ligowe.</Text>
			</View>
		);
	}

	if (loading) {
		return <ScreenLoading />;
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.accent]} />
			}
		>
			<Text style={styles.lead}>
				Twoje mecze w otwartych sezonach. Rozpocznij tylko w aktualnym oknie kolejki — gra na jednym telefonie.
			</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{games.length === 0 ? (
				<Text style={styles.hint}>Nie masz teraz meczów ligowych.</Text>
			) : (
				games.map((game) => {
					const opponent = Number(auth.playerId) === Number(game.player1?.id)
						? game.player2
						: game.player1;
					return (
						<View key={game.id} style={styles.card}>
							<Text style={styles.title}>{game.player1?.name} vs {game.player2?.name}</Text>
							<Text style={styles.sub}>{game.league?.name} · {game.division?.name ?? 'liga'}</Text>
							<Text style={styles.sub}>{game.formatLabel}</Text>
							{game.matchday ? (
								<Text style={styles.sub}>Kolejka {game.matchday.roundNumber} · {game.matchday.windowLabel}</Text>
							) : null}
							<Text style={styles.status}>{statusLabel(game)}</Text>
							{game.canOpenLobby ? (
								<Pressable
									style={[styles.button, busyId && styles.disabled]}
									onPress={() => openLobby(game)}
									disabled={!!busyId}
								>
									<Text style={styles.buttonText}>
										{busyId === game.id ? 'Otwieranie…' : `Rozpocznij vs ${opponent?.name ?? 'rywal'}`}
									</Text>
								</Pressable>
							) : null}
							{game.canEnterLobby || game.canResumeScoring ? (
								<Pressable style={styles.buttonOutlined} onPress={() => openExisting(game)}>
									<Text style={styles.buttonOutlinedText}>
										{game.canResumeScoring ? 'Wróć do meczu' : 'Otwórz lobby'}
									</Text>
								</Pressable>
							) : null}
							{!game.canOpenLobby && !game.canEnterLobby && !game.canResumeScoring ? (
								<Pressable
									style={styles.buttonOutlined}
									onPress={() =>
										navigation.navigate('GameDetail', { type: 'league', gameId: game.id })
									}
								>
									<Text style={styles.buttonOutlinedText}>Zobacz mecz</Text>
								</Pressable>
							) : null}
						</View>
					);
				})
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, paddingBottom: 40 },
	lead: { fontSize: 14, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
	hint: { fontSize: 14, color: colors.textDim, marginTop: 8 },
	error: { fontSize: 14, color: colors.danger, marginBottom: 12 },
	card: {
		padding: 16,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.border,
	},
	title: { fontSize: 16, color: colors.text, fontWeight: '600', marginBottom: 4 },
	sub: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
	status: { fontSize: 13, color: colors.accent, marginTop: 8, marginBottom: 10 },
	button: {
		backgroundColor: colors.accent,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 4,
	},
	buttonText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 14 },
	buttonOutlined: {
		borderWidth: 2,
		borderColor: colors.accent,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 8,
	},
	buttonOutlinedText: { color: colors.accent, fontWeight: 'bold', fontSize: 14 },
	disabled: { opacity: 0.6 },
});
