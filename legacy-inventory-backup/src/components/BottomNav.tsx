import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';

// กำหนดป้ายชื่อหน้าจอปัจจุบัน เพื่อทำไฮไลท์สีปุ่มที่เลือก
interface BottomNavProps {
  activeScreen: 'home' | 'add' | 'products' | 'categories' | 'cart';
}

export default function BottomNav({ activeScreen }: BottomNavProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { totalItems } = useCart();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  // ฟังก์ชันช่วยเช็คสีไอคอนและข้อความ (ถ้าตรงกับหน้าปัจจุบันจะใช้สีน้ำเงินหลัก)
  const getTabStyle = (screenName: string) => {
    return activeScreen === screenName ? '#2563EB' : '#9CA3AF';
  };

  return (
    <View style={styles.bottomNav}>
      {/* ปุ่ม Home */}
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => router.replace('/home')}
      >
        <Ionicons name={activeScreen === 'home' ? "home" : "home-outline"} size={24} color={getTabStyle('home')} />
        <Text style={[styles.navText, { color: getTabStyle('home'), fontWeight: activeScreen === 'home' ? '600' : '400' }]}>Home</Text>
      </TouchableOpacity>

      {/* ปุ่มกลาง (ดีไซน์เป็นปุ่มวงกลมตรงกลางตามรูปต้นฉบับ) - admin เพิ่มสินค้าได้, user ทั่วไปเข้าตะกร้าได้ */}
      {isAdmin ? (
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/add')}
        >
          <View style={[styles.navItemFloating, { backgroundColor: activeScreen === 'add' ? '#2563EB' : '#93C5FD' }]}>
            <Ionicons name="add" size={28} color="white" />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/cart')}
        >
          <View style={[styles.navItemFloating, { backgroundColor: activeScreen === 'cart' ? '#2563EB' : '#93C5FD' }]}>
            <Ionicons name="cart" size={24} color="white" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* ปุ่ม Products */}
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => router.replace('/products')}
      >
        <Ionicons name={activeScreen === 'products' ? "cube" : "cube-outline"} size={24} color={getTabStyle('products')} />
        <Text style={[styles.navText, { color: getTabStyle('products'), fontWeight: activeScreen === 'products' ? '600' : '400' }]}>Products</Text>
      </TouchableOpacity>

      {/* ปุ่ม Categories */}
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => router.replace('/categories')}
      >
        <Ionicons name={activeScreen === 'categories' ? "grid" : "grid-outline"} size={24} color={getTabStyle('categories')} />
        <Text style={[styles.navText, { color: getTabStyle('categories'), fontWeight: activeScreen === 'categories' ? '600' : '400' }]}>Categories</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 70,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // เพิ่มเงาให้เมนูด้านล่างดูมีมิติลอยขึ้นมา
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 65,
    height: '100%',
  },
  navItemFloating: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20, // ดันปุ่มให้เยื้องขึ้นมาตรงกลาง
    shadowColor: '#93C5FD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});