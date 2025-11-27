import { ScrollView, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const Home = () => {
  return (
    <View style={styles.container}>
      <Text>Home</Text>

      <ScrollView>
        
      </ScrollView>
      
      {/* <Link href="/about" style={styles.subtitle}>Go to About</Link>
      <Link href="/contact" style={styles.subtitle}>Go to Contact</Link> */}
    </View>
  )
}

export default Home

const styles = StyleSheet.create({
    container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#414a4c',
    },

    subtitle:{
        fontSize: 20,
        marginBottom: 20,
        color: 'blue',
        marginTop: 20,
    },

    
})