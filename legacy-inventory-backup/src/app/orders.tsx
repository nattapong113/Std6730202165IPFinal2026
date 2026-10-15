import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

const API_BASE_URL = 'http://119.59.102.161:3017/api';
const STATUSES = ['Pending', 'Shipped', 'Delivered'] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: any }> = {
  Pending: { bg: '#FEF3C7', color: '#B45309', icon: 'time-outline' },
  Shipped: { bg: '#DBEAFE', color: '#1D4ED8', icon: 'airplane-outline' },
  Delivered: { bg: '#D1FAE5', color: '#047857', icon: 'checkmark-done-outline' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { token, isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const endpoint = isAdmin ? '/orders' : '/orders/me';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAdmin ? 'All Orders' : 'My Orders'}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>ยังไม่มีรายการสั่งซื้อ</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        >
          {orders.map((order) => {
            const statusStyle = STATUS_STYLE[order.status] || STATUS_STYLE.Pending;
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.productName} numberOfLines={2}>{order.productName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Ionicons name={statusStyle.icon} size={12} color={statusStyle.color} />
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{order.status}</Text>
                  </View>
                </View>

                {isAdmin && (
                  <Text style={styles.buyerText}>ผู้ซื้อ: {order.buyerUsername}</Text>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>จำนวน {order.quantity} ชิ้น</Text>
                  <Text style={styles.infoText}>
                    ฿{Number(order.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <Text style={styles.dateText}>
                  {new Date(order.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>

                {order.shippingName || order.shippingAddress ? (
                  <View style={styles.shippingBox}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shippingName}>
                        {order.shippingName}{order.shippingPhone ? ` • ${order.shippingPhone}` : ''}
                      </Text>
                      <Text style={styles.shippingAddress}>{order.shippingAddress}</Text>
                    </View>
                  </View>
                ) : null}

                {isAdmin && (
                  <View style={styles.statusRow}>
                    {STATUSES.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusOption, order.status === s && styles.statusOptionActive]}
                        onPress={() => updateStatus(order.id, s)}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id && order.status !== s ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <Text style={[styles.statusOptionText, order.status === s && styles.statusOptionTextActive]}>
                            {s}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <BottomNav activeScreen={isAdmin ? 'home' : 'cart'} />
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 70,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  iconButton: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buyerText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  shippingBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  shippingName: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  shippingAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
});
