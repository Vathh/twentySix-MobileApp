import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import {
  FRIENDS_API_URL,
  FRIENDS_INVITE_URL,
  FRIENDS_INVITATIONS_SENT_URL,
  FRIENDS_REMOVE_URL,
  USERS_SEARCH_URL,
} from '../../helpers/apiConfig';
import { colors } from '../../theme/colors';

const TAB_LIST = 'list';
const TAB_ADD = 'add';

const FriendsScreen = ({ navigation }) => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_LIST);
  const [friends, setFriends] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
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

  const fetchFriends = useCallback(async () => {
    if (!auth?.accessToken) return;
    try {
      const [friendsRes, sentRes] = await Promise.all([
        fetch(FRIENDS_API_URL, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
        fetch(FRIENDS_INVITATIONS_SENT_URL, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
      ]);

      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data?.friends ?? []);
      } else {
        setFriends([]);
      }

      if (sentRes.ok) {
        const data = await sentRes.json();
        setSentInvitations(
          (data?.invitations ?? []).filter((inv) => inv.status === 'pending'),
        );
      } else {
        setSentInvitations([]);
      }

      setError('');
    } catch (e) {
      setFriends([]);
      setSentInvitations([]);
      setError('Błąd połączenia.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.accessToken]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    if (activeTab !== TAB_ADD || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `${USERS_SEARCH_URL}?q=${encodeURIComponent(searchQuery.trim())}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data?.users ?? []);
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, auth?.accessToken]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  const handleInvite = async (receiverId) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`invite-${receiverId}`);
    try {
      const res = await fetch(FRIENDS_INVITE_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        Alert.alert('Wysłano', data?.message || 'Zaproszenie zostało wysłane.');
        setSearchResults((prev) => prev.filter((u) => u.id !== receiverId));
        await fetchFriends();
      } else {
        Alert.alert('Błąd', data?.message || 'Nie udało się wysłać zaproszenia.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveFriend = (friend) => {
    const friendId = friend.id ?? friend.playerId;
    const name = friend.name ?? 'znajomego';
    Alert.alert('Usuń znajomego', `Usunąć ${name} z listy znajomych?`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          if (actionId) return;
          setActionId(`remove-${friendId}`);
          try {
            const res = await fetch(FRIENDS_REMOVE_URL, {
              method: 'DELETE',
              headers: authHeaders(),
              body: JSON.stringify({ friendId }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              setFriends((prev) => prev.filter((f) => (f.id ?? f.playerId) !== friendId));
            } else {
              Alert.alert('Błąd', data?.message || 'Nie udało się usunąć znajomego.');
            }
          } catch (e) {
            Alert.alert('Błąd', 'Błąd połączenia.');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const isAlreadyFriend = (userId) =>
    friends.some((f) => (f.id ?? f.playerId) === userId);

  const hasPendingInvite = (userId) =>
    sentInvitations.some((inv) => inv.receiver?.id === userId);

  if (!auth?.accessToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Zaloguj się, aby zobaczyć znajomych.</Text>
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

  const renderListTab = () => (
    <>
      {friends.length === 0 ? (
        <Text style={styles.hint}>
          Brak znajomych. Przejdź do zakładki „Dodaj”, aby wysłać zaproszenie.
        </Text>
      ) : (
        friends.map((f) => {
          const name = f.name ?? f.playerName ?? f.player?.name ?? 'Znajomy';
          const key = f.id ?? f.playerId ?? f.player_id;
          return (
            <View key={key} style={styles.row}>
              <Text style={styles.rowText}>{name}</Text>
              <Pressable
                style={[styles.removeButton, actionId && styles.buttonDisabled]}
                onPress={() => handleRemoveFriend(f)}
                disabled={!!actionId}
              >
                <Text style={styles.removeButtonText}>
                  {actionId === `remove-${key}` ? '…' : 'Usuń'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}

      {sentInvitations.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Oczekujące zaproszenia</Text>
          {sentInvitations.map((inv) => (
            <View key={inv.id} style={styles.pendingRow}>
              <Text style={styles.rowText}>
                {inv.receiver?.name ?? 'Gracz'} — wysłane, czeka na akceptację
              </Text>
            </View>
          ))}
        </>
      ) : null}

      <Pressable
        style={styles.linkButton}
        onPress={() => navigation.navigate('Zaproszenia')}
      >
        <Text style={styles.linkButtonText}>Zaproszenia do zaakceptowania →</Text>
      </Pressable>
    </>
  );

  const renderAddTab = () => (
    <>
      <Text style={styles.hint}>Wpisz min. 2 znaki nazwy gracza, aby wyszukać użytkownika.</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Szukaj gracza…"
        placeholderTextColor={colors.placeholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchLoading ? <ActivityIndicator color={colors.accent} style={styles.searchSpinner} /> : null}
      {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
        <Text style={styles.hint}>Brak wyników.</Text>
      ) : null}
      {searchResults.map((user) => {
        const busy = actionId === `invite-${user.id}`;
        const disabled = !!actionId || isAlreadyFriend(user.id) || hasPendingInvite(user.id);
        let actionLabel = 'Zaproś';
        if (isAlreadyFriend(user.id)) actionLabel = 'Znajomy';
        else if (hasPendingInvite(user.id)) actionLabel = 'Wysłano';
        else if (busy) actionLabel = 'Wysyłanie…';

        return (
          <View key={user.id} style={styles.row}>
            <Text style={styles.rowText}>{user.name ?? 'Gracz'}</Text>
            <Pressable
              style={[styles.inviteButton, disabled && styles.buttonDisabled]}
              onPress={() => handleInvite(user.id)}
              disabled={disabled}
            >
              <Text style={styles.inviteButtonText}>{actionLabel}</Text>
            </Pressable>
          </View>
        );
      })}
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === TAB_LIST && styles.tabActive]}
          onPress={() => setActiveTab(TAB_LIST)}
        >
          <Text style={[styles.tabText, activeTab === TAB_LIST && styles.tabTextActive]}>
            Lista
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === TAB_ADD && styles.tabActive]}
          onPress={() => setActiveTab(TAB_ADD)}
        >
          <Text style={[styles.tabText, activeTab === TAB_ADD && styles.tabTextActive]}>
            Dodaj
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {activeTab === TAB_LIST ? renderListTab() : renderAddTab()}
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
  hint: { fontSize: 14, color: colors.textDim, marginBottom: 12 },
  error: { fontSize: 14, color: colors.danger, marginBottom: 12 },
  sectionTitle: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    marginBottom: 8,
  },
  pendingRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.bgDeep,
    borderRadius: 8,
    marginBottom: 8,
  },
  rowText: { flex: 1, fontSize: 16, color: colors.textMuted, fontWeight: '500', marginRight: 8 },
  removeButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButtonText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  inviteButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  inviteButtonText: { color: colors.onAccent, fontSize: 13, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.5 },
  searchInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.bgElevatedHover,
  },
  searchSpinner: { marginVertical: 12 },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkButtonText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
});

export default FriendsScreen;
