import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import { useCartStore } from '../stores/cartStore';
import { theme } from '../constants/theme';
import { BottomSheet } from './BottomSheet';

export function CartSheet() {
  const cartStore = useCartStore();

  const renderItem = useCallback(({ item }) => (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: item.product.images[0] }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>
          ${(item.product.price * item.quantity).toFixed(2)}
        </Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            onPress={() => cartStore.updateQuantity(item.product.id, item.quantity - 1)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => cartStore.updateQuantity(item.product.id, item.quantity + 1)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => cartStore.removeItem(item.product.id)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  ), []);

  const footer = useMemo(() => (
    <View style={styles.footer}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalAmount}>${cartStore.total.toFixed(2)}</Text>
      </View>
      <Link href="/checkout" asChild>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => cartStore.toggleCart()}
        >
          <Text style={styles.checkoutButtonText}>Finalizar Compra</Text>
        </TouchableOpacity>
      </Link>
    </View>
  ), [cartStore.total]);

  return (
    <BottomSheet
      visible={cartStore.isOpen}
      onClose={() => cartStore.toggleCart()}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Carrito de Compras</Text>
          <TouchableOpacity
            onPress={() => cartStore.toggleCart()}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {cartStore.items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Tu carrito está vacío</Text>
          </View>
        ) : (
          <FlatList
            data={cartStore.items}
            renderItem={renderItem}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={styles.cartList}
            ListFooterComponent={footer}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.text,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    backgroundColor: theme.colors.border,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: theme.colors.text,
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 24,
    color: theme.colors.error,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  checkoutButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});