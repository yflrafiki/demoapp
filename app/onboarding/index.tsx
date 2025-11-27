import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import { router } from 'expo-router'

const Onboarding = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find trusted mechanics near you</Text>
      <Text style={styles.subtitle}>Fast, reliable and affordable car repair services </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
        <Text style={styles.buttonText}>Get Started</Text>

      </TouchableOpacity>
    </View>
  )
}

export default Onboarding

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,

    },

    title:{
        marginTop: 24,
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        color: "#000",
    },
    subtitle: {
marginTop: 10,
textAlign: "center",
fontSize: 16,
color: "#6b6b6b",
},
button: {
marginTop: 40,
backgroundColor: "#1E90FF",
paddingVertical: 14,
paddingHorizontal: 36,
borderRadius: 12,
},
buttonText: {
fontSize: 18,
color: "#fff",
fontWeight: "600",
},
})