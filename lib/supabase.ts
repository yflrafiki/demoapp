import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Fallback to process.env for Expo Go
const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // IMPORTANT for mobile apps!
    storage: AsyncStorage,     // IMPORTANT: Use AsyncStorage for session persistence
  },
});

// Helper function to handle auth errors
export const handleAuthError = async (error: any) => {
  if (error?.message?.includes('refresh') || error?.message?.includes('token') || error?.message?.includes('Invalid')) {
    await supabase.auth.signOut();
    return true; // Indicates auth error that requires re-login
  }
  return false;
};
