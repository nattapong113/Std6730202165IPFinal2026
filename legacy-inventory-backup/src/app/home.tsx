import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddToCartModal from '../components/AddToCartModal';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';

const CATEGORY_CHIPS = [
  { label: 'All', icon: 'apps-outline' as const },
  { label: 'Gaming', icon: 'game-controller-outline' as const },
  { label: 'Standard', icon: 'desktop-outline' as const },
  { label: 'Accessories', icon: 'headset-outline' as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [isMenuVisible, setMenuVisible] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartProduct, setCartProduct] = useState<any>(null);

  const API_BASE_URL = 'http://119.59.102.161:3017/api';

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleNavigation = (path: string) => {
    setMenuVisible(false);
    if (path === '/') router.replace(path);
    else router.push(path as any);
  };

  const featuredProducts = products.slice(0, 6);
  const lowStockCount = products.filter((p) => Number(p.stock || 0) <= 5).length;
  const initials = (user?.username || 'JD').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Modal Menu */}
      <Modal visible={isMenuVisible} animationType="fade" transparent={false}>
        <SafeAreaView style={styles.modalBackground}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Jett Dash</Text>
            <View style={{ width: 32 }} />
          </View>
          <View style={styles.modalItemsContainer}>
            {['/home', '/products', '/categories', '/stores', '/finances', '/orders'].map((path, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleNavigation(path)}>
                <Text style={styles.modalItemText}>{path.replace('/', '').charAt(0).toUpperCase() + path.slice(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={() => handleNavigation('/')}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Ionicons name="grid-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.greetingText}>{isAdmin ? 'Admin Panel' : 'Welcome back'}</Text>
            <Text style={styles.headerTitle}>{user?.username || 'Jett Dash'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {!isAdmin && (
            <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
              <Ionicons name="cart-outline" size={22} color={colors.text} />
              {totalItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/settings')}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => router.push('/products')}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search products...</Text>
        </TouchableOpacity>

        {/* Promo banner */}
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerEyebrow}>NEW ARRIVALS</Text>
            <Text style={styles.bannerTitle}>Level up your{'\n'}setup today</Text>
            <TouchableOpacity style={styles.bannerButton} onPress={() => router.push('/products')}>
              <Text style={styles.bannerButtonText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>
          <Ionicons name="desktop-outline" size={100} color="rgba(255,255,255,0.2)" style={styles.bannerIcon} />
        </LinearGradient>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ gap: 10 }}>
          {CATEGORY_CHIPS.map((cat) => (
            <TouchableOpacity key={cat.label} style={styles.chip} onPress={() => router.push('/products')}>
              <Ionicons name={cat.icon} size={16} color="#2563EB" />
              <Text style={styles.chipText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Admin overview strip (คำนวณจากข้อมูลจริง) */}
        {isAdmin && (
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#EEF2FF' }]}>
              <View style={[styles.iconWrapper, { backgroundColor: '#C7D2FE' }]}>
                <Ionicons name="cube" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEF2F2' }]}>
              <View style={[styles.iconWrapper, { backgroundColor: '#FECACA' }]}>
                <Ionicons name="warning" size={20} color="#DC2626" />
              </View>
              <Text style={styles.statNumber}>{lowStockCount}</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
          </View>
        )}

        {/* Popular Products */}
        <View style={styles.sectionHeaderWithLink}>
          <Text style={styles.sectionTitle}>Popular Products</Text>
          <TouchableOpacity onPress={() => router.push('/products')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : (
          <View style={styles.grid}>
            {featuredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.gridCard}
                onPress={() => router.push({ pathname: '/detail', params: { id: product.id } })}
              >
                <View style={styles.gridImageWrap}>
                  <Image
                    source={{ uri: product.image || 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=200&h=200&fit=crop' }}
                    style={styles.gridImage}
                    resizeMode="contain"
                  />
                  {!isAdmin && (
                    <TouchableOpacity
                      style={styles.gridAddBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setCartProduct(product);
                      }}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.gridName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.gridPrice}>
                  ฿{Number(product.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomNav activeScreen="home" />

      <AddToCartModal
        visible={!!cartProduct}
        product={cartProduct}
        onClose={() => setCartProduct(null)}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingBottom: 70 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, backgroundColor: colors.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: {
    backgroundColor: colors.surface, padding: 10, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  greetingText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },

  cartBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cartBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: colors.background,
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  profileBtn: {
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.surface
  },
  profileInitials: {
    color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'
  },

  content: { flex: 1, paddingHorizontal: 24 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, height: 50, marginBottom: 20,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },

  banner: {
    borderRadius: 24, padding: 24, marginBottom: 20, minHeight: 140,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  bannerTextWrap: { flex: 1 },
  bannerEyebrow: { color: '#BFDBFE', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 16 },
  bannerButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  bannerButtonText: { color: '#2563EB', fontWeight: '800', fontSize: 13 },
  bannerIcon: { position: 'absolute', right: -10, bottom: -20 },

  chipsRow: { marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },

  sectionHeaderWithLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  seeAllText: { fontSize: 14, color: '#2563EB', fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  statBox: {
    flex: 1, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapper: { padding: 10, borderRadius: 14, marginBottom: 12 },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '48%', backgroundColor: colors.surface, borderRadius: 18, padding: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  gridImageWrap: {
    width: '100%', height: 110, borderRadius: 14, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative',
  },
  gridImage: { width: '75%', height: '75%' },
  gridAddBtn: {
    position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  gridName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
  gridPrice: { fontSize: 14, fontWeight: '800', color: '#2563EB' },

  modalBackground: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  closeButton: { padding: 5 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  modalItemsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 32 },
  modalItemText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  logoutButton: { paddingBottom: 50, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 18, fontWeight: '600' },
});
