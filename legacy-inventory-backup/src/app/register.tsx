import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(username, password);
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Background Graphic Decoration */}
      <View style={styles.bgCircleTop} />
      <View style={styles.bgCircleBottom} />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.card}>
          {/* Logo / App Name */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="person-add" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up for Jett Dash</Text>
          </View>

          {/* Register Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm Password"
                secureTextEntry
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Sign Up</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  bgCircleTop: {
    position: 'absolute', width: 300, height: 300,
    backgroundColor: '#2563EB', borderRadius: 150,
    top: -100, right: -100, opacity: 0.2,
  },
  bgCircleBottom: {
    position: 'absolute', width: 400, height: 400,
    backgroundColor: '#3B82F6', borderRadius: 200,
    bottom: -150, left: -150, opacity: 0.1,
  },
  backButton: {
    position: 'absolute', top: 60, left: 24, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24, padding: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    backgroundColor: '#2563EB', padding: 16,
    borderRadius: 20, marginBottom: 16,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '500' },
  formContainer: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 20, paddingHorizontal: 16, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#0F172A', fontSize: 16, fontWeight: '500' },
  registerButton: {
    backgroundColor: '#2563EB', paddingVertical: 16,
    borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3,
    shadowRadius: 12, elevation: 6, gap: 8,
  },
  registerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  signInLink: { marginTop: 20, alignItems: 'center' },
  signInText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  signInTextBold: { color: '#2563EB', fontWeight: '700' },
});
