import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';

function RootNavigation() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    if (!token && pathname !== '/' && pathname !== '/register') {
      router.replace('/');
    }
  }, [token, pathname]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="home" />
      <Stack.Screen name="products" />
      <Stack.Screen name="add" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="detail" />
      {/* เพิ่ม 3 หน้าใหม่ที่เราเพิ่งสร้างเข้าไป */}
      <Stack.Screen name="categories" />
      <Stack.Screen name="finances" />
      <Stack.Screen name="stores" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="orders" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RootNavigation />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
