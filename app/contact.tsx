import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const Contact = () => {
  return (
    <View style={styles.container}>
      <Text>Contact</Text>
      <Link href="/" style={styles.link}>Go back to home</Link>
    </View>
  )
}

export default Contact

const styles = StyleSheet.create({
    container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    },
    link:{
        marginVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'blue',
        marginTop: 20,
    }
})