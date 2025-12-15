// app/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { View, StyleSheet, Animated, Image, StatusBar } from 'react-native';

export default function IndexPage() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate icon entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    const checkAuth = async () => {
      // Small delay to ensure splash screen is visible
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/onboarding');
        return;
      }

      const userId = session.user.id;

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_id', userId)
        .maybeSingle();

      if (customer) {
        router.replace('/customer/customer-dashboard');
        return;
      }

      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('auth_id', userId)
        .maybeSingle();

      if (mechanic) {
        router.replace('/mechanic/dashboard');
        return;
      }

      router.replace('/auth/select-role');
    };

    checkAuth();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { rotate: rotate }
            ],
          },
        ]}
      >
        <Image
          source={require('../assets/splash_icon_svg.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 300,
    height: 300,
  },
});