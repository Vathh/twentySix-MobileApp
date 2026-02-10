import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { AuthProvider } from './context/AuthProvider';
import Screens from './pages/Screens';

export default function App() {
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
    <>
      <StatusBar style='light'/>
      <NavigationContainer>
        <AuthProvider>
          <Screens />
        </AuthProvider>
      </NavigationContainer>
    </>
    </GestureHandlerRootView>
  );
}


