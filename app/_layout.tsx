import { StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import {  Stack, useRouter } from 'expo-router'
import 'react-native-url-polyfill/auto';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';


const RootLayout = () => {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const initRef = React.useRef(false);

  useEffect(() => {
    if (initRef.current) return; // Prevent running twice
    initRef.current = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('No session, showing onboarding');
          setInitialized(true);
          return;
        }

        console.log('Session found:', session.user.id);
        const userId = session.user.id;

        // Check customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_id', userId)
          .maybeSingle();

        if (customer) {
          console.log('Redirecting to customer dashboard');
          setInitialized(true);
          setTimeout(() => router.replace('/customer/customer-dashboard'), 100);
          return;
        }

        // Check mechanic
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('id')
          .eq('auth_id', userId)
          .maybeSingle();

        if (mechanic) {
          console.log('Redirecting to mechanic dashboard');
          setInitialized(true);
          setTimeout(() => router.replace('/mechanic/dashboard'), 100);
          return;
        }

        // No role yet
        console.log('Redirecting to role selection');
        setInitialized(true);
        setTimeout(() => router.replace('/auth/select-role'), 100);
      } catch (e) {
        console.error('Auth check error:', e);
        setInitialized(true);
      }
    };

    checkAuth();

    // Listen for signout only
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        router.replace('/onboarding/index');
      }
    });

    return () => subscription?.unsubscribe();
  }, [router]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="auth/select-role" />
      <Stack.Screen name="auth/signup-customer" />
      <Stack.Screen name="auth/signup-mechanic" />
      <Stack.Screen name="customer/customer-dashboard" />
      <Stack.Screen name="customer/choose-mechanic" />
      <Stack.Screen name="customer/send-request" />
      <Stack.Screen name="customer/profile" />
      <Stack.Screen name="customer/edit-profile" />
      <Stack.Screen name="mechanic/dashboard" />
      <Stack.Screen name="mechanic/navigation" />
      <Stack.Screen name="mechanic/map-view" />
      <Stack.Screen name="mechanic/requests-inbox" />
      <Stack.Screen name="mechanic/edit-profile" />
      <Stack.Screen name="mechanic/profile" />
      <Stack.Screen name="home/index" />
      <Stack.Screen name="about" />
      <Stack.Screen name="contact" />
    </Stack>
  )
}

export default RootLayout

const styles = StyleSheet.create({})