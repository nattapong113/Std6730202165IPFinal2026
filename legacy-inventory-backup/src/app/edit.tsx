import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, isAdmin } = useAuth();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  // หน้านี้แก้ไข/ลบข้อมูลได้ จึงอนุญาตเฉพาะ admin เท่านั้น (กันกรณี user พิมพ์ URL เข้ามาตรงๆ)
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/products');
    }
  }, [isAdmin]);

  // State สำหรับเก็บข้อมูลฟอร์ม
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'link' | 'file'>('link');
  const [imageFile, setImageFile] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ค่าที่ไม่ได้แก้ในฟอร์มนี้ แต่ต้องส่งกลับไปเพื่อไม่ให้ข้อมูลเดิมหาย
  const [brand, setBrand] = useState('');
  const [orderName, setOrderName] = useState('');

  // URL ของ API เซิร์ฟเวอร์มหาลัย
  const API_BASE_URL = 'http://119.59.102.161:3017/api';

  // ดึงข้อมูลสินค้าเดิมมาแสดงในฟอร์ม
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setName(data.name || '');
        setDescription(data.sizes || '');
        setCategory(data.category?.toString() || '');
        setPrice(data.price?.toString() || '');
        setStock(data.stock?.toString() || '');
        setItemCode(data.productCode || '');
        if (typeof data.image === 'string' && data.image.startsWith('data:')) {
          const mimeMatch = data.image.match(/^data:([^;]+);base64,(.*)$/s);
          setImageMode('file');
          setImageFile({
            uri: data.image,
            mimeType: mimeMatch?.[1] || 'image/jpeg',
            base64: mimeMatch?.[2] || '',
          });
        } else {
          setImageMode('link');
          setImageUrl(data.image || '');
        }
        setBrand(data.brand || '');
        setOrderName(data.orderName || '');
      } catch (error) {
        console.error('Error fetching product:', error);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // ฟังก์ชันสำหรับเปิดคลังรูปภาพให้เลือกไฟล์จากเครื่อง
  const pickImageFromDevice = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์เข้าถึงรูปภาพ', 'กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพเพื่อเลือกไฟล์');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์รูปภาพที่เลือกได้');
      return;
    }

    setImageFile({
      base64: asset.base64,
      mimeType: asset.mimeType || 'image/jpeg',
      uri: asset.uri,
    });
  };

  // แปลงรูปที่เลือกไว้ (ลิงก์ หรือ ไฟล์) ให้เป็นค่าที่จะส่งไปเก็บในฟิลด์ image
  const getImageValue = () => {
    if (imageMode === 'file' && imageFile) {
      return imageFile.uri.startsWith('data:') ? imageFile.uri : `data:${imageFile.mimeType};base64,${imageFile.base64}`;
    }
    return imageUrl;
  };

  // ฟังก์ชันสำหรับส่งข้อมูลที่แก้ไขไปยัง Backend
  const handleUpdateProduct = async () => {
    if (!name || !category || !stock) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name,
          stock: parseInt(stock),
          category: parseInt(category) || 1,
          image: getImageValue() || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop',
          status: parseInt(stock) > 5 ? 'Active' : 'Low in stock',
          price: parseFloat(price) || 0,
          sizes: description,
          productCode: itemCode,
          brand: brand,
          orderName: orderName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      Alert.alert('สำเร็จ', 'แก้ไขสินค้าเรียบร้อยแล้ว!');
      router.replace('/products');

    } catch (error: any) {
      console.error('Error updating product:', error);
      Alert.alert('เกิดข้อผิดพลาด', `บันทึกข้อมูลล้มเหลว: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันสำหรับลบสินค้าจริง (เรียกหลังจากยืนยันแล้ว)
  const performDelete = async () => {
    console.log('[delete] start, id =', id);
    setIsDeleting(true);

    // ตั้ง timeout ไว้ เผื่อ request ค้าง (ไม่มี response กลับมาเลย) จะได้ไม่หมุนรอเงียบๆ ตลอดไป
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('[delete] response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      console.log('[delete] success, navigating to /products');
      if (Platform.OS === 'web') {
        window.alert('ลบสินค้าเรียบร้อยแล้ว!');
      } else {
        Alert.alert('สำเร็จ', 'ลบสินค้าเรียบร้อยแล้ว!');
      }
      router.replace('/products');
    } catch (error: any) {
      clearTimeout(timeoutId);
      const message = error?.name === 'AbortError'
        ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (หมดเวลารอ 10 วินาที) — เซิร์ฟเวอร์อาจไม่ได้เปิดอยู่ หรือ endpoint ลบสินค้ายังไม่ถูก deploy'
        : `ลบสินค้าล้มเหลว: ${error.message}`;
      console.error('[delete] error:', error);
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // ฟังก์ชันสำหรับยืนยันก่อนลบสินค้า (Alert.alert แบบหลายปุ่มใช้ไม่ได้บนเว็บ จึงต้องแยกใช้ window.confirm)
  const handleDeleteProduct = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`คุณต้องการลบ "${name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      'ยืนยันการลบสินค้า',
      `คุณต้องการลบ "${name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบ', style: 'destructive', onPress: performDelete },
      ]
    );
  };

  if (!isAdmin) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/products')} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Product Details</Text>

              {/* Product Name */}
              <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ASUS ROG Strix XG27AQ"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              {/* Image (เลือกได้ระหว่างใส่ลิงก์ หรือเลือกไฟล์รูปจากเครื่อง) */}
              <Text style={styles.label}>Image (Optional)</Text>
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[styles.categoryOption, imageMode === 'link' && styles.categoryOptionActive]}
                  onPress={() => setImageMode('link')}
                >
                  <Text style={[styles.categoryOptionText, imageMode === 'link' && styles.categoryOptionTextActive]}>
                    Link รูปภาพ
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.categoryOption, imageMode === 'file' && styles.categoryOptionActive]}
                  onPress={() => setImageMode('file')}
                >
                  <Text style={[styles.categoryOptionText, imageMode === 'file' && styles.categoryOptionTextActive]}>
                    เลือกไฟล์รูป
                  </Text>
                </TouchableOpacity>
              </View>

              {imageMode === 'link' ? (
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={colors.textMuted}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                />
              ) : (
                <View style={{ marginBottom: 20 }}>
                  <TouchableOpacity style={styles.filePickButton} onPress={pickImageFromDevice}>
                    <Ionicons name="image-outline" size={20} color="#2563EB" />
                    <Text style={styles.filePickButtonText}>
                      {imageFile ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพจากเครื่อง'}
                    </Text>
                  </TouchableOpacity>
                  {imageFile && (
                    <Image source={{ uri: imageFile.uri }} style={styles.imagePreview} />
                  )}
                </View>
              )}

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter product description..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              {/* Category */}
              <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[styles.categoryOption, category === '1' && styles.categoryOptionActive]}
                  onPress={() => setCategory('1')}
                >
                  <Text style={[styles.categoryOptionText, category === '1' && styles.categoryOptionTextActive]}>
                    Standard Monitor
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.categoryOption, category === '2' && styles.categoryOptionActive]}
                  onPress={() => setCategory('2')}
                >
                  <Text style={[styles.categoryOptionText, category === '2' && styles.categoryOptionTextActive]}>
                    Gaming Monitor
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price & Stock Row */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Stock Level <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                  />
                </View>
              </View>

              {/* Item Code */}
              <Text style={styles.label}>Item Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ASUS-XG27AQ"
                placeholderTextColor={colors.textMuted}
                value={itemCode}
                onChangeText={setItemCode}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleUpdateProduct}
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && { opacity: 0.7 }]}
              onPress={handleDeleteProduct}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Delete Product</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* แถบเมนูด้านล่าง */}
      <BottomNav activeScreen="products" />
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
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
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  categoryOption: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryOptionTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  inputNoMargin: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  col: {
    flex: 1,
  },
  filePickButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    gap: 8,
  },
  filePickButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
