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
      <Stack.Screen name="customer/profile" />
      <Stack.Screen name="customer/edit-profile" />
      <Stack.Screen name="customer/choose-mechanic.tsx" />
      <Stack.Screen name="customer/map-mechanics.tsx" />
      <Stack.Screen name="customer/send-request.tsx" />
      <Stack.Screen name="mechanic/requests-inbox.tsx" />
      <Stack.Screen name="mechanic/map-view.tsx" />
      <Stack.Screen name="home/index" />
      <Stack.Screen name="mechanic/edit-profile.tsx" />
    </Stack>
      
  )
}

export default RootLayout

const styles = StyleSheet.create({})