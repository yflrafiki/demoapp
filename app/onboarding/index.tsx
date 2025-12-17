import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { router } from 'expo-router'

const Onboarding = () => {
  const features = [
    {
      icon: '🔍',
      title: 'Find Mechanics',
      description: 'Browse verified mechanics in your area'
    },
    {
      icon: '⭐',
      title: 'Read Reviews',
      description: 'Check ratings from real customers'
    },
    {
      icon: '💰',
      title: 'Compare Prices',
      description: 'Get transparent quotes upfront'
    },
    {
      icon: '📅',
      title: 'Book Instantly',
      description: 'Schedule appointments with ease'
    }
  ]

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.iconContainer}>
          <Text style={styles.heroIcon}>🔧</Text>
        </View>
        <Text style={styles.title}>Find Trusted Mechanics Near You</Text>
        <Text style={styles.subtitle}>
          Connect with reliable, affordable car repair services in your area
        </Text>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>
          Join thousands of satisfied customers
        </Text>
      </View>
    </ScrollView>
  )
}

export default Onboarding

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    color: "#6b6b6b",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 13,
    color: "#6b6b6b",
    textAlign: "center",
    lineHeight: 18,
  },
  ctaSection: {
    alignItems: "center",
    marginTop: 20,
  },
  button: {
    backgroundColor: "#1E90FF",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
  },
  footerText: {
    marginTop: 16,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
})