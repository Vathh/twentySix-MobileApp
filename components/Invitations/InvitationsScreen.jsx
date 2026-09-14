import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import ScreenLoading from '../Common/ScreenLoading';
import {
  actOnFriendInvitation,
  actOnLeagueMembershipInvitation,
  actOnOrganizationInvitation,
  actOnSeasonInvitation,
  actOnTournamentInvitation,
  fetchFriendInvitationsReceived,
  fetchLeagueMembershipInvitationsReceived,
  fetchOrganizationInvitationsReceived,
  fetchQuickGameLobbyInvitations,
  fetchSeasonInvitationsReceived,
  fetchTournamentInvitationsReceived,
  joinQuickGameLobby,
  rejectQuickGameLobbyInvitation,
} from '../../helpers/invitationsApi';
import {
  acceptLeagueGameLobby,
  fetchLeagueGameInvitations,
  rejectLeagueGameLobby,
} from '../../helpers/leagueGamesApi';
import { colors } from '../../theme/colors';

const TAB_GRA = 'gra';
const TAB_FRIENDS = 'friends';

function resolveInitialTab(route) {
  return route?.params?.tab === TAB_FRIENDS ? TAB_FRIENDS : TAB_GRA;
}

const InvitationsScreen = ({ navigation, route }) => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(route));
  const [tournamentInvitations, setTournamentInvitations] = useState([]);
  const [membershipInvitations, setMembershipInvitations] = useState([]);
  const [lobbyInvitations, setLobbyInvitations] = useState([]);
  const [friendInvitations, setFriendInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    setActiveTab(resolveInitialTab(route));
  }, [route?.params?.tab]);

  const fetchSeqRef = useRef(0);

  const fetchAll = useCallback(async () => {
    if (!auth?.accessToken) return;
    const seq = ++fetchSeqRef.current;
    try {
      const [
        tournamentRes,
        organizationRes,
        seasonRes,
        leagueMembershipRes,
        lobbyRes,
        leagueRes,
        friendsRes,
      ] = await Promise.all([
        fetchTournamentInvitationsReceived(auth.accessToken),
        fetchOrganizationInvitationsReceived(auth.accessToken),
        fetchSeasonInvitationsReceived(auth.accessToken),
        fetchLeagueMembershipInvitationsReceived(auth.accessToken),
        fetchQuickGameLobbyInvitations(auth.accessToken),
        fetchLeagueGameInvitations(auth.accessToken),
        fetchFriendInvitationsReceived(auth.accessToken),
      ]);

      if (seq !== fetchSeqRef.current) {
        return;
      }

      setTournamentInvitations(tournamentRes.ok ? (tournamentRes.data?.invitations ?? []) : []);
      const organizationInvites = organizationRes.ok ? (organizationRes.data?.invitations ?? []) : [];
      const seasonInvites = seasonRes.ok ? (seasonRes.data?.invitations ?? []) : [];
      const leagueMembershipInvites = leagueMembershipRes.ok
        ? (leagueMembershipRes.data?.invitations ?? [])
        : [];
      setMembershipInvitations([
        ...organizationInvites.map((inv) => ({ ...inv, membershipKind: 'organization' })),
        ...seasonInvites.map((inv) => ({ ...inv, membershipKind: 'season' })),
        ...leagueMembershipInvites.map((inv) => ({ ...inv, membershipKind: 'league' })),
      ]);
      const quickInvites = lobbyRes.ok ? (lobbyRes.data?.invitations ?? []) : [];
      const leagueInvites = leagueRes.ok ? (leagueRes.data?.invitations ?? []) : [];
      setLobbyInvitations([...leagueInvites, ...quickInvites]);

      if (friendsRes.ok) {
        setFriendInvitations(
          (friendsRes.data?.invitations ?? []).filter((inv) => inv.status === 'pending'),
        );
      } else {
        setFriendInvitations([]);
      }

      setError('');
    } catch (e) {
      if (seq !== fetchSeqRef.current) {
        return;
      }
      setTournamentInvitations([]);
      setMembershipInvitations([]);
      setLobbyInvitations([]);
      setFriendInvitations([]);
      setError('Błąd połączenia.');
    } finally {
      if (seq !== fetchSeqRef.current) {
        return;
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.accessToken]);

  useFocusEffect(
    useCallback(() => {
      if (!auth?.accessToken) return undefined;
      setError('');
      setLoading(true);
      void fetchAll();
      return () => {
        fetchSeqRef.current += 1;
      };
    }, [auth?.accessToken, fetchAll]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleTournamentAction = async (invitationId, action) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`${action}-${invitationId}`);

    try {
      const { ok, data } = await actOnTournamentInvitation(invitationId, action, auth.accessToken);

      if (ok) {
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

  const handleMembershipAction = async (invitation, action) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`${action}-${invitation.membershipKind}-${invitation.id}`);

    try {
      const act = invitation.membershipKind === 'season'
        ? actOnSeasonInvitation
        : invitation.membershipKind === 'league'
          ? actOnLeagueMembershipInvitation
          : actOnOrganizationInvitation;
      const { ok, data } = await act(invitation.id, action, auth.accessToken);

      if (ok) {
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
      if (inv.type === 'league') {
        const { ok, data } = await acceptLeagueGameLobby(inv.id, auth.accessToken);
        if (ok) {
          navigation.navigate('Graj', {
            screen: 'LeagueGameLobby',
            params: { gameId: inv.id, initialGame: data },
          });
          return;
        }
        Alert.alert('Błąd', data?.message || 'Nie udało się zaakceptować meczu ligowego.');
        await fetchAll();
        return;
      }
      const { ok, status, data } = await joinQuickGameLobby(inv.lobbyId, auth.accessToken);
      if (ok && data?.id) {
        navigation.navigate('Graj', {
          screen: 'QuickGameLobby',
          params: { initialLobby: data },
        });
        return;
      }
      if (status === 409) {
        Alert.alert(
          'Nie można dołączyć',
          data?.message || 'Masz już aktywne lobby lub mecz w toku.',
        );
      } else {
        Alert.alert('Błąd', data?.message || 'Nie udało się dołączyć do lobby.');
      }
      await fetchAll();
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
      await fetchAll();
    } finally {
      setActionId(null);
    }
  };

  const handleFriendAction = async (invitationId, action) => {
    if (!auth?.accessToken || actionId) return;
    setActionId(`${action}-friend-${invitationId}`);

    try {
      const { ok, data } = await actOnFriendInvitation(invitationId, action, auth.accessToken);

      if (ok) {
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
      const { ok, data } = inv.type === 'league'
        ? await rejectLeagueGameLobby(inv.id, auth.accessToken)
        : await rejectQuickGameLobbyInvitation(inv.id, auth.accessToken);
      if (ok) {
        setLobbyInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      } else {
        Alert.alert('Błąd', data?.message || 'Nie udało się odrzucić zaproszenia.');
      }
    } catch (e) {
      Alert.alert('Błąd', 'Błąd połączenia.');
    } finally {
      setActionId(null);
    }
  };

  const gameItems = useMemo(
    () => [
      ...tournamentInvitations.map((inv) => ({ kind: 'tournament', inv })),
      ...membershipInvitations.map((inv) => ({ kind: 'membership', inv })),
      ...lobbyInvitations.map((inv) => ({ kind: 'lobby', inv })),
    ],
    [lobbyInvitations, membershipInvitations, tournamentInvitations],
  );

  if (!auth?.accessToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Zaloguj się, aby zobaczyć zaproszenia.</Text>
      </View>
    );
  }

  if (loading) {
    return <ScreenLoading />;
  }

  const renderTournamentCard = (inv) => {
    const isPending = inv.status === 'pending';
    const isAccepted = inv.status === 'accepted';

    return (
      <View key={`tournament-${inv.id}`} style={styles.card}>
        <Text style={styles.cardKind}>Turniej</Text>
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
  };

  const renderMembershipCard = (inv) => {
    const kindLabel = inv.membershipKind === 'season'
      ? 'Sezon'
      : inv.membershipKind === 'league'
        ? 'Liga'
        : 'Organizacja';
    const title = inv.seasonName ?? inv.leagueName ?? inv.organizationName;
    const actionKey = (action) => `${action}-${inv.membershipKind}-${inv.id}`;

    return (
      <View key={`${inv.membershipKind}-${inv.id}`} style={styles.card}>
        <Text style={styles.cardKind}>{kindLabel}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{inv.statusLabel ?? inv.status}</Text>
        <View style={styles.buttons}>
          <Pressable
            style={[styles.button, actionId && styles.buttonDisabled]}
            onPress={() => handleMembershipAction(inv, 'accept')}
            disabled={!!actionId}
          >
            <Text style={styles.buttonText}>
              {actionId === actionKey('accept') ? 'Akceptowanie…' : 'Akceptuj'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.buttonOutlined, actionId && styles.buttonDisabled]}
            onPress={() => handleMembershipAction(inv, 'reject')}
            disabled={!!actionId}
          >
            <Text style={styles.buttonOutlinedText}>
              {actionId === actionKey('reject') ? 'Odrzucanie…' : 'Odrzuć'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderLobbyCard = (inv) => (
    <View key={`${inv.type === 'league' ? 'league' : 'lobby'}-${inv.id}`} style={styles.card}>
      <Text style={styles.cardKind}>{inv.type === 'league' ? 'Mecz ligowy' : 'Quick game'}</Text>
      <Text style={styles.cardTitle}>
        {inv.hostName} zaprasza do {inv.type === 'league' ? 'meczu ligowego' : 'pojedynku'}
      </Text>
      {inv.leagueName ? <Text style={styles.cardSub}>{inv.leagueName}{inv.formatLabel ? ` · ${inv.formatLabel}` : ''}</Text> : null}
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, actionId && styles.buttonDisabled]}
          onPress={() => handleLobbyJoin(inv)}
          disabled={!!actionId}
        >
          <Text style={styles.buttonText}>
            {actionId === `join-${inv.id}` ? 'Dołączanie…' : (inv.type === 'league' ? 'Akceptuj' : 'Dołącz')}
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
  );

  const listData = activeTab === TAB_FRIENDS ? friendInvitations : gameItems;

  const renderInvitation = ({ item }) => {
    if (activeTab === TAB_FRIENDS) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {item.sender?.name ?? 'Gracz'} chce dodać Cię do znajomych
          </Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, actionId && styles.buttonDisabled]}
              onPress={() => handleFriendAction(item.id, 'accept')}
              disabled={!!actionId}
            >
              <Text style={styles.buttonText}>
                {actionId === `accept-friend-${item.id}` ? 'Akceptowanie…' : 'Akceptuj'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.buttonOutlined, actionId && styles.buttonDisabled]}
              onPress={() => handleFriendAction(item.id, 'reject')}
              disabled={!!actionId}
            >
              <Text style={styles.buttonOutlinedText}>
                {actionId === `reject-friend-${item.id}` ? 'Odrzucanie…' : 'Odrzuć'}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (item.kind === 'tournament') {
      return renderTournamentCard(item.inv);
    }
    if (item.kind === 'membership') {
      return renderMembershipCard(item.inv);
    }
    return renderLobbyCard(item.inv);
  };

  const emptyHint = activeTab === TAB_FRIENDS
    ? 'Brak zaproszeń do znajomych.'
    : 'Brak zaproszeń do gry.';

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={listData}
      keyExtractor={(item) => {
        if (activeTab === TAB_FRIENDS) {
          return `friend-${item.id}`;
        }
        if (item.kind === 'lobby') {
          return `${item.inv.type === 'league' ? 'league-game' : 'lobby'}-${item.inv.id}`;
        }
        if (item.kind === 'membership') {
          return `${item.inv.membershipKind}-${item.inv.id}`;
        }
        return `${item.kind}-${item.inv.id}`;
      }}
      renderItem={renderInvitation}
      ListHeaderComponent={(
        <>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === TAB_GRA && styles.tabActive]}
              onPress={() => setActiveTab(TAB_GRA)}
            >
              <Text style={[styles.tabText, activeTab === TAB_GRA && styles.tabTextActive]}>Gra</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === TAB_FRIENDS && styles.tabActive]}
              onPress={() => setActiveTab(TAB_FRIENDS)}
            >
              <Text style={[styles.tabText, activeTab === TAB_FRIENDS && styles.tabTextActive]}>Znajomi</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
      ListEmptyComponent={<Text style={styles.hint}>{emptyHint}</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  cardKind: {
    fontSize: 12,
    color: colors.textDim,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
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
