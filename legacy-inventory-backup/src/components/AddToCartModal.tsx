import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useAppTheme } from '../context/ThemeContext';

interface AddToCartModalProps {
  visible: boolean;
  product: any;
  onClose: () => void;
  onAdded?: () => void;
}

export default function AddToCartModal({ visible, product, onClose, onAdded }: AddToCartModalProps) {
  const { addToCart, getCartQuantity } = useCart();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [quantity, setQuantity] = useState(1);

  // รีเซ็ตจำนวนทุกครั้งที่เปิด modal ใหม่สำหรับสินค้าชิ้นอื่น
  useEffect(() => {
    if (visible) setQuantity(1);
  }, [visible, product?.id]);

  if (!product) return null;

  const stock = Number(product.stock || 0);
  const alreadyInCart = getCartQuantity(product.id);
  const availableToAdd = Math.max(stock - alreadyInCart, 0);
  const price = Number(product.price || 0);
  const total = price * quantity;

  const changeQuantity = (delta: number) => {
    setQuantity((q) => Math.min(Math.max(q + delta, 1), Math.max(availableToAdd, 1)));
  };

  const handleAdd = () => {
    addToCart(product, quantity);

    const message = `เพิ่ม "${product.name}" จำนวน ${quantity} ชิ้น ลงตะกร้าแล้ว`;
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('สำเร็จ', message);
    }

    onAdded?.();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>เพิ่มลงตะกร้า</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.stockText}>
            คงเหลือ {stock} ชิ้น{alreadyInCart > 0 ? ` • มีในตะกร้าแล้ว ${alreadyInCart} ชิ้น` : ''} • ฿{price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ชิ้น
          </Text>

          {availableToAdd === 0 ? (
            <View style={styles.soldOutBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.soldOutText}>
                {stock === 0 ? 'สินค้าหมด' : 'คุณเพิ่มสินค้านี้ลงตะกร้าครบตามจำนวนคงเหลือแล้ว'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
                  onPress={() => changeQuantity(-1)}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={20} color={quantity <= 1 ? colors.textMuted : '#2563EB'} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, quantity >= availableToAdd && styles.qtyButtonDisabled]}
                  onPress={() => changeQuantity(1)}
                  disabled={quantity >= availableToAdd}
                >
                  <Ionicons name="add" size={20} color={quantity >= availableToAdd ? colors.textMuted : '#2563EB'} />
                </TouchableOpacity>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ยอดรวม</Text>
                <Text style={styles.totalValue}>
                  ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.confirmButton, availableToAdd === 0 && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={availableToAdd === 0}
          >
            <Ionicons name="cart" size={18} color="#FFFFFF" />
            <Text style={styles.confirmButtonText}>เพิ่มลงตะกร้า</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  stockText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 24,
  },
  soldOutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  soldOutText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonDisabled: {
    backgroundColor: colors.borderLight,
    borderColor: colors.border,
  },
  qtyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },
  confirmButton: {
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
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
