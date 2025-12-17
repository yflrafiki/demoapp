import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function MechanicSignup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const limited = cleaned.slice(0, 10);
    setPhone(limited);
  };

  const handleSignup = async () => {
    if (loading) return;
    setLoading(true);
    
    if (!name || !phone || !service || !password) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Invalid Phone", "Phone number must be exactly 10 digits");
      setLoading(false);
      return;
    }

    try {
      const usedEmail = email?.trim() || `${phone}@mech.auto`;
      const { data, error } = await supabase.auth.signUp({ email: usedEmail, password });
      if (error) throw error;
      const authId = data.user?.id;

      await supabase.from("mechanics").insert({
        auth_id: authId,
        name,
        phone,
        specialization: service,
        is_available: true,
        lat: null,
        lng: null
      });

      router.replace("/mechanic/dashboard");
    } catch (err: any) {
      Alert.alert("Signup Error", err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🔧</Text>
            </View>
            <Text style={styles.header}>Create Mechanic Account</Text>
            <Text style={styles.subtitle}>Grow your business and reach more customers</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10 digit phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  maxLength={10}
                />
              </View>
              <Text style={styles.inputHint}>
                {phone.length}/10 digits
              </Text>
            </View>

            {/* Service/Specialization Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Service Specialization</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>⚙️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Engine repair, Brake service"
                  placeholderTextColor="#999"
                  value={service}
                  onChangeText={setService}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Input (Optional) */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.inputHint}>
                {email ? "Email will be used for login" : "If not provided, you'll use phone number to login"}
              </Text>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a strong password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                Minimum 6 characters required
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Mechanic Account</Text>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Your phone number will be used for customer communication and as your login username
              </Text>
            </View>

            {/* Terms Text */}
            <Text style={styles.termsText}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>

            {/* Login Link */}
            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginTextBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE8E0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b6b6b",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  formSection: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  optionalBadge: {
    fontSize: 11,
    color: "#999",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  inputHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E8F4FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1a5490",
    lineHeight: 18,
  },
  termsText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  loginLink: {
    alignItems: "center",
  },
  loginText: {
    fontSize: 15,
    color: "#6b6b6b",
  },
  loginTextBold: {
    color: "#FF6B35",
    fontWeight: "700",
  },
});