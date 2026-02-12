import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import useAuth from '../hooks/useAuth';
import { FRIENDS_API_URL } from '../helpers/apiConfig';

const FriendsScreen = ({ navigation }) => {
  const { auth } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFriends = useCallback(async () => {
    if (!auth?.accessToken) return;
    try {
      const res = await fetch(FRIENDS_API_URL, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : (data?.friends ?? data?.data ?? []));
        setError('');
      } else {
        setFriends([]);
        setError('Nie udało się załadować listy znajomych.');
      }
    } catch (e) {
      setFriends([]);
      setError('Błąd połączenia.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.accessToken]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

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
        <ActivityIndicator size="large" color="#F99417" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F99417']} />}
    >
      <Text style={styles.title}>Znajomi</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {friends.length === 0 ? (
        <Text style={styles.hint}>Brak znajomych. Dodaj znajomych, aby zapraszać ich do lobby.</Text>
      ) : (
        friends.map((f) => {
          const name = f.name ?? f.playerName ?? f.player?.name ?? 'Znajomy';
          return (
            <View key={f.id ?? f.playerId ?? f.player_id} style={styles.row}>
              <Text style={styles.rowText}>{name}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#363062' },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, color: '#F99417', fontWeight: 'bold', marginBottom: 16 },
  hint: { fontSize: 14, color: '#a0a0a0', marginTop: 8 },
  error: { fontSize: 14, color: '#ff6b6b', marginBottom: 12 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#4a4580',
    borderRadius: 8,
    marginBottom: 8,
  },
  rowText: { fontSize: 16, color: '#c5c5c5', fontWeight: '500' },
});

export default FriendsScreen;
