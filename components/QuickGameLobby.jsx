import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faCheck, faTimes, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import useAuth from '../hooks/useAuth';
import {
  QUICK_GAME_LOBBY_CREATE_API_URL,
  getQuickGameLobbyUrl,
  getQuickGameLobbyLeaveUrl,
  getQuickGameLobbyReadyUrl,
  getQuickGameLobbyStartUrl,
  getQuickGameLobbyInviteUrl,
  getQuickGameLobbyAddGuestUrl,
  FRIENDS_API_URL,
} from '../helpers/apiConfig';

const INVITATION_STATUS = {
  sent: { key: 'sent', label: 'Wysłane', icon: faPaperPlane, color: '#F99417' },
  accepted: { key: 'accepted', label: 'Zaakceptowane', icon: faCheck, color: '#4ade80' },
  rejected: { key: 'rejected', label: 'Odrzucone', icon: faTimes, color: '#f87171' },
};

const QuickGameLobby = ({ navigation }) => {
  const { auth } = useAuth();
  const [lobby, setLobby] = useState(null);
  const [legsCount, setLegsCount] = useState(3);
  const [invitations, setInvitations] = useState([]); // [{ id, name, status: 'sent'|'accepted'|'rejected' }]
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [myReady, setMyReady] = useState(false); // po kliknięciu Gotowy – nie pozwalaj klikać ponownie
  const [guestName, setGuestName] = useState('');
  const [guestAdding, setGuestAdding] = useState(false);

  const fetchLobbyById = useCallback(async (lobbyId) => {
    if (!lobbyId || !auth?.accessToken) return;
    try {
      const res = await fetch(getQuickGameLobbyUrl(lobbyId), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLobby((prev) => ({ ...data, legsCount: data.legsCount ?? prev?.legsCount ?? 3 }));
        if (data.legsCount != null) setLegsCount(data.legsCount);
        if (data.invitations && Array.isArray(data.invitations) && data.invitations.length > 0) {
          setInvitations((prev) => {
            const byId = new Map(prev.map((i) => [i.id, i]));
            data.invitations.forEach((inv) => {
              const id = inv.playerId ?? inv.id ?? inv.receiver?.id;
              const name = inv.name ?? inv.receiver?.name ?? inv.playerName ?? 'Gracz';
              const status = (inv.status ?? 'sent').toLowerCase();
              byId.set(id, { id, name, status: status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'sent' });
            });
            return Array.from(byId.values());
          });
        }
      }
    } catch (e) {
      console.warn('fetchLobbyById', e);
    }
  }, [auth?.accessToken]);

  useFocusEffect(
    useCallback(() => {
      if (lobby?.id) {
        fetchLobbyById(lobby.id);
      }
      return () => {};
    }, [lobby?.id, fetchLobbyById])
  );

  useEffect(() => {
    if (!lobby?.id) return;
    const t = setInterval(() => fetchLobbyById(lobby.id), 4000);
    return () => clearInterval(t);
  }, [lobby?.id, fetchLobbyById]);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(QUICK_GAME_LOBBY_CREATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        setLobby({ ...data, legsCount: data.legsCount ?? 3 });
        setLegsCount(data.legsCount ?? 3);
        setInvitations([]);
      } else {
        setError(data?.message || 'Nie udało się utworzyć lobby');
      }
    } catch (e) {
      setError('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = useCallback(async () => {
    if (!auth?.accessToken) return;
    setFriendsLoading(true);
    try {
      const res = await fetch(FRIENDS_API_URL, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : (data?.friends ?? data?.data ?? []));
      } else {
        setFriends([]);
      }
    } catch (e) {
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [auth?.accessToken]);

  const openInviteModal = () => {
    setInviteModalVisible(true);
    fetchFriends();
  };

  const handleInviteFriend = async (friend) => {
    if (!lobby?.id || !auth?.accessToken) return;
    const playerId = friend.playerId ?? friend.id ?? friend.player_id;
    const name = friend.name ?? friend.playerName ?? 'Znajomy';
    try {
      const res = await fetch(getQuickGameLobbyInviteUrl(lobby.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ playerId: playerId ?? friend.userId ?? friend.user_id }),
      });
      if (res.ok) {
        setInvitations((prev) => [...prev, { id: friend.id ?? playerId, name, status: 'sent' }]);
        setInviteModalVisible(false);
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Błąd', data?.message || 'Nie udało się wysłać zaproszenia');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia');
    }
  };

  const handleAddGuest = async () => {
    const name = guestName.trim();
    if (!name || !lobby?.id || !auth?.accessToken || guestAdding) return;
    setGuestAdding(true);
    setError('');
    try {
      const res = await fetch(getQuickGameLobbyAddGuestUrl(lobby.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ tempPlayerName: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        setLobby((prev) => ({ ...data, legsCount: data.legsCount ?? prev?.legsCount ?? 3 }));
        setGuestName('');
        fetchLobbyById(lobby.id);
      } else {
        Alert.alert('Błąd', data?.message || 'Nie udało się dodać gościa');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia');
    } finally {
      setGuestAdding(false);
    }
  };

  const handleLeave = async () => {
    if (!lobby?.id || !auth?.accessToken) return;
    try {
      await fetch(getQuickGameLobbyLeaveUrl(lobby.id), {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      setLobby(null);
    } catch (e) {
      console.warn('leave', e);
    }
  };

  const handleReady = async () => {
    if (!lobby?.id || !auth?.accessToken || myReady) return;
    try {
      await fetch(getQuickGameLobbyReadyUrl(lobby.id), {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      setMyReady(true);
      fetchLobbyById(lobby.id);
    } catch (e) {
      console.warn('ready', e);
    }
  };

  const handleStart = async () => {
    if (!lobby?.id || !auth?.accessToken) return;
    try {
      const res = await fetch(getQuickGameLobbyStartUrl(lobby.id), {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (res.ok && data?.players) {
        navigation.navigate('Match', {
          quickGame: { players: data.players, lobbyId: lobby.id },
        });
      } else {
        Alert.alert('Błąd', data?.message || 'Nie można rozpocząć meczu');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia');
    }
  };

  const backToChoice = () => {
    setLobby(null);
    setInvitations([]);
    setMyReady(false);
    setError('');
  };

  if (lobby?.id) {
    const players = lobby.players || [];
    const isHost = lobby.youAreHost === true;
    // Gotowość tylko zarejestrowanych; host jest zawsze uznawany za gotowego, goście nie liczą się
    const allRegisteredReady =
      players.length >= 2 &&
      players.every((p) => !p.isRegistered || p.isHost || p.ready);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.formContent}>
        <Text style={styles.title}>Lobby: {lobby.code || lobby.id}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.label}>Ilość legów</Text>
          <TextInput
            style={styles.input}
            value={String(legsCount)}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/\D/g, ''), 10);
              if (!isNaN(n)) setLegsCount(Math.min(15, Math.max(1, n)));
              else if (t === '') setLegsCount(1);
            }}
            keyboardType="number-pad"
            placeholder="3"
            maxLength={2}
            placeholderTextColor="#a0a0a0"
          />
          <Text style={styles.hintSmall}>Mecz rozgrywany do wygranej liczby legów (1–15). Domyślnie 3.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Zaproszenia</Text>
          {isHost && (
            <Pressable style={styles.inviteButton} onPress={openInviteModal}>
              <FontAwesomeIcon icon={faUserPlus} size={18} color="#363062" style={{ marginRight: 8 }} />
              <Text style={styles.inviteButtonText}>Zaproś znajomego</Text>
            </Pressable>
          )}
          {invitations.length === 0 ? (
            <Text style={styles.hintSmall}>Brak zaproszeń. Kliknij „Zaproś znajomego”, aby dodać.</Text>
          ) : (
            invitations.map((inv) => {
              const statusInfo = INVITATION_STATUS[inv.status] ?? INVITATION_STATUS.sent;
              return (
                <View key={inv.id} style={styles.invitationRow}>
                  <Text style={styles.invitationName}>{inv.name}</Text>
                  <View style={styles.invitationStatus}>
                    <FontAwesomeIcon icon={statusInfo.icon} size={18} color={statusInfo.color} style={styles.invitationStatusIcon} />
                    <Text style={[styles.invitationStatusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Gracze tymczasowi / goście</Text>
          <Text style={styles.hintSmall}>
            Dla graczy niezarejestrowanych – wpisz nazwę i dodaj jako lokalnego gracza do meczu.
          </Text>
          {isHost && (
            <>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Nazwa gracza"
                placeholderTextColor="#a0a0a0"
                maxLength={50}
                editable={!guestAdding}
              />
              <Pressable
                style={[styles.inviteButton, { marginTop: 8 }, (!guestName.trim() || guestAdding) && styles.buttonDisabled]}
                onPress={handleAddGuest}
                disabled={!guestName.trim() || guestAdding}
              >
                <FontAwesomeIcon icon={faUserPlus} size={18} color="#363062" style={{ marginRight: 8 }} />
                <Text style={styles.inviteButtonText}>{guestAdding ? 'Dodawanie…' : 'Dodaj gościa'}</Text>
              </Pressable>
            </>
          )}
          {!isHost && (
            <Text style={styles.hintSmall}>Tylko host może dodawać gości do lobby.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Gracze w lobby ({players.length}/6)</Text>
          {players.map((p) => (
            <Text key={p.id || p.playerId} style={styles.playerRow}>
              {p.name || p.tempName || 'Gracz'} {p.ready ? '✓ Gotowy' : ''}
            </Text>
          ))}
        </View>
        {auth?.accessToken && (
          <>
            {!isHost && (
              <Pressable
                style={[styles.button, myReady && styles.buttonDisabled]}
                onPress={handleReady}
                disabled={myReady}
              >
                <Text style={[styles.buttonText, myReady && styles.buttonTextDisabled]}>
                  {myReady ? 'Gotowy ✓' : 'Gotowy'}
                </Text>
              </Pressable>
            )}
            {isHost && (
              <Pressable
                style={[styles.button, !allRegisteredReady && styles.buttonDisabled]}
                onPress={handleStart}
                disabled={!allRegisteredReady}
              >
                <Text style={styles.buttonText}>Rozpocznij mecz</Text>
              </Pressable>
            )}
            <Pressable style={styles.buttonOutlined} onPress={handleLeave}>
              <Text style={styles.buttonOutlinedText}>Opuść lobby</Text>
            </Pressable>
          </>
        )}
        <Pressable style={styles.buttonOutlined} onPress={backToChoice}>
          <Text style={styles.buttonOutlinedText}>Wróć</Text>
        </Pressable>

        <Modal
          visible={inviteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setInviteModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Zaproś znajomego</Text>
              {friendsLoading ? (
                <Text style={styles.hintSmall}>Ładowanie listy znajomych…</Text>
              ) : friends.length === 0 ? (
                <Text style={styles.hintSmall}>Brak znajomych lub błąd ładowania.</Text>
              ) : (
                <ScrollView style={styles.friendsList}>
                  {friends.map((f) => {
                    const name = f.name ?? f.playerName ?? f.player?.name ?? 'Znajomy';
                    const alreadyInvited = invitations.some((i) => i.id === (f.playerId ?? f.id) || i.name === name);
                    return (
                      <Pressable
                        key={f.id ?? f.playerId}
                        style={[styles.friendRow, alreadyInvited && styles.friendRowDisabled]}
                        onPress={() => !alreadyInvited && handleInviteFriend(f)}
                        disabled={alreadyInvited}
                      >
                        <Text style={styles.friendRowText}>{name}</Text>
                        {alreadyInvited && <Text style={styles.hintSmall}>(zaproszony)</Text>}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <Pressable style={styles.buttonSecondary} onPress={() => setInviteModalVisible(false)}>
                <Text style={styles.buttonTextSecondary}>Zamknij</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    );
  }

  // Ekran początkowy: jeden przycisk „Utwórz lobby” – od razu tworzy lobby i wchodzi w widok lobby
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Szybki mecz – Lobby</Text>
      <Text style={styles.hint}>
        Utwórz lobby i zaproś znajomych do gry. Ustawienia i zaproszenia zarządzasz w lobby.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={styles.button}
        onPress={handleCreate}
        disabled={!auth?.accessToken || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Tworzenie lobby…' : 'Utwórz lobby'}</Text>
      </Pressable>
      {!auth?.accessToken && (
        <Text style={styles.hint}>
          Zaloguj się, aby móc tworzyć lobby i zapraszać znajomych.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#363062',
  },
  formContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    color: '#c5c5c5',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 14,
    color: '#c5c5c5',
    marginBottom: 16,
  },
  hintSmall: {
    fontSize: 13,
    color: '#a0a0a0',
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#F99417',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  playerRow: {
    fontSize: 16,
    color: '#c5c5c5',
    marginVertical: 4,
  },
  input: {
    marginBottom: 4,
    padding: 12,
    backgroundColor: '#f5f5f5cc',
    borderRadius: 8,
    fontSize: 16,
    color: '#363062',
  },
  invitationsBox: {
    marginBottom: 8,
    paddingVertical: 8,
  },
  invitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#4a4580',
    borderRadius: 8,
    marginBottom: 8,
  },
  invitationName: {
    fontSize: 16,
    color: '#c5c5c5',
    fontWeight: '500',
  },
  invitationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationStatusIcon: {
    marginRight: 6,
  },
  invitationStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F99417',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  inviteButtonText: {
    fontSize: 16,
    color: '#363062',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#F99417',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#363062',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextDisabled: {
    color: '#6b6b6b',
  },
  buttonOutlined: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F99417',
    backgroundColor: 'transparent',
  },
  buttonOutlinedText: {
    color: '#F99417',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: '#c5c5c5',
    fontSize: 16,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    color: '#F99417',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  friendsList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  friendRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#4a4580',
    borderRadius: 8,
    marginBottom: 8,
  },
  friendRowDisabled: {
    opacity: 0.6,
  },
  friendRowText: {
    fontSize: 16,
    color: '#c5c5c5',
    fontWeight: '500',
  },
});

export default QuickGameLobby;
