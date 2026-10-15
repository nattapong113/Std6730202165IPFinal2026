import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

export default function FinancesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  // สร้างฟังก์ชันจำลองกราฟแท่ง
  const renderMockChart = () => (
    <View style={styles.chartContainer}>
      {[40, 70, 50, 90, 60, 80, 30].map((height, i) => (
        <View key={i} style={styles.barWrapper}>
          <View style={[styles.bar, { height: height + '%' }]} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finances</Text>
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={30} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateSelector}>
          <Text style={styles.dateText}>February 2026 - March 2026</Text>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Net sales</Text>
            <Text style={styles.percentagePos}>+2.12%</Text>
          </View>
          <Text style={styles.amount}>$4,103</Text>
          {renderMockChart()}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Gross profit</Text>
            <Text style={styles.percentagePos}>+1.10%</Text>
          </View>
          <Text style={styles.amount}>$3,819</Text>
          {renderMockChart()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A8A' },
  content: { padding: 20 },
  dateSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  dateText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  card: {
    backgroundColor: colors.surface, padding: 20, borderRadius: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  percentagePos: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },
  amount: { fontSize: 28, fontWeight: 'bold', color: '#1E3A8A', marginTop: 4, marginBottom: 20 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barWrapper: { width: '10%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 },
});