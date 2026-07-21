import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import {
  QUICK_GAME_LOBBY_INVITATIONS_URL,
  getQuickGameLobbyRejectInvitationUrl,
  getQuickGameLobbyUrl,
} from '../../helpers/apiConfig';
import { colors } from '../../theme/colors';

const LobbyInvitationsScreen = ({ navigation }) => {
  const { auth } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const fetchInvitations = useCallback(async () => {
    if (!auth?.accessToken) return;
    try {
      const res = await fetch(QUICK_GAME_LOBBY_INVITATIONS_URL, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data?.invitations ?? []);
        setError('');
      } else {
        setInvitations([]);
        setError('Nie udało się załadować zaproszeń.');
      }
    } catch (e) {
      setInvitations([]);
      setError('Błąd połączenia.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.accessToken]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvitations();
  };

  const handleJoin = async (inv) => {
    if (!auth?.accessToken || joiningId) return;
    setJoiningId(inv.lobbyId);
    try {
      const joinRes = await fetch(getQuickGameLobbyUrl(inv.lobbyId) + '/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const joinData = await joinRes.json().catch(() => ({}));
      if (joinRes.ok && joinData?.id) {
        setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
        navigation.navigate('QuickGameLobby', { initialLobby: joinData });
      } else {
        Alert.alert('Błąd', joinData?.message || 'Nie udało się dołączyć do lobby.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleReject = async (inv) => {
    if (!auth?.accessToken || rejectingId) return;
    setRejectingId(inv.id);
    try {
      const res = await fetch(getQuickGameLobbyRejectInvitationUrl(inv.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Błąd', data?.message || 'Nie udało się odrzucić zaproszenia.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setRejectingId(null);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />}
    >
      <Text style={styles.title}>Zaproszenia do lobby</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {invitations.length === 0 ? (
        <Text style={styles.hint}>Brak oczekujących zaproszeń.</Text>
      ) : (
        invitations.map((inv) => (
          <View key={inv.id} style={styles.card}>
            <Text style={styles.cardTitle}>{inv.hostName} zaprasza do pojedynku</Text>
            <View style={styles.buttons}>
              <Pressable
                style={[styles.button, (joiningId === inv.lobbyId || rejectingId === inv.id) && styles.buttonDisabled]}
                onPress={() => handleJoin(inv)}
                disabled={joiningId === inv.lobbyId || rejectingId === inv.id}
              >
                <Text style={styles.buttonText}>
                  {joiningId === inv.lobbyId ? 'Dołączanie…' : 'Dołącz'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.buttonOutlined, (joiningId === inv.lobbyId || rejectingId === inv.id) && styles.buttonDisabled]}
                onPress={() => handleReject(inv)}
                disabled={joiningId === inv.lobbyId || rejectingId === inv.id}
              >
                <Text style={styles.buttonOutlinedText}>
                  {rejectingId === inv.id ? 'Odrzucanie…' : 'Odrzuć'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, color: colors.accent, fontWeight: 'bold', marginBottom: 16 },
  hint: { fontSize: 14, color: colors.textDim, marginTop: 8 },
  error: { fontSize: 14, color: colors.danger, marginBottom: 12 },
  card: {
    padding: 16,
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  cardCode: { fontSize: 14, color: colors.textDim, marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
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

export default LobbyInvitationsScreen;

