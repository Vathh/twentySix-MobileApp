import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

const LoginButton = () => {
  const navigation = useNavigation();

  return (
    <Pressable
      style={styles.button}
      onPress={() => navigation.navigate('AccountLogin')}
    >
      <Text style={styles.text}>Zaloguj się</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {},
  text: {
    color: colors.textMuted,
    fontWeight: 'bold',
  },
});

export default LoginButton;

