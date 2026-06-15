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
import { faPaperPlane, faCheck, faTimes, faUserPlus, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import DraggableFlatList from 'react-native-draggable-flatlist';
import useAuth from '../../hooks/useAuth';
import { useQuickGameLobbyRealtime } from '../../hooks/useQuickGameLobbyRealtime';
import {
  QUICK_GAME_LOBBY_CREATE_API_URL,
  getQuickGameLobbyUrl,
  getQuickGameLobbyLeaveUrl,
  getQuickGameLobbyReadyUrl,
  getQuickGameLobbyStartUrl,
  getQuickGameLobbyInviteUrl,
  getQuickGameLobbyAddGuestUrl,
  FRIENDS_API_URL,
} from '../../helpers/apiConfig';
import { addCachedTempName, getCachedTempNames } from '../../helpers/tempPlayerCache';

const DEFAULT_LEGS_TO_WIN = 2;
const MAX_LOBBY_PLAYERS = 8;

const SCORING_MODES = { ONE_DEVICE: 'one_device', EACH_OWN: 'each_own' };

const INVITATION_STATUS = {
  sent: { key: 'sent', label: 'Wysłane', icon: faPaperPlane, color: '#F99417' },
  accepted: { key: 'accepted', label: 'Zaakceptowane', icon: faCheck, color: '#4ade80' },
  rejected: { key: 'rejected', label: 'Odrzucone', icon: faTimes, color: '#f87171' },
};

const QuickGameLobby = ({ navigation, route }) => {
  const { auth } = useAuth();
  const GAME_TYPES = { X01: '501', CRICKET: 'cricket' };
  const [lobby, setLobby] = useState(null);
  const [legsCount, setLegsCount] = useState(DEFAULT_LEGS_TO_WIN);
  const [gameType, setGameType] = useState(GAME_TYPES.X01);
  const [scoringMode, setScoringMode] = useState(SCORING_MODES.EACH_OWN);
  const [invitations, setInvitations] = useState([]); // [{ id, name, status: 'sent'|'accepted'|'rejected' }]
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [cachedGuestNames, setCachedGuestNames] = useState([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [myReady, setMyReady] = useState(false); // po kliknięciu Gotowy – nie pozwalaj klikać ponownie
  const [orderedPlayers, setOrderedPlayers] = useState([]);

  const resolveMyPlayerIndex = useCallback((players, fromApi) => {
    if (fromApi !== undefined && fromApi !== null) return fromApi;
    if (auth?.playerId == null) return null;
    const idx = players.findIndex(
      (p) => p.playerId != null && Number(p.playerId) === Number(auth.playerId),
    );
    return idx >= 0 ? idx : null;
  }, [auth?.playerId]);

  const applyLobbyData = useCallback((data, fallbackLobbyId = null) => {
    if (!data) return;
    if (data.status === 'started' && data.players?.length >= 2) {
      const players = (data.players || []).map((p) => ({
        id: p.id,
        name: p.name ?? p.tempName ?? 'Gracz',
        playerId: p.playerId ?? p.player_id,
      }));
      const legsToWin = data.legsCount ?? data.legs_count ?? DEFAULT_LEGS_TO_WIN;
      const gameTypeToUse = data.gameType ?? data.game_type ?? GAME_TYPES.X01;
      const scoringModeToUse = data.scoringMode ?? SCORING_MODES.EACH_OWN;
      const isHost = data.youAreHost ?? lobby?.youAreHost ?? false;
      const myPlayerIndex = resolveMyPlayerIndex(players, data.myPlayerIndex);
      setLobby(null);
      navigation.navigate('GameScoring', {
        quickGame: {
          players,
          lobbyId: data.id ?? fallbackLobbyId ?? lobby?.id ?? null,
          legsCount: legsToWin,
          gameType: gameTypeToUse,
          scoringMode: scoringModeToUse,
          isHost,
          myPlayerIndex,
        },
      });
      return;
    }

    setLobby((prev) => ({
      ...(prev ?? {}),
      ...data,
      // Pole user-specific może nie przyjść w evencie lobby; zachowaj poprzednią wartość.
      youAreHost: data.youAreHost ?? prev?.youAreHost ?? false,
      legsCount: data.legsCount ?? prev?.legsCount ?? DEFAULT_LEGS_TO_WIN,
      gameType: data.gameType ?? data.game_type ?? prev?.gameType ?? GAME_TYPES.X01,
      scoringMode: data.scoringMode ?? prev?.scoringMode ?? SCORING_MODES.EACH_OWN,
    }));
    if (data.legsCount != null) setLegsCount(data.legsCount);
    if (data.scoringMode != null) setScoringMode(data.scoringMode);
    if (data.gameType != null || data.game_type != null) {
      setGameType(data.gameType ?? data.game_type ?? GAME_TYPES.X01);
    }
    // Bez tablicy players nie ruszaj orderedPlayers (unikaj [] z „pustego” payloadu).
    if (Array.isArray(data.players)) {
      const incoming = data.players.map((p) => ({ ...p, name: p.name ?? p.tempName ?? 'Gracz' }));
      setOrderedPlayers((prev) => {
        const key = (p) => p.id ?? p.playerId ?? p.player_id ?? p.tempName ?? '';
        const incIds = new Set(incoming.map(key));
        const prevIds = new Set(prev.map(key));
        if (prev.length === 0 || incIds.size !== prevIds.size || [...incIds].some((id) => !prevIds.has(id))) {
          return incoming;
        }
        return prev.map((p) => incoming.find((i) => key(i) === key(p)) || p).filter(Boolean);
      });
    }
  }, [GAME_TYPES.X01, SCORING_MODES.EACH_OWN, lobby?.id, lobby?.youAreHost, navigation, resolveMyPlayerIndex]);

  const fetchLobbyById = useCallback(async (lobbyId) => {
    if (!lobbyId || !auth?.accessToken) return;
    try {
      const res = await fetch(getQuickGameLobbyUrl(lobbyId), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        applyLobbyData(data, lobbyId);
      }
    } catch (e) {
      console.warn('fetchLobbyById', e);
    }
  }, [auth?.accessToken, applyLobbyData]);

  useFocusEffect(
    useCallback(() => {
      const initial = route?.params?.initialLobby;
      if (initial?.id) {
        setLobby(initial);
        setLegsCount(initial.legsCount ?? initial.legs_count ?? DEFAULT_LEGS_TO_WIN);
        setGameType(initial.gameType ?? initial.game_type ?? GAME_TYPES.X01);
        setScoringMode(initial.scoringMode ?? SCORING_MODES.EACH_OWN);
        const pl = (initial.players || []).map((p) => ({ ...p, name: p.name ?? p.tempName ?? 'Gracz' }));
        setOrderedPlayers(pl);
        navigation.setParams({ initialLobby: undefined });
      } else if (lobby?.id) {
        fetchLobbyById(lobby.id);
      }
      return () => {};
    }, [lobby?.id, fetchLobbyById, route?.params?.initialLobby, navigation])
  );

  useQuickGameLobbyRealtime({
    lobbyId: lobby?.id ?? null,
    accessToken: auth?.accessToken ?? null,
    enabled: !!lobby?.id && !!auth?.accessToken,
    onLobbyUpdated: applyLobbyData,
  });

  useEffect(() => {
    if (!lobby?.id || !auth?.accessToken) return undefined;
    const t = setInterval(() => fetchLobbyById(lobby.id), 45000);
    return () => clearInterval(t);
  }, [lobby?.id, auth?.accessToken, fetchLobbyById]);

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
        setLobby({ ...data, legsCount: data.legsCount ?? DEFAULT_LEGS_TO_WIN, gameType: data.gameType ?? data.game_type ?? GAME_TYPES.X01 });
        setLegsCount(data.legsCount ?? DEFAULT_LEGS_TO_WIN);
        setGameType(data.gameType ?? data.game_type ?? GAME_TYPES.X01);
        setInvitations([]);
        fetchLobbyById(data.id);
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

  const openGuestModal = async () => {
    setGuestName('');
    setGuestModalVisible(true);
    const names = await getCachedTempNames();
    setCachedGuestNames(names);
  };

  const handleAddGuest = async () => {
    const name = guestName.trim();
    if (!lobby?.id || !auth?.accessToken || !name) {
      Alert.alert('Błąd', 'Podaj imię gracza tymczasowego');
      return;
    }
    setAddingGuest(true);
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
      if (res.ok) {
        await addCachedTempName(name);
        applyLobbyData(data, lobby.id);
        setGuestModalVisible(false);
        if (scoringMode === SCORING_MODES.EACH_OWN) {
          setScoringMode(SCORING_MODES.ONE_DEVICE);
          handleUpdateSettings({ scoringMode: SCORING_MODES.ONE_DEVICE });
        }
      } else {
        Alert.alert('Błąd', data?.message || 'Nie udało się dodać gracza');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia');
    } finally {
      setAddingGuest(false);
    }
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

  const handleUpdateSettings = async (updates) => {
    if (!lobby?.id || !auth?.accessToken || !lobby.youAreHost) return;
    try {
      const res = await fetch(getQuickGameLobbyUrl(lobby.id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setLobby((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.warn('handleUpdateSettings', e);
    }
  };

  const handleStart = async () => {
    if (!lobby?.id || !auth?.accessToken) return;
    try {
      const res = await fetch(getQuickGameLobbyStartUrl(lobby.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          legsCount: legsCount ?? lobby?.legsCount ?? DEFAULT_LEGS_TO_WIN,
          gameType: gameType ?? lobby?.gameType ?? GAME_TYPES.X01,
          scoringMode: scoringMode ?? lobby?.scoringMode ?? SCORING_MODES.EACH_OWN,
          playerOrder: (orderedPlayers.length ? orderedPlayers : (lobby?.players || []))
            .map((p) => p.id)
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.players) {
        const legsToWin = data.legsCount ?? legsCount ?? lobby?.legsCount ?? DEFAULT_LEGS_TO_WIN;
        const gameTypeToUse = data.gameType ?? gameType ?? lobby?.gameType ?? GAME_TYPES.X01;
        const toPass = (orderedPlayers.length ? orderedPlayers : data.players).map((p) => ({
          id: p.id,
          name: p.name ?? p.tempName ?? 'Gracz',
          playerId: p.playerId ?? p.player_id,
        }));
        const scoringModeToUse = data.scoringMode ?? scoringMode ?? lobby?.scoringMode ?? SCORING_MODES.EACH_OWN;
        const isHost = data.isHost ?? lobby?.youAreHost ?? false;
        const myPlayerIndex = resolveMyPlayerIndex(toPass, data.myPlayerIndex);
        setLobby(null);
        navigation.navigate('GameScoring', {
          quickGame: {
            players: toPass,
            lobbyId: lobby.id,
            legsCount: legsToWin,
            gameType: gameTypeToUse,
            scoringMode: scoringModeToUse,
            isHost,
            myPlayerIndex,
          },
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
    // Gdy serwer (WS/HTTP) ma więcej graczy niż lokalna kolejność — pokaż stan z serwera (inaczej host nie widzi dołączających).
    const listData =
      players.length > orderedPlayers.length
        ? players
        : orderedPlayers.length
          ? orderedPlayers
          : players;
    const isHost = lobby.youAreHost === true;
    const hasTempGuests = players.some((p) => p.isRegistered === false && !p.isHost);
    // Gotowość tylko zarejestrowanych; host jest zawsze uznawany za gotowego, goście nie liczą się
    const allRegisteredReady =
      players.length >= 2 &&
      players.every((p) => !p.isRegistered || p.isHost || p.ready);

    const listHeader = (
      <>
        <Text style={styles.title}>Lobby quick game</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.label}>Typ gry</Text>
          <Text style={styles.hintSmall}>Wybierz tryb rozgrywki meczu (tylko host może zmieniać)</Text>
          <View style={styles.gameTypeRow}>
            <Pressable
              style={[styles.gameTypeBtn, gameType === GAME_TYPES.X01 && styles.gameTypeBtnActive]}
              onPress={() => {
                if (isHost) {
                  setGameType(GAME_TYPES.X01);
                  handleUpdateSettings({ gameType: GAME_TYPES.X01 });
                }
              }}
              disabled={!isHost}
            >
              <Text style={[styles.gameTypeBtnText, gameType === GAME_TYPES.X01 && styles.gameTypeBtnTextActive]}>501</Text>
            </Pressable>
            <Pressable
              style={[styles.gameTypeBtn, gameType === GAME_TYPES.CRICKET && styles.gameTypeBtnActive]}
              onPress={() => {
                if (isHost) {
                  setGameType(GAME_TYPES.CRICKET);
                  handleUpdateSettings({ gameType: GAME_TYPES.CRICKET });
                }
              }}
              disabled={!isHost}
            >
              <Text style={[styles.gameTypeBtnText, gameType === GAME_TYPES.CRICKET && styles.gameTypeBtnTextActive]}>Cricket</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Format meczu</Text>
          <Text style={styles.bo3Value}>BO3 — pierwszy do {DEFAULT_LEGS_TO_WIN} legów</Text>
          <Text style={styles.hintSmall}>W MVP format jest stały (501 double out, BO3).</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Liczenie</Text>
          <Text style={styles.hintSmall}>
            Kto wpisuje punkty: na jednym urządzeniu tylko host; każdy na swoim – tylko aktualnie rzucający (tylko host może zmieniać).
            {hasTempGuests ? ' Gracze tymczasowi wymagają trybu „na 1 urządzeniu”.' : ''}
          </Text>
          <View style={styles.gameTypeRow}>
            <Pressable
              style={[styles.gameTypeBtn, scoringMode === SCORING_MODES.ONE_DEVICE && styles.gameTypeBtnActive]}
              onPress={() => {
                if (isHost) {
                  setScoringMode(SCORING_MODES.ONE_DEVICE);
                  handleUpdateSettings({ scoringMode: SCORING_MODES.ONE_DEVICE });
                }
              }}
              disabled={!isHost}
            >
              <Text style={[styles.gameTypeBtnText, scoringMode === SCORING_MODES.ONE_DEVICE && styles.gameTypeBtnTextActive]}>Na 1 urządzeniu</Text>
            </Pressable>
            <Pressable
              style={[
                styles.gameTypeBtn,
                scoringMode === SCORING_MODES.EACH_OWN && styles.gameTypeBtnActive,
                hasTempGuests && styles.gameTypeBtnDisabled,
              ]}
              onPress={() => {
                if (isHost && !hasTempGuests) {
                  setScoringMode(SCORING_MODES.EACH_OWN);
                  handleUpdateSettings({ scoringMode: SCORING_MODES.EACH_OWN });
                }
              }}
              disabled={!isHost || hasTempGuests}
            >
              <Text style={[styles.gameTypeBtnText, scoringMode === SCORING_MODES.EACH_OWN && styles.gameTypeBtnTextActive]}>Każdy na swoim</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Gracze</Text>
          {isHost && players.length < MAX_LOBBY_PLAYERS && (
            <>
              <Pressable style={styles.inviteButton} onPress={openInviteModal}>
                <FontAwesomeIcon icon={faUserPlus} size={18} color="#363062" style={{ marginRight: 8 }} />
                <Text style={styles.inviteButtonText}>Zaproś znajomego</Text>
              </Pressable>
              <Pressable style={styles.inviteButtonSecondary} onPress={openGuestModal}>
                <FontAwesomeIcon icon={faUserPlus} size={18} color="#F99417" style={{ marginRight: 8 }} />
                <Text style={styles.inviteButtonTextSecondary}>Dodaj gracza tymczasowego</Text>
              </Pressable>
            </>
          )}
          {isHost && players.length >= MAX_LOBBY_PLAYERS && (
            <Text style={styles.hintSmall}>Osiągnięto limit {MAX_LOBBY_PLAYERS} graczy w lobby.</Text>
          )}
          {invitations.length > 0 && (
            <>
              <Text style={styles.subLabel}>Zaproszenia</Text>
              {invitations.map((inv) => {
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
              })}
            </>
          )}
          {isHost && invitations.length === 0 && players.length < 2 && (
            <Text style={styles.hintSmall}>Zaproś znajomych lub dodaj gracza tymczasowego (bez konta).</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {isHost ? 'Gracze w lobby (kolejność rzucania od góry)' : 'Gracze w lobby'}
          </Text>
          {listData.length === 0 ? (
            <View style={styles.emptyPlayersBox}>
              <Text style={styles.emptyPlayersText}>Jeszcze brak graczy w lobby.</Text>
              <Text style={styles.hintSmall}>Zaproś znajomych lub dodaj gracza tymczasowego.</Text>
            </View>
          ) : (
            <>
              {isHost ? (
                <>
                  <Text style={styles.hintSmall}>
                    Przytrzymaj uchwyt po prawej i przeciągnij, aby zmienić kolejność.
                  </Text>
                  <View style={styles.dragListContainer}>
                    <DraggableFlatList
                      data={listData}
                      keyExtractor={(item, index) => String(item.id ?? item.playerId ?? item.player_id ?? item.tempName ?? index)}
                      scrollEnabled={false}
                      activationDistance={8}
                      onDragEnd={({ data }) => setOrderedPlayers(data)}
                      renderItem={({ item, drag, isActive }) => (
                        <View style={[styles.playerTile, isActive && styles.playerTileActive]}>
                          <Text style={styles.playerTileName} numberOfLines={1}>
                            {item.name || item.tempName || 'Gracz'}
                            {item.isRegistered === false && !item.isHost ? ' (tymczasowy)' : ''}
                            {item.ready ? ' ✓ Gotowy' : ''}
                          </Text>
                          <Pressable style={styles.dragHandle} onLongPress={drag} delayLongPress={150}>
                            <FontAwesomeIcon icon={faGripVertical} size={18} color="#F99417" />
                          </Pressable>
                        </View>
                      )}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.playersList}>
                  {players.map((item, index) => (
                    <View key={String(item.id ?? item.playerId ?? item.player_id ?? item.tempName ?? index)} style={styles.playerTile}>
                      <Text style={styles.playerTileName} numberOfLines={1}>
                        {item.name || item.tempName || 'Gracz'}
                        {item.isRegistered === false && !item.isHost ? ' (tymczasowy)' : ''}
                        {item.ready ? ' ✓ Gotowy' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {isHost && (
                <Pressable
                  style={styles.reorderButtonSecondary}
                  onPress={() => {
                    const arr = [...listData];
                    for (let i = arr.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                    setOrderedPlayers(arr);
                  }}
                >
                  <Text style={styles.reorderButtonTextSecondary}>Kolejność losowa</Text>
                </Pressable>
              )}
            </>
          )}
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
      </>
    );

    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator>
          {listHeader}
        </ScrollView>
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
        <Modal
          visible={guestModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGuestModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setGuestModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Gracz tymczasowy</Text>
              <Text style={styles.hintSmall}>
                Osoba bez konta — host wpisuje jej rzuty (tryb na 1 urządzeniu).
              </Text>
              <TextInput
                style={styles.guestInput}
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Imię zawodnika"
                placeholderTextColor="#999"
                maxLength={50}
                autoCapitalize="words"
              />
              {cachedGuestNames.length > 0 && (
                <View style={styles.cachedNamesWrap}>
                  <Text style={styles.hintSmall}>Ostatnio używane:</Text>
                  <View style={styles.cachedNamesRow}>
                    {cachedGuestNames.slice(0, 6).map((n) => (
                      <Pressable key={n} style={styles.cachedNameChip} onPress={() => setGuestName(n)}>
                        <Text style={styles.cachedNameChipText}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <Pressable
                style={[styles.button, addingGuest && styles.buttonDisabled]}
                onPress={handleAddGuest}
                disabled={addingGuest}
              >
                <Text style={styles.buttonText}>{addingGuest ? 'Dodawanie…' : 'Dodaj do lobby'}</Text>
              </Pressable>
              <Pressable style={styles.buttonSecondary} onPress={() => setGuestModalVisible(false)}>
                <Text style={styles.buttonTextSecondary}>Anuluj</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
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
  scroll: {
    flex: 1,
  },
  playersList: {
    marginTop: 8,
  },
  dragListContainer: {
    marginTop: 8,
  },
  reorderButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(249,148,23,0.5)',
    backgroundColor: 'transparent',
  },
  reorderButtonTextSecondary: {
    fontSize: 16,
    color: '#c5c5c5',
    fontWeight: '600',
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
  bo3Value: {
    fontSize: 16,
    color: '#363062',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
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
  emptyPlayersBox: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#4a4580',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  emptyPlayersText: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  playerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#4a4580',
    borderRadius: 8,
    marginBottom: 8,
  },
  playerTileActive: {
    backgroundColor: '#5a5590',
    opacity: 0.95,
  },
  playerTileName: {
    flex: 1,
    fontSize: 16,
    color: '#c5c5c5',
    fontWeight: '500',
  },
  dragHandle: {
    padding: 8,
    marginLeft: 8,
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
  inviteButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F99417',
    backgroundColor: 'transparent',
  },
  inviteButtonTextSecondary: {
    fontSize: 16,
    color: '#F99417',
    fontWeight: 'bold',
  },
  subLabel: {
    fontSize: 14,
    color: '#c5c5c5',
    marginBottom: 8,
    marginTop: 4,
  },
  gameTypeBtnDisabled: {
    opacity: 0.45,
  },
  guestInput: {
    backgroundColor: '#f5f5f5cc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#363062',
    marginBottom: 12,
  },
  cachedNamesWrap: {
    marginBottom: 12,
  },
  cachedNamesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  cachedNameChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#4a4580',
  },
  cachedNameChipText: {
    color: '#f5f5f5',
    fontSize: 13,
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
  gameTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  gameTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
  },
  gameTypeBtnActive: {
    borderColor: '#F99417',
    backgroundColor: 'rgba(249,148,23,0.2)',
  },
  gameTypeBtnText: {
    fontSize: 16,
    color: '#c5c5c5',
    fontWeight: '600',
  },
  gameTypeBtnTextActive: {
    color: '#F99417',
  },
});

export default QuickGameLobby;

