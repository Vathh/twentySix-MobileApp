import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';
import useAuth from '../../hooks/useAuth';
import { ACTIVE_GAMES_API_URL } from '../../helpers/apiConfig';

const MatchList = ({ navigation }) => {
  const { auth } = useAuth();
  const [matches, setMatches] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const fetchMatches = useCallback(async () => {
    if (!auth?.accessToken || auth?.tournamentId == null) return;
    try {
      const url = `${ACTIVE_GAMES_API_URL}?tournamentId=${auth.tournamentId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('fetchMatches', e);
    }
  }, [auth?.accessToken, auth?.tournamentId]);

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
      return () => {};
    }, [fetchMatches])
  );

  const groups = [...new Set(matches.map((m) => m.groupNumber).filter((n) => n != null))].sort((a, b) => a - b);

  const toggleModal = () => {
    setIsModalVisible((v) => !v);
  };

  const handleGroupPress = (group) => {
    setSelectedGroup(group);
    setSelectedMatch(null);
    toggleModal();
  };

  const matchesInGroup = selectedGroup != null
    ? matches.filter((m) => m.groupNumber === selectedGroup)
    : [];

  const handleMatchPress = (match) => {
    setSelectedMatch(match);
    toggleModal();
    navigation.navigate('Match', {
      match: {
        match: {
          id: match.id,
          type: match.type || 'group',
          tournamentId: match.tournamentId,
          groupNumber: match.groupNumber,
          player1: match.player1,
          player2: match.player2,
        },
      },
    });
  };

  if (auth?.tournamentId == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Lista meczów</Text>
        <Text style={styles.hint}>Wpisz kod turnieju, aby zobaczyć mecze.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mecze turnieju</Text>
        <Pressable onPress={fetchMatches} style={styles.refreshButton}>
          <FontAwesomeIcon icon={faSync} size={22} color="#F99417" />
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <Text style={styles.hint}>Brak aktywnych meczów.</Text>
      ) : (
        <ScrollView style={styles.scroll}>
          {groups.map((group) => (
            <Pressable
              key={group}
              style={styles.groupButton}
              onPress={() => handleGroupPress(group)}
            >
              <Text style={styles.groupButtonText}>Grupa {group}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={toggleModal}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {selectedGroup != null ? `Grupa ${selectedGroup}` : 'Wybierz mecz'}
            </Text>
            {matchesInGroup.map((match) => (
              <Pressable
                key={match.id}
                style={styles.matchRow}
                onPress={() => handleMatchPress(match)}
              >
                <Text style={styles.matchRowText}>
                  {match.player1?.name ?? 'Gracz 1'} – {match.player2?.name ?? 'Gracz 2'}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.closeButton} onPress={toggleModal}>
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
  },
  modalTitle: {
    fontSize: 20,
    color: '#F99417',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  matchRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4580',
  },
  matchRowText: {
    fontSize: 16,
    color: '#c5c5c5',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#F99417',
    fontWeight: 'bold',
  },
});

export default MatchList;

