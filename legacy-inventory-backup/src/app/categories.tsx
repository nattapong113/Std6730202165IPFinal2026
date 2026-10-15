import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import { useAppTheme } from '../context/ThemeContext';

// เปลี่ยนข้อมูลหมวดหมู่ให้เข้ากับร้านอุปกรณ์ไอที (Jett Dash)
const CATEGORIES = [
  { id: '1', name: 'Gaming Monitors', items: 45, icon: 'game-controller', color: '#3B82F6', bgColor: '#DBEAFE' },
  { id: '2', name: 'Office Monitors', items: 32, icon: 'desktop', color: '#10B981', bgColor: '#D1FAE5' },
  { id: '3', name: 'Curved Monitors', items: 18, icon: 'tv', color: '#8B5CF6', bgColor: '#EDE9FE' },
  { id: '4', name: 'Ultrawide Monitors', items: 12, icon: 'expand', color: '#F59E0B', bgColor: '#FEF3C7' },
  { id: '5', name: 'Accessories', items: 64, icon: 'headset', color: '#EC4899', bgColor: '#FCE7F3' },
  { id: '6', name: 'Cables & Adapters', items: 128, icon: 'hardware-chip', color: '#64748B', bgColor: '#F1F5F9' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Modern Header */}
      <View style={styles.header}>
        {/* แก้ไขปุ่ม Back ให้พุ่งกลับไปหน้า Home แทน */}
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Categories</Text>
        
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="add" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Product Categories</Text>
        
        {/* Category List */}
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.categoryCard}>
            <View style={[styles.iconWrapper, { backgroundColor: cat.bgColor }]}>
              <Ionicons name={cat.icon as any} size={24} color={cat.color} />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.itemCount}>{cat.items} items</Text>
            </View>
            
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* แถบเมนูด้านล่าง */}
      <BottomNav activeScreen="categories" />
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
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  categoryCard: {
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
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chevronWrapper: {
    padding: 4,
  },
});