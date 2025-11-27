import { StyleSheet } from 'react-native'
import React from 'react'
import {  Stack } from 'expo-router'
import 'react-native-url-polyfill/auto';


const RootLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="/login" />
      <Stack.Screen name="auth/signup-customer" />
      <Stack.Screen name="auth/signup-mechanic" />
      <Stack.Screen name="mechanic/dashboard.tsx" />
      <Stack.Screen name="auth/select-role.tsx" />
      <Stack.Screen name="customer/customer-dashboard.tsx" />
      <Stack.Screen name="home/index" />
    </Stack>
      
  )
}

export default RootLayout

const styles = StyleSheet.create({})