import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showAlert } from '../utils/alert';

type Status = 'Active' | 'On Leave';

interface Employee {
  id: string;
  name: string;
  position: string;
  status: Status;
  salary: number;
}

interface SalaryCluster {
  group: string;
  centroid: number;
  count: number;
}

const formatMoney = (value: number) =>
  Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const AVATAR_COLORS = ['#6366F1', '#0EA5E9', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#22C55E'];
const avatarColor = (id: string) => AVATAR_COLORS[Number(id) % AVATAR_COLORS.length] || AVATAR_COLORS[0];

// สีของแต่ละ Tier: ต่ำ -> กลาง -> สูง
const TIER_STYLES = [
  { color: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD', icon: 'trending-down' as const, label: 'Entry level' },
  { color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', icon: 'remove' as const, label: 'Mid level' },
  { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: 'trending-up' as const, label: 'Senior level' },
];

const MAX_WIDTH = 960;

export default function DashboardScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [clusters, setClusters] = useState<SalaryCluster[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stats = useMemo(() => {
    const active = employees.filter((emp) => emp.status === 'Active').length;
    const total = employees.length;
    const avg = total ? employees.reduce((sum, emp) => sum + Number(emp.salary), 0) / total : 0;
    return { total, active, onLeave: total - active, avg };
  }, [employees]);

  // เรียก API พร้อมแนบ token; ถ้าโดน 401 ให้ logout กลับหน้า Login
  const apiRequest = useCallback(
    async (path: string, options: RequestInit = {}) => {
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
          },
        });
      } catch {
        throw new Error(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (${API_BASE_URL})`);
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        logout();
        router.replace('/');
        throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data;
    },
    [token]
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const data: Employee[] = await apiRequest('/employees');
      setEmployees(data);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (token) fetchEmployees();
  }, [token, fetchEmployees]);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedPosition = position.trim();
    const trimmedSalary = salary.trim();

    // Client-side validation
    if (!trimmedName || !trimmedPosition || !trimmedSalary) {
      showAlert('ข้อมูลไม่ครบ', 'กรุณากรอก Name, Position และ Salary ให้ครบทุกช่อง');
      return;
    }
    const numericSalary = Number(trimmedSalary);
    if (!Number.isFinite(numericSalary) || numericSalary < 0) {
      showAlert('ข้อมูลไม่ถูกต้อง', 'Salary ต้องเป็นตัวเลขที่ไม่ติดลบ');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify({ name: trimmedName, position: trimmedPosition, salary: numericSalary }),
      });
      setName('');
      setPosition('');
      setSalary('');
      setClusters(null);
      await fetchEmployees();
    } catch (error: any) {
      showAlert('เพิ่มพนักงานไม่สำเร็จ', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    setBusyId(id);
    try {
      await apiRequest(`/employees/${id}/status`, { method: 'PUT' });
      await fetchEmployees();
    } catch (error: any) {
      showAlert('เปลี่ยนสถานะไม่สำเร็จ', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (employee: Employee) => {
    confirmAction('Are you sure?', `ต้องการลบ ${employee.name} ออกจากระบบหรือไม่?`, async () => {
      setBusyId(employee.id);
      try {
        await apiRequest(`/employees/${employee.id}`, { method: 'DELETE' });
        setClusters(null);
        await fetchEmployees();
      } catch (error: any) {
        showAlert('ลบไม่สำเร็จ', error.message);
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setClusters(null);
    try {
      const data = await apiRequest('/employees/salary-clusters');
      setClusters(data.clusters || []);
    } catch (error: any) {
      showAlert('วิเคราะห์ไม่สำเร็จ', error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = () => {
    confirmAction('Logout', 'ต้องการออกจากระบบหรือไม่?', () => {
      logout();
      router.replace('/');
    }, 'Logout');
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const isActive = item.status === 'Active';
    const isBusy = busyId === item.id;

    return (
      <View style={styles.padded}>
      <View style={[styles.employeeCard, isBusy && { opacity: 0.6 }]}>
        <View style={styles.employeeTop}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
            <Text style={styles.avatarText}>{initials(item.name)}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.employeeName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.employeePosition} numberOfLines={1}>{item.position}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.salaryText}>฿{formatMoney(item.salary)}</Text>
            <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeLeave]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#22C55E' : '#F59E0B' }]} />
              <Text style={[styles.statusText, { color: isActive ? '#15803D' : '#B45309' }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.toggleButton]}
            onPress={() => handleToggleStatus(item.id)}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={16} color="#4F46E5" />
                <Text style={[styles.actionText, { color: '#4F46E5' }]}>Toggle Status</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
            disabled={isBusy}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    );
  };

  const totalClustered = clusters?.reduce((sum, cluster) => sum + cluster.count, 0) || 0;

  const header = (
    <View>
      {/* Hero + stats */}
      <LinearGradient colors={['#1E1B4B', '#4338CA', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.centered}>
          <View style={styles.heroTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.heroIcon}>
                <Ionicons name="people" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.heroTitle}>HR Dashboard</Text>
                <Text style={styles.heroSubtitle}>Employee & Salary Management</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatCard icon="people-outline" label="Total" value={String(stats.total)} />
            <StatCard icon="checkmark-circle-outline" label="Active" value={String(stats.active)} />
            <StatCard icon="airplane-outline" label="On Leave" value={String(stats.onLeave)} />
            <StatCard icon="cash-outline" label="Avg. Salary" value={`฿${formatMoney(Math.round(stats.avg))}`} />
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.padded, styles.panels]}>
        {/* Add Employee form */}
        <View style={[styles.section, styles.panel]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="person-add-outline" size={18} color="#4F46E5" />
            </View>
            <Text style={styles.sectionTitle}>Add Employee</Text>
          </View>

          <FormInput icon="person-outline" value={name} onChangeText={setName} placeholder="Name" />
          <FormInput icon="briefcase-outline" value={position} onChangeText={setPosition} placeholder="Position" />
          <FormInput icon="cash-outline" value={salary} onChangeText={setSalary} placeholder="Salary" keyboardType="numeric" />

          <TouchableOpacity onPress={handleAdd} disabled={isSubmitting} activeOpacity={0.85}>
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Add Employee</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Salary analytics (K-Means) */}
        <View style={[styles.section, styles.panel, styles.analyticsPanel]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="analytics-outline" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Salary Analytics</Text>
              <Text style={styles.sectionHint}>K-Means clustering into 3 salary tiers</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleAnalyze} disabled={isAnalyzing} activeOpacity={0.85}>
            <LinearGradient
              colors={['#7C3AED', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryButton, isAnalyzing && { opacity: 0.7 }]}
            >
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Analyze Salary Structure</Text>
            </LinearGradient>
          </TouchableOpacity>

          {isAnalyzing && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Analyzing salary structure...</Text>
            </View>
          )}

          {!clusters && !isAnalyzing && (
            <View style={styles.placeholderBox}>
              <Ionicons name="bar-chart-outline" size={28} color="#C4B5FD" />
              <Text style={styles.placeholderText}>กดปุ่มด้านบนเพื่อวิเคราะห์โครงสร้างเงินเดือน</Text>
            </View>
          )}

          {clusters && !isAnalyzing && (
            clusters.length === 0 ? (
              <Text style={styles.emptyText}>ไม่มีข้อมูลเงินเดือนให้วิเคราะห์</Text>
            ) : (
              <View style={styles.clusterList}>
                {clusters.map((cluster, i) => {
                  const tier = TIER_STYLES[i] || TIER_STYLES[TIER_STYLES.length - 1];
                  const share = totalClustered ? cluster.count / totalClustered : 0;
                  return (
                    <View
                      key={cluster.group}
                      style={[styles.clusterCard, { backgroundColor: tier.bg, borderColor: tier.border }]}
                    >
                      <View style={styles.clusterHeader}>
                        <View style={[styles.clusterIcon, { backgroundColor: tier.color }]}>
                          <Ionicons name={tier.icon} size={14} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.clusterTier, { color: tier.color }]}>{cluster.group}</Text>
                      </View>
                      <Text style={styles.clusterLabel}>{tier.label}</Text>

                      <Text style={styles.clusterCount}>
                        {cluster.count} <Text style={styles.clusterLabel}>คน</Text>
                      </Text>

                      <Text style={styles.clusterLabel}>Avg. Salary</Text>
                      <Text style={styles.clusterValue} numberOfLines={1} adjustsFontSizeToFit>
                        ฿{formatMoney(Math.round(cluster.centroid))}
                      </Text>

                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${share * 100}%`, backgroundColor: tier.color }]} />
                      </View>
                      <Text style={styles.clusterLabel}>{Math.round(share * 100)}%</Text>
                    </View>
                  );
                })}
              </View>
            )
          )}
        </View>
      </View>

      <View style={[styles.padded, styles.listHeader]}>
        <Text style={styles.listTitle}>Employees</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{employees.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <View style={styles.fullLoading}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : (
          <FlatList
            style={{ backgroundColor: '#F1F5F9' }}
            data={employees}
            keyExtractor={(item) => item.id}
            renderItem={renderEmployee}
            ListHeaderComponent={header}
            ListEmptyComponent={
              <View style={[styles.centered, styles.placeholderBox]}>
                <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>ยังไม่มีพนักงานในระบบ</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  fetchEmployees();
                }}
              />
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color="#C7D2FE" />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FormInput({
  icon,
  ...props
}: { icon: keyof typeof Ionicons.glyphMap } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={18} color="#94A3B8" style={{ marginRight: 10 }} />
      <TextInput style={styles.input} placeholderTextColor="#94A3B8" {...props} />
    </View>
  );
}

const shadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1B4B' },
  centered: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  padded: { width: '100%', maxWidth: MAX_WIDTH + 32, alignSelf: 'center', paddingHorizontal: 16 },
  fullLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F8FAFC' },

  hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 56 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: '#C7D2FE', fontSize: 13, marginTop: 2 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  logoutText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  statCard: {
    flexGrow: 1, flexBasis: 140, backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 16, padding: 14, gap: 4,
  },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '600' },

  panels: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16, marginTop: -36 },
  panel: { flexGrow: 1, flexBasis: 320 },
  analyticsPanel: { paddingHorizontal: 10 },
  section: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, ...shadow },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: { padding: 8, borderRadius: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  sectionHint: { fontSize: 12, color: '#64748B', marginTop: 2 },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 48, marginBottom: 10,
  },
  input: { flex: 1, fontSize: 15, color: '#0F172A', height: '100%' },
  primaryButton: {
    borderRadius: 12, paddingVertical: 14, marginTop: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  loadingText: { color: '#64748B', fontSize: 14 },
  placeholderBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  placeholderText: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },

  clusterList: { flexDirection: 'column', gap: 10, marginTop: 14 },
  clusterCard: { width: '100%', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1 },
  clusterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clusterIcon: { padding: 4, borderRadius: 6 },
  clusterTier: { fontSize: 15, fontWeight: '800' },
  clusterCount: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 6 },
  clusterLabel: { fontSize: 11, color: '#64748B' },
  clusterValue: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.08)', overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', borderRadius: 999 },

  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 4 },
  listTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  countPill: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  countPillText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },

  employeeCard: {
    backgroundColor: '#FFFFFF', marginTop: 10, padding: 14, borderRadius: 18, ...shadow,
  },
  employeeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  employeeName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  employeePosition: { fontSize: 13, color: '#64748B', marginTop: 2 },
  salaryText: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeLeave: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 40, borderRadius: 10,
  },
  toggleButton: { backgroundColor: '#EEF2FF' },
  deleteButton: { backgroundColor: '#FEF2F2' },
  actionText: { fontSize: 13, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 8 },
});
