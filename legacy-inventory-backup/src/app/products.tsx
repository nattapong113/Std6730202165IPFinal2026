import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import AddToCartModal from '../components/AddToCartModal';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

export default function ProductsScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [products, setProducts] = useState<any[]>([]);
  const [cartProduct, setCartProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriceRange, setFilterPriceRange] = useState('all');

  const priceRanges: { label: string; value: string; min: number; max: number }[] = [
    { label: 'All', value: 'all', min: -Infinity, max: Infinity },
    { label: '฿1,000 - 5,000', value: '1000-5000', min: 1000, max: 5000 },
    { label: '฿5,000 - 10,000', value: '5000-10000', min: 5000, max: 10000 },
    { label: 'Above ฿10,000', value: 'above-10000', min: 10000, max: Infinity },
  ];

  // URL ของ API เซิร์ฟเวอร์
  const API_BASE_URL = 'http://119.59.102.161:3017/api';

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
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

  const parsePriceFilter = (query: string): ((price: number) => boolean) | null => {
    const q = query.replace(/฿/g, '').trim();

    const rangeMatch = q.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return (price) => price >= Math.min(min, max) && price <= Math.max(min, max);
    }

    const minOnlyMatch = q.match(/^(\d+(?:\.\d+)?)\s*-$/) || q.match(/^>=?\s*(\d+(?:\.\d+)?)$/);
    if (minOnlyMatch) {
      const min = parseFloat(minOnlyMatch[1]);
      return (price) => price >= min;
    }

    const maxOnlyMatch = q.match(/^-\s*(\d+(?:\.\d+)?)$/) || q.match(/^<=?\s*(\d+(?:\.\d+)?)$/);
    if (maxOnlyMatch) {
      const max = parseFloat(maxOnlyMatch[1]);
      return (price) => price <= max;
    }

    return null;
  };

  const filteredProducts = products.filter((item) => {
    if (filterCategory !== 'all' && item.category?.toString() !== filterCategory) {
      return false;
    }

    if (filterStatus !== 'all' && (item.status || 'Active') !== filterStatus) {
      return false;
    }

    if (filterPriceRange !== 'all') {
      const range = priceRanges.find((r) => r.value === filterPriceRange);
      const price = Number(item.price || 0);
      if (range && (price < range.min || price > range.max)) {
        return false;
      }
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const priceFilter = parsePriceFilter(query);
    if (priceFilter) {
      return priceFilter(Number(item.price || 0));
    }

    return (
      item.name?.toLowerCase().includes(query) ||
      item.category?.toString().toLowerCase().includes(query)
    );
  });

  const activeFilterCount =
    (filterCategory !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterPriceRange !== 'all' ? 1 : 0);

  const handleNavigation = (path: string) => {
    setMenuVisible(false);
    if (path === '/') router.replace(path);
    else router.push(path as any);
  };

  const renderProduct = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
      >
        <View style={styles.cardTop}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.image || 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=200&h=200&fit=crop' }} 
              style={styles.productImage} 
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.priceText}>
              ฿{Number(item.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Stock: </Text>
              <Text style={styles.detailValue}>{item.stock} in stock</Text>
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Category: </Text>
              <Text style={styles.detailValue}>{item.category == 2 ? 'Gaming Monitor' : item.category == 1 ? 'Standard Monitor' : item.category || 'General'}</Text>
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Location: </Text>
              <Text style={styles.detailValue}>{item.location || '3 stores'}</Text>
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{item.status || 'Active'}</Text>
              </View>
              {isAdmin ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({ pathname: '/edit', params: { id: item.id } });
                  }}
                >
                  <Ionicons name="create-outline" size={14} color="#2563EB" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setCartProduct(item);
                  }}
                >
                  <Ionicons name="cart-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.buyButtonText}>Add to Cart</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.filterBackdrop}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Products</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionLabel}>Category</Text>
            <View style={styles.filterOptionsRow}>
              {[
                { label: 'All', value: 'all' },
                { label: 'Standard Monitor', value: '1' },
                { label: 'Gaming Monitor', value: '2' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterChip, filterCategory === opt.value && styles.filterChipActive]}
                  onPress={() => setFilterCategory(opt.value)}
                >
                  <Text style={[styles.filterChipText, filterCategory === opt.value && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionLabel}>Price Range</Text>
            <View style={styles.filterOptionsRow}>
              {priceRanges.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterChip, filterPriceRange === opt.value && styles.filterChipActive]}
                  onPress={() => setFilterPriceRange(opt.value)}
                >
                  <Text style={[styles.filterChipText, filterPriceRange === opt.value && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionLabel}>Status</Text>
            <View style={styles.filterOptionsRow}>
              {[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'Active' },
                { label: 'Low in stock', value: 'Low in stock' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterChip, filterStatus === opt.value && styles.filterChipActive]}
                  onPress={() => setFilterStatus(opt.value)}
                >
                  <Text style={[styles.filterChipText, filterStatus === opt.value && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={() => {
                  setFilterCategory('all');
                  setFilterStatus('all');
                  setFilterPriceRange('all');
                }}
              >
                <Text style={styles.filterClearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.filterApplyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        <TouchableOpacity style={styles.menuIcon} onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu-outline" size={32} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/settings')}>
          <Ionicons name="person-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Actions (Search, Add, Filter) */}
      {showSearch ? (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchBarIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, or price e.g. 100-500"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.searchIcon} onPress={() => setShowSearch(true)}>
            <Ionicons name="search-outline" size={26} color="#2563EB" />
          </TouchableOpacity>

          <View style={styles.actionRight}>
            {isAdmin && (
              <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add')}>
                <Text style={styles.addButtonText}>+ Add Product</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <Text style={styles.filterButtonText}>
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
              <Ionicons name="funnel" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Product List */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav activeScreen="products" />

      <AddToCartModal
        visible={!!cartProduct}
        product={cartProduct}
        onClose={() => setCartProduct(null)}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 70
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background
  },
  menuIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text
  },
  profileIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#2563EB', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  actionsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 16 
  },
  searchIcon: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionRight: { 
    flexDirection: 'row', 
    gap: 12 
  },
  addButton: { 
    backgroundColor: '#2563EB', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 8 
  },
  addButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 13 
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6
  },
  filterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13
  },
  listContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16, 
    marginBottom: 16, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardTop: { 
    flexDirection: 'row', 
    marginBottom: 16 
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  productImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 12 
  },
  detailsContainer: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 6
  },
  detailText: {
    fontSize: 13,
    marginBottom: 4
  },
  detailLabel: {
    color: colors.textSecondary
  },
  detailValue: {
    color: colors.text,
    fontWeight: '700'
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
    gap: 12
  },
  statusBadge: { 
    backgroundColor: '#60A5FA', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  statusBadgeText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100
  },
  modalBackground: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  closeButton: { padding: 5 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  modalItemsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 32 },
  modalItemText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  logoutButton: { paddingBottom: 50, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 18, fontWeight: '600' },
  filterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterClearButtonText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  filterApplyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});