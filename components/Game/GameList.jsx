import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import {
  markTournamentFinishedPrompted,
  promptTournamentFinishedLogout,
  useTournamentFinishedRealtime,
} from '../../hooks/useTournamentFinishedRealtime';
import { colors } from '../../theme/colors';
import { lockTournamentGame } from '../../helpers/lockTournamentGame';
import { fetchActiveGames } from '../../helpers/gameListApi';

const PLAYOFF_ROUND_ORDER = [
  'SIXTEEN',
  'EIGHT',
  'QUARTER',
  'SEMI',
  'THIRD',
  'FINAL',
];

const playoffRoundSortKey = (round) => {
  const idx = PLAYOFF_ROUND_ORDER.indexOf(round);
  return idx >= 0 ? idx : 999;
};

const GameList = ({ navigation }) => {
  const { auth, logout } = useAuth();
  const [games, setGames] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPlayoffSide, setSelectedPlayoffSide] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lockingGameId, setLockingGameId] = useState(null);
  const [loading, setLoading] = useState(() => auth?.tournamentId != null);

  useTournamentFinishedRealtime({
    tournamentId: auth?.tournamentId,
    enabled: !!auth?.accessToken && auth?.tournamentId != null,
    onFinished: (payload) => {
      if (!navigation.isFocused()) {
        markTournamentFinishedPrompted(auth?.tournamentId);
        return;
      }
      promptTournamentFinishedLogout(
        () => void logout(),
        auth?.tournamentId,
        payload?.message,
      );
    },
  });

  const fetchGames = useCallback(async () => {
    if (!auth?.accessToken || auth?.tournamentId == null) return;
    setLoading(true);
    try {
      const result = await fetchActiveGames(auth.tournamentId, auth.accessToken);
      if (result.status === 401) {
        return;
      }
      if (result.ok) {
        setGames(result.data);
      }
    } catch (e) {
      console.warn('fetchGames', e);
    } finally {
      setLoading(false);
    }
  }, [auth?.accessToken, auth?.tournamentId]);

  useFocusEffect(
    useCallback(() => {
      fetchGames();
      // Po powrocie z meczu otwórz z powrotem listę wybranej grupy.
      if (selectedGroup != null || selectedPlayoffSide != null) {
        setIsModalVisible(true);
      }
    }, [fetchGames, selectedGroup, selectedPlayoffSide]),
  );

  const groupGames = useMemo(
    () => games.filter((g) => g.type === 'group' || (g.groupNumber != null && g.groupNumber > 0)),
    [games],
  );

  const playoffGames = useMemo(
    () =>
      games
        .filter((g) => g.type === 'playoff')
        .slice()
        .sort(
          (a, b) =>
            playoffRoundSortKey(a.round) - playoffRoundSortKey(b.round) ||
            (a.id ?? 0) - (b.id ?? 0),
        ),
    [games],
  );

  const groups = useMemo(
    () =>
      [...new Set(groupGames.map((g) => g.groupNumber).filter((n) => n != null))].sort(
        (a, b) => a - b,
      ),
    [groupGames],
  );

  const mainPlayoffGames = useMemo(
    () => playoffGames.filter((g) => g.bracketSide !== 'consolation'),
    [playoffGames],
  );

  const consolationPlayoffGames = useMemo(
    () => playoffGames.filter((g) => g.bracketSide === 'consolation'),
    [playoffGames],
  );

  const hasSplitPlayoff = mainPlayoffGames.length > 0 && consolationPlayoffGames.length > 0;

  const gamesInGroup = useMemo(
    () =>
      selectedGroup != null
        ? groupGames.filter((g) => g.groupNumber === selectedGroup)
        : [],
    [groupGames, selectedGroup],
  );

  const gamesInPlayoffSide = useMemo(() => {
    if (selectedPlayoffSide === 'consolation') {
      return consolationPlayoffGames;
    }
    if (selectedPlayoffSide === 'main') {
      return mainPlayoffGames;
    }
    return [];
  }, [selectedPlayoffSide, consolationPlayoffGames, mainPlayoffGames]);

  const modalGames = selectedPlayoffSide != null ? gamesInPlayoffSide : gamesInGroup;
  const modalTitle =
    selectedPlayoffSide === 'consolation'
      ? 'Drabinka pocieszenia'
      : selectedPlayoffSide === 'main'
        ? 'Drabinka główna'
        : selectedGroup != null
          ? `Grupa ${selectedGroup}`
          : 'Wybierz mecz';

  const openGroupModal = (group) => {
    setSelectedPlayoffSide(null);
    setSelectedGroup(group);
    setIsModalVisible(true);
  };

  const openPlayoffModal = (side) => {
    setSelectedGroup(null);
    setSelectedPlayoffSide(side);
    setIsModalVisible(true);
  };

  const closeGroupModal = () => {
    setIsModalVisible(false);
    setSelectedGroup(null);
    setSelectedPlayoffSide(null);
  };

  const handleGamePress = async (game) => {
    if (!auth?.accessToken || lockingGameId != null) {
      return;
    }

    setLockingGameId(game.id);

    const lockResult = await lockTournamentGame({
      gameId: game.id,
      type: game.type || 'group',
      accessToken: auth.accessToken,
    });

    setLockingGameId(null);

    if (!lockResult.ok) {
      Alert.alert(
        'Mecz niedostępny',
        lockResult.message,
        [{ text: 'OK', onPress: () => fetchGames() }],
      );
      return;
    }

    // Zostaw selectedGroup — po powrocie z meczu modal grupy otworzy się ponownie.
    setIsModalVisible(false);

    navigation.navigate('GameScoring', {
      game: {
        id: game.id,
        type: game.type || 'group',
        tournamentId: game.tournamentId,
        groupNumber: game.groupNumber,
        round: game.round,
        roundLabel: game.roundLabel,
        player1: game.player1,
        player2: game.player2,
      },
    });
  };

  const hasGroupGames = groups.length > 0;
  const hasPlayoffGames = playoffGames.length > 0;

  const listRows = useMemo(() => {
    const rows = [];
    if (hasGroupGames) {
      rows.push({ type: 'section', id: 'section-groups', title: 'Faza grupowa' });
      groups.forEach((group) => {
        rows.push({ type: 'group', id: `group-${group}`, group });
      });
    }
    if (hasPlayoffGames) {
      if (hasSplitPlayoff) {
        rows.push({ type: 'section', id: 'section-playoff', title: 'Playoff' });
        rows.push({
          type: 'playoffSide',
          id: 'playoff-main',
          side: 'main',
          title: 'Drabinka główna',
        });
        rows.push({
          type: 'playoffSide',
          id: 'playoff-consolation',
          side: 'consolation',
          title: 'Drabinka pocieszenia',
        });
      } else {
        rows.push({ type: 'section', id: 'section-playoff', title: 'Playoff' });
        playoffGames.forEach((game) => {
          rows.push({ type: 'game', id: `playoff-${game.id}`, game });
        });
      }
    }
    return rows;
  }, [groups, hasGroupGames, hasPlayoffGames, hasSplitPlayoff, playoffGames]);

  const renderGameRow = (game, showRound = false) => (
    <Pressable
      style={styles.gameRow}
      onPress={() => handleGamePress(game)}
      disabled={lockingGameId != null}
    >
      <View style={styles.gameRowContent}>
        {showRound && game.roundLabel ? (
          <Text style={styles.roundLabel}>{game.roundLabel}</Text>
        ) : null}
        <Text style={styles.gameRowText}>
          {game.player1?.name ?? 'Gracz 1'} – {game.player2?.name ?? 'Gracz 2'}
        </Text>
      </View>
      {lockingGameId === game.id ? (
        <ActivityIndicator size="small" color={colors.accent} style={styles.gameRowSpinner} />
      ) : null}
    </Pressable>
  );

  if (auth?.tournamentId == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Lista meczów</Text>
        <Text style={styles.hint}>Wpisz kod turnieju, aby zobaczyć mecze.</Text>
      </View>
    );
  }

  const renderListRow = ({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
        </View>
      );
    }
    if (item.type === 'group') {
      return (
        <Pressable
          style={styles.groupButton}
          onPress={() => openGroupModal(item.group)}
        >
          <Text style={styles.groupButtonText}>Grupa {item.group}</Text>
        </Pressable>
      );
    }
    if (item.type === 'playoffSide') {
      return (
        <Pressable
          style={styles.groupButton}
          onPress={() => openPlayoffModal(item.side)}
        >
          <Text style={styles.groupButtonText}>{item.title}</Text>
        </Pressable>
      );
    }
    return renderGameRow(item.game, true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mecze turnieju</Text>
        <Pressable
          onPress={fetchGames}
          style={styles.refreshButton}
          disabled={loading}
          accessibilityLabel="Odśwież listę meczów"
        >
          <FontAwesome5 name="sync" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.listHost}>
        {!hasGroupGames && !hasPlayoffGames && !loading ? (
          <Text style={styles.hint}>Brak aktywnych meczów.</Text>
        ) : (
          <FlatList
            style={styles.scroll}
            data={listRows}
            keyExtractor={(item) => item.id}
            renderItem={renderListRow}
          />
        )}
        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : null}
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeGroupModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeGroupModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <FlatList
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              data={modalGames}
              keyExtractor={(game) => `${game.type}-${game.id}`}
              renderItem={({ item: game }) => renderGameRow(game, selectedPlayoffSide != null)}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>
                  {selectedPlayoffSide != null
                    ? 'Wszystkie mecze w tej drabince zostały już rozegrane.'
                    : 'Wszystkie mecze w tej grupie zostały już rozegrane.'}
                </Text>
              }
            />
            <Pressable style={styles.closeButton} onPress={closeGroupModal}>
              <Text style={styles.closeButtonText}>Zamknij</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  listHost: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 16,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupButton: {
    backgroundColor: colors.bgElevated,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  groupButtonText: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: 'bold',
  },
  gameRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    marginBottom: 8,
  },
  gameRowContent: {
    flex: 1,
  },
  gameRowSpinner: {
    marginLeft: 8,
  },
  roundLabel: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gameRowText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: 420,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalEmpty: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
  },
});

export default GameList;
