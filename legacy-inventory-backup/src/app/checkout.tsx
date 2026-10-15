import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';
import { generatePromptPayPayload } from '../utils/promptpay';

const API_BASE_URL = 'http://119.59.102.161:3017/api';

// PromptPay ID (mobile number) ที่จะรับเงินจริงเมื่อลูกค้าสแกน QR
const PROMPTPAY_ID = '0954400809';

type Step = 'address' | 'payment';

export default function CheckoutScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [step, setStep] = useState<Step>('address');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // ถ้าตะกร้าว่าง (เช่น รีเฟรชหน้าตรงนี้ หรือกดเข้ามาตรงๆ) ให้เด้งกลับไปหน้าตะกร้า
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length]);

  const orderRef = useMemo(() => `ORD${Date.now().toString().slice(-8)}`, []);

  const qrPayload = useMemo(
    () => generatePromptPayPayload(PROMPTPAY_ID, totalPrice),
    [totalPrice]
  );

  const canContinue = fullName.trim() && phone.trim() && address.trim();

  const handleContinueToPayment = () => {
    if (!canContinue) {
      const message = 'กรุณากรอกชื่อผู้รับ เบอร์โทร และที่อยู่จัดส่งให้ครบถ้วน';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('แจ้งเตือน', message);
      return;
    }
    setStep('payment');
  };

  const handleConfirmPayment = async () => {
    setIsPaying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          shipping: { name: fullName.trim(), phone: phone.trim(), address: address.trim() },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `HTTP error! status: ${response.status}`);
      }

      clearCart();

      const message = 'ชำระเงินสำเร็จ! ติดตามสถานะการจัดส่งได้ที่หน้า Orders';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('สำเร็จ', message);

      router.replace('/orders');
    } catch (error: any) {
      const message = `ชำระเงินล้มเหลว: ${error.message}`;
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('เกิดข้อผิดพลาด', message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'payment' ? setStep('address') : router.replace('/cart'))}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        <View style={styles.stepItem}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepDotText}>1</Text>
          </View>
          <Text style={styles.stepLabelActive}>Address</Text>
        </View>
        <View style={[styles.stepLine, step === 'payment' && styles.stepLineActive]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepDot, step === 'payment' && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step !== 'payment' && styles.stepDotTextInactive]}>2</Text>
          </View>
          <Text style={step === 'payment' ? styles.stepLabelActive : styles.stepLabel}>Payment</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'address' ? (
          <>
            <Text style={styles.sectionTitle}>ที่อยู่จัดส่ง</Text>
            <View style={styles.formCard}>
              <Text style={styles.label}>ชื่อผู้รับ <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น สมชาย ใจดี"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>เบอร์โทรศัพท์ <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น 081-234-5678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>ที่อยู่จัดส่ง <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Text style={styles.sectionTitle}>สรุปคำสั่งซื้อ</Text>
            <View style={styles.formCard}>
              {items.map((item) => (
                <View key={item.id} style={styles.summaryLine}>
                  <Text style={styles.summaryItemName} numberOfLines={1}>
                    {item.name} x{item.quantity}
                  </Text>
                  <Text style={styles.summaryItemPrice}>
                    ฿{(item.price * item.quantity).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>ยอดรวมทั้งหมด</Text>
                <Text style={styles.summaryTotalValue}>
                  ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleContinueToPayment}>
              <Text style={styles.primaryButtonText}>ไปหน้าชำระเงิน</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>สแกนจ่ายเงิน</Text>
            <View style={styles.qrCard}>
              <Text style={styles.qrAmount}>
                ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.qrRef}>เลขที่อ้างอิง {orderRef}</Text>

              <View style={styles.qrImageWrap}>
                <QRCode value={qrPayload} size={220} />
              </View>

              <View style={styles.qrHintBox}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.qrHintText}>
                  สแกนด้วยแอปธนาคารเพื่อโอนเงินผ่าน PromptPay จริง
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryItemName}>จัดส่งถึง</Text>
                <Text style={styles.summaryItemPrice}>{fullName}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryItemName}>เบอร์โทร</Text>
                <Text style={styles.summaryItemPrice}>{phone}</Text>
              </View>
              <Text style={styles.addressPreview}>{address}</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isPaying && { opacity: 0.7 }]}
              onPress={handleConfirmPayment}
              disabled={isPaying}
            >
              {isPaying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>ฉันชำระเงินแล้ว</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
  },
  stepDotText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  stepDotTextInactive: {
    color: colors.textMuted,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  stepLabelActive: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 16,
  },
  textArea: {
    height: 90,
    paddingTop: 14,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryItemName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginRight: 8,
  },
  summaryItemPrice: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qrAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  qrRef: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 20,
  },
  qrImageWrap: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  qrHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  qrHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  addressPreview: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 20,
  },
});
