import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootNavigation() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // ยังไม่ login -> เด้งกลับหน้า Login เสมอ
  useEffect(() => {
    if (!token && pathname !== '/') {
      router.replace('/');
    }
  }, [token, pathname]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
