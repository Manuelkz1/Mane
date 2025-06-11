import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { ProductGrid } from '../components/ProductGrid';
import { MainHeader } from '../components/MainHeader';
import { CartSheet } from '../components/CartSheet';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../constants/theme';

export default function Home() {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Add your refresh logic here
    setRefreshing(false);
  }, []);

  if (user?.role === 'fulfillment') {
    return (
      <View style={styles.container}>
        <MainHeader />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.fulfillmentContainer}>
            <Link href="/orders" style={styles.fulfillmentButton}>
              Gestionar Pedidos
            </Link>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MainHeader />
      <ProductGrid />
      <CartSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fulfillmentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fulfillmentButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});