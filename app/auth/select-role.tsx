import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { router } from 'expo-router'

const SelectRole = () => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔧</Text>
          </View>
          <Text style={styles.header}>Create an Account</Text>
          <Text style={styles.subtitle}>Choose your account type to get started</Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {/* Customer Card */}
          <TouchableOpacity 
            style={styles.roleCard}
            onPress={() => router.push("/auth/signup-customer")}
            activeOpacity={0.7}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>👤</Text>
            </View>
            <Text style={styles.roleTitle}>I'm a Customer</Text>
            <Text style={styles.roleDescription}>
              Find and book trusted mechanics for your vehicle repairs
            </Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>Find nearby mechanics</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>Read reviews & ratings</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>Book appointments easily</Text>
              </View>
            </View>
            <View style={styles.cardButton}>
              <Text style={styles.cardButtonText}>Sign Up as Customer</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Mechanic Card */}
          <TouchableOpacity 
            style={[styles.roleCard, styles.mechanicCard]}
            onPress={() => router.push("/auth/signup-mechanic")}
            activeOpacity={0.7}
          >
            <View style={[styles.roleIconContainer, styles.mechanicIconContainer]}>
              <Text style={styles.roleIcon}>🔧</Text>
            </View>
            <Text style={styles.roleTitle}>I'm a Mechanic</Text>
            <Text style={styles.roleDescription}>
              Grow your business by connecting with customers who need your services
            </Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>Get more customers</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>Manage bookings</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>Build your reputation</Text>
              </View>
            </View>
            <View style={[styles.cardButton, styles.mechanicButton]}>
              <Text style={styles.cardButtonText}>Sign Up as Mechanic</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

export default SelectRole

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 40,
  },
  header: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    color: "#6b6b6b",
    paddingHorizontal: 20,
  },
  rolesContainer: {
    flex: 1,
    gap: 20,
  },
  roleCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#1E90FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mechanicCard: {
    borderColor: "#FF6B35",
  },
  roleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mechanicIconContainer: {
    backgroundColor: "#FFE8E0",
  },
  roleIcon: {
    fontSize: 32,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 15,
    color: "#6b6b6b",
    lineHeight: 22,
    marginBottom: 20,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkmark: {
    fontSize: 16,
    color: "#4CAF50",
    marginRight: 10,
    fontWeight: "700",
  },
  featureText: {
    fontSize: 14,
    color: "#4a4a4a",
  },
  cardButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mechanicButton: {
    backgroundColor: "#FF6B35",
  },
  cardButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  arrow: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  loginLink: {
    marginTop: 30,
    alignItems: "center",
  },
  loginText: {
    fontSize: 15,
    color: "#6b6b6b",
  },
  loginTextBold: {
    color: "#1E90FF",
    fontWeight: "700",
  },
})