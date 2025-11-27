import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const About = () => {
  return (
    <View style={styles.container}>
      <Text>About</Text>
      <Link href="/" style={styles.link}>Go back to home</Link>
      <Link href="/contact" style={styles.link}>Go contact</Link>
    </View>
  )
}

export default About

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