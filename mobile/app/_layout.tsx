import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const { user, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';

    if (!user && !inAuthGroup && segments[0] !== undefined) {
      router.replace('/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/');
    } else if (inAdminGroup && user?.role !== 'admin' && user?.role !== 'fulfillment') {
      router.replace('/');
    }
  }, [user, loading, segments]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Slot />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}