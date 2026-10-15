// backend รันอยู่บนเครื่องเซิร์ฟเวอร์อาจารย์ (ถ้าจะทดสอบกับ backend ในเครื่องตัวเอง ให้ตั้ง EXPO_PUBLIC_API_URL)
const DEFAULT_API_URL = 'http://119.59.102.161:3017/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
