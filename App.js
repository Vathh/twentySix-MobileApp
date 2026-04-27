import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthProvider';
import Screens from './pages/Screens';

function AppContent() {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0);
  const bottomInset = Math.max(insets.bottom, 10);
  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <GestureHandlerRootView style={styles.gesture}>
        <StatusBar style="light" />
        <NavigationContainer>
          <AuthProvider>
            <Screens />
          </AuthProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#363062' },
  gesture: { flex: 1 },
});


