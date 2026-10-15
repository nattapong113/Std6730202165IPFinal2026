import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

const STORE_COLORS = [
  { color: '#3B82F6', bgColor: '#DBEAFE' },
  { color: '#10B981', bgColor: '#D1FAE5' },
  { color: '#8B5CF6', bgColor: '#EDE9FE' },
  { color: '#F59E0B', bgColor: '#FEF3C7' },
  { color: '#EC4899', bgColor: '#FCE7F3' },
  { color: '#64748B', bgColor: '#F1F5F9' },
];

interface StoreSummary {
  name: string;
  productCount: number;
  totalStock: number;
  lowStockCount: number;
}

export default function StoresScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE_URL = 'http://119.59.102.161:3017/api';

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const stores: StoreSummary[] = Object.values(
    products.reduce((acc: Record<string, StoreSummary>, item) => {
      const name = item.location || 'Main Warehouse';
      if (!acc[name]) {
        acc[name] = { name, productCount: 0, totalStock: 0, lowStockCount: 0 };
      }
      const stock = Number(item.stock || 0);
      acc[name].productCount += 1;
      acc[name].totalStock += stock;
      if (stock <= 5) acc[name].lowStockCount += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.productCount - a.productCount);

  const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Stores</Text>

        <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        >
          {/* Overview stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#EEF2FF' }]}>
              <View style={[styles.iconWrapperSmall, { backgroundColor: '#C7D2FE' }]}>
                <Ionicons name="business" size={18} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{stores.length}</Text>
              <Text style={styles.statLabel}>Stores</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
              <View style={[styles.iconWrapperSmall, { backgroundColor: '#BBF7D0' }]}>
                <Ionicons name="cube" size={18} color="#16A34A" />
              </View>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFF7ED' }]}>
              <View style={[styles.iconWrapperSmall, { backgroundColor: '#FED7AA' }]}>
                <Ionicons name="layers" size={18} color="#EA580C" />
              </View>
              <Text style={styles.statNumber}>{totalStock}</Text>
              <Text style={styles.statLabel}>Total Stock</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Store Locations</Text>

          {stores.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="storefront-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>ยังไม่มีข้อมูลร้าน/คลังสินค้า</Text>
            </View>
          ) : (
            stores.map((store, idx) => {
              const palette = STORE_COLORS[idx % STORE_COLORS.length];
              return (
                <TouchableOpacity
                  key={store.name}
                  style={styles.storeCard}
                  onPress={() => router.push('/products')}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: palette.bgColor }]}>
                    <Ionicons name="storefront" size={24} color={palette.color} />
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                    <Text style={styles.storeSubtitle}>
                      {store.productCount} product{store.productCount === 1 ? '' : 's'} • {store.totalStock} in stock
                    </Text>
                    {store.lowStockCount > 0 && (
                      <View style={styles.lowStockBadge}>
                        <Ionicons name="alert-circle" size={12} color="#DC2626" />
                        <Text style={styles.lowStockText}>{store.lowStockCount} low stock</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperSmall: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  storeSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
