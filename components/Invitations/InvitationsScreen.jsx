import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import {
  FRIENDS_ACCEPT_URL,
  FRIENDS_INVITATIONS_RECEIVED_URL,
  FRIENDS_REJECT_URL,
  QUICK_GAME_LOBBY_INVITATIONS_URL,
  TOURNAMENT_INVITATIONS_RECEIVED_URL,
  getQuickGameLobbyRejectInvitationUrl,
  getQuickGameLobbyUrl,
  getTournamentInvitationAcceptUrl,
  getTournamentInvitationRejectUrl,
  getTournamentInvitationWithdrawUrl,
} from '../../helpers/apiConfig';
import { colors } from '../../theme/colors';

const TAB_TOURNAMENT = 'tournament';
const TAB_POJEDYNEK = 'pojedynek';
const TAB_FRIENDS = 'friends';

const InvitationsScreen = ({ navigation }) => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_POJEDYNEK);
  const [tournamentInvitations, setTournamentInvitations] = useState([]);
  const [lobbyInvitations, setLobbyInvitations] = useState([]);
  const [friendInvitations, setFriendInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${auth?.accessToken}`,
    }),
    [auth?.accessToken],
  );

  const fetchAll = useCallback(async () => {
    if (!auth?.accessToken) return;
    try {
      const [tournamentRes, lobbyRes, friendsRes] = await Promise.all([
        fetch(TOURNAMENT_INVITATIONS_RECEIVED_URL, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
        fetch(QUICK_GAME_LOBBY_INVITATIONS_URL, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
        fetch(FRIENDS_INVITATIONS_RECEIVED_URL, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
      ]);

      if (tournamentRes.ok) {
        const data = await tournamentRes.json();
        setTournamentInvitations(data?.invitations ?? []);
      } else {
        setTournamentInvitations([]);
      }

      if (lobbyRes.ok) {
        const data = await lobbyRes.json();
        setLobbyInvitations(data?.invitations ?? []);
      } else {
        setLobbyInvitations([]);
      }

      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriendInvitations(
          (data?.invitations ?? []).filter((inv) => inv.status === 'pending'),
        );
      } else {
        setFriendInvitations([]);
      }

      setError('');
    } catch (e) {
      setError('Błąd połączenia.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.accessToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleTournamentAction = async (invitationId, action) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`${action}-${invitationId}`);

    const urlMap = {
      accept: getTournamentInvitationAcceptUrl(invitationId),
      reject: getTournamentInvitationRejectUrl(invitationId),
      withdraw: getTournamentInvitationWithdrawUrl(invitationId),
    };

    try {
      const res = await fetch(urlMap[action], {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        await fetchAll();
      } else {
        Alert.alert('Błąd', data?.message || 'Operacja nie powiodła się.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setActionId(null);
    }
  };

  const handleLobbyJoin = async (inv) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`join-${inv.id}`);
    try {
      const joinRes = await fetch(getQuickGameLobbyUrl(inv.lobbyId) + '/join', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const joinData = await joinRes.json().catch(() => ({}));
      if (joinRes.ok && joinData?.id) {
        navigation.navigate('QuickGameLobby', { initialLobby: joinData });
      } else {
        Alert.alert('Błąd', joinData?.message || 'Nie udało się dołączyć do lobby.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setActionId(null);
    }
  };

  const handleFriendAction = async (invitationId, action) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`${action}-friend-${invitationId}`);

    const url = action === 'accept' ? FRIENDS_ACCEPT_URL : FRIENDS_REJECT_URL;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setFriendInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        if (action === 'accept') {
          Alert.alert('Gotowe', data?.message || 'Zaproszenie zaakceptowane.');
        }
      } else {
        Alert.alert('Błąd', data?.message || 'Operacja nie powiodła się.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setActionId(null);
    }
  };

  const handleLobbyReject = async (inv) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`reject-${inv.id}`);
    try {
      const res = await fetch(getQuickGameLobbyRejectInvitationUrl(inv.id), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setLobbyInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Błąd', data?.message || 'Nie udało się odrzucić zaproszenia.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setActionId(null);
    }
  };

  if (!auth?.accessToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Zaloguj się, aby zobaczyć zaproszenia.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const renderTournamentTab = () => {
    if (tournamentInvitations.length === 0) {
      return <Text style={styles.hint}>Brak zaproszeń turniejowych.</Text>;
    }

    return tournamentInvitations.map((inv) => {
      const isPending = inv.status === 'pending';
      const isAccepted = inv.status === 'accepted';
      const busy = actionId?.startsWith(`${isPending ? 'accept' : 'withdraw'}-${inv.id}`)
        || actionId?.startsWith(`reject-${inv.id}`)
        || actionId?.startsWith(`withdraw-${inv.id}`);

      return (
        <View key={inv.id} style={styles.card}>
          <Text style={styles.cardTitle}>{inv.tournamentName}</Text>
          <Text style={styles.cardSub}>{inv.statusLabel ?? inv.status}</Text>
          <View style={styles.buttons}>
            {isPending ? (
              <>
                <Pressable
                  style={[styles.button, actionId && styles.buttonDisabled]}
                  onPress={() => handleTournamentAction(inv.id, 'accept')}
                  disabled={!!actionId}
                >
                  <Text style={styles.buttonText}>
                    {actionId === `accept-${inv.id}` ? 'Akceptowanie…' : 'Akceptuj'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.buttonOutlined, actionId && styles.buttonDisabled]}
                  onPress={() => handleTournamentAction(inv.id, 'reject')}
                  disabled={!!actionId}
                >
                  <Text style={styles.buttonOutlinedText}>
                    {actionId === `reject-${inv.id}` ? 'Odrzucanie…' : 'Odrzuć'}
                  </Text>
                </Pressable>
              </>
            ) : null}
            {isAccepted ? (
              <Pressable
                style={[styles.buttonOutlined, styles.buttonFull, actionId && styles.buttonDisabled]}
                onPress={() => handleTournamentAction(inv.id, 'withdraw')}
                disabled={!!actionId}
              >
                <Text style={styles.buttonOutlinedText}>
                  {actionId === `withdraw-${inv.id}` ? 'Wycofywanie…' : 'Wycofaj udział'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    });
  };

  const renderFriendsTab = () => {
    if (friendInvitations.length === 0) {
      return <Text style={styles.hint}>Brak zaproszeń do znajomych.</Text>;
    }

    return friendInvitations.map((inv) => (
      <View key={inv.id} style={styles.card}>
        <Text style={styles.cardTitle}>
          {inv.sender?.name ?? 'Gracz'} chce dodać Cię do znajomych
        </Text>
        <View style={styles.buttons}>
          <Pressable
            style={[styles.button, actionId && styles.buttonDisabled]}
            onPress={() => handleFriendAction(inv.id, 'accept')}
            disabled={!!actionId}
          >
            <Text style={styles.buttonText}>
              {actionId === `accept-friend-${inv.id}` ? 'Akceptowanie…' : 'Akceptuj'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.buttonOutlined, actionId && styles.buttonDisabled]}
            onPress={() => handleFriendAction(inv.id, 'reject')}
            disabled={!!actionId}
          >
            <Text style={styles.buttonOutlinedText}>
              {actionId === `reject-friend-${inv.id}` ? 'Odrzucanie…' : 'Odrzuć'}
            </Text>
          </Pressable>
        </View>
      </View>
    ));
  };

  const renderPojedynekTab = () => {
    if (lobbyInvitations.length === 0) {
      return <Text style={styles.hint}>Brak zaproszeń do pojedynku.</Text>;
    }

    return lobbyInvitations.map((inv) => (
      <View key={inv.id} style={styles.card}>
        <Text style={styles.cardTitle}>{inv.hostName} zaprasza do pojedynku</Text>
        <View style={styles.buttons}>
          <Pressable
            style={[styles.button, actionId && styles.buttonDisabled]}
            onPress={() => handleLobbyJoin(inv)}
            disabled={!!actionId}
          >
            <Text style={styles.buttonText}>
              {actionId === `join-${inv.id}` ? 'Dołączanie…' : 'Dołącz'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.buttonOutlined, actionId && styles.buttonDisabled]}
            onPress={() => handleLobbyReject(inv)}
            disabled={!!actionId}
          >
            <Text style={styles.buttonOutlinedText}>
              {actionId === `reject-${inv.id}` ? 'Odrzucanie…' : 'Odrzuć'}
            </Text>
          </Pressable>
        </View>
      </View>
    ));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />}
    >
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === TAB_POJEDYNEK && styles.tabActive]}
          onPress={() => setActiveTab(TAB_POJEDYNEK)}
        >
          <Text style={[styles.tabText, activeTab === TAB_POJEDYNEK && styles.tabTextActive]}>Pojedynek</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === TAB_TOURNAMENT && styles.tabActive]}
          onPress={() => setActiveTab(TAB_TOURNAMENT)}
        >
          <Text style={[styles.tabText, activeTab === TAB_TOURNAMENT && styles.tabTextActive]}>Turniej</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === TAB_FRIENDS && styles.tabActive]}
          onPress={() => setActiveTab(TAB_FRIENDS)}
        >
          <Text style={[styles.tabText, activeTab === TAB_FRIENDS && styles.tabTextActive]}>Znajomi</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {activeTab === TAB_FRIENDS
        ? renderFriendsTab()
        : activeTab === TAB_POJEDYNEK
          ? renderPojedynekTab()
          : renderTournamentTab()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 40 },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.onAccent },
  hint: { fontSize: 14, color: colors.textDim, marginTop: 8 },
  error: { fontSize: 14, color: colors.danger, marginBottom: 12 },
  card: {
    padding: 16,
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  cardSub: { fontSize: 14, color: colors.textDim, marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonFull: { flex: 1 },
  buttonOutlined: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 14 },
  buttonOutlinedText: { color: colors.accent, fontWeight: 'bold', fontSize: 14 },
});

export default InvitationsScreen;
