import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { ACTIVE_GAMES_API_URL } from '../../helpers/apiConfig';
import { lockTournamentGame } from '../../helpers/lockTournamentGame';

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
  const { auth } = useAuth();
  const [games, setGames] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lockingGameId, setLockingGameId] = useState(null);

  const fetchGames = useCallback(async () => {
    if (!auth?.accessToken || auth?.tournamentId == null) return;
    try {
      const url = `${ACTIVE_GAMES_API_URL}?tournamentId=${auth.tournamentId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGames(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('fetchGames', e);
    }
  }, [auth?.accessToken, auth?.tournamentId]);

  useFocusEffect(
    useCallback(() => {
      fetchGames();
      // Po powrocie z meczu otwórz z powrotem listę wybranej grupy.
      if (selectedGroup != null) {
        setIsModalVisible(true);
      }
    }, [fetchGames, selectedGroup]),
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

  const gamesInGroup = useMemo(
    () =>
      selectedGroup != null
        ? groupGames.filter((g) => g.groupNumber === selectedGroup)
        : [],
    [groupGames, selectedGroup],
  );

  const openGroupModal = (group) => {
    setSelectedGroup(group);
    setIsModalVisible(true);
  };

  const closeGroupModal = () => {
    setIsModalVisible(false);
    setSelectedGroup(null);
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

  const renderGameRow = (game, showRound = false) => (
    <Pressable
      key={`${game.type}-${game.id}`}
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
        <ActivityIndicator size="small" color="#F99417" style={styles.gameRowSpinner} />
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

  const hasGroupGames = groups.length > 0;
  const hasPlayoffGames = playoffGames.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mecze turnieju</Text>
        <Pressable onPress={fetchGames} style={styles.refreshButton}>
          <FontAwesome5 name="sync" size={22} color="#F99417" />
        </Pressable>
      </View>

      {!hasGroupGames && !hasPlayoffGames ? (
        <Text style={styles.hint}>Brak aktywnych meczów.</Text>
      ) : (
        <ScrollView style={styles.scroll}>
          {hasGroupGames ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Faza grupowa</Text>
              {groups.map((group) => (
                <Pressable
                  key={group}
                  style={styles.groupButton}
                  onPress={() => openGroupModal(group)}
                >
                  <Text style={styles.groupButtonText}>Grupa {group}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {hasPlayoffGames ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Playoff</Text>
              {playoffGames.map((game) => renderGameRow(game, true))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeGroupModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeGroupModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {selectedGroup != null ? `Grupa ${selectedGroup}` : 'Wybierz mecz'}
            </Text>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {gamesInGroup.map((game) => renderGameRow(game, false))}
            </ScrollView>
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
    backgroundColor: '#363062',
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
    color: '#c5c5c5',
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  hint: {
    fontSize: 16,
    color: '#c5c5c5',
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
    color: '#F99417',
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupButton: {
    backgroundColor: '#4a4580',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  groupButtonText: {
    fontSize: 18,
    color: '#F99417',
    fontWeight: 'bold',
  },
  gameRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4580',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4a4580',
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
    color: '#F99417',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gameRowText: {
    fontSize: 16,
    color: '#c5c5c5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#363062',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    color: '#F99417',
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
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#F99417',
    fontWeight: 'bold',
  },
});

export default GameList;
