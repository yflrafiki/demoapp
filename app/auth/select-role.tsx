import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import { router, Router } from 'expo-router'

const SelectRole = () => {
  return (
    <View style={styles.container}>
      <Text>Create an Account</Text>
      <Text>Choose your account type</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/signup-customer")}>
        <Text style={styles.buttonText}>Sign Up as Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/signup-mechanic")}>
        <Text style={styles.buttonText}>Sign Up as Mechanic</Text>
      </TouchableOpacity>
    </View>
  )
}

export default SelectRole

const styles = StyleSheet.create({
    container: {
flex: 1,
justifyContent: "center",
backgroundColor: "#fff",
paddingHorizontal: 24,
},
header: {
fontSize: 32,
fontWeight: "700",
textAlign: "center",
},
sub: {
textAlign: "center",
fontSize: 16,
color: "#555",
marginBottom: 40,
},
button: {
backgroundColor: "#1E90FF",
paddingVertical: 14,
borderRadius: 10,
marginBottom: 20,
},
buttonText: {
color: "#fff",
fontSize: 18,
fontWeight: "600",
textAlign: "center",
},
})