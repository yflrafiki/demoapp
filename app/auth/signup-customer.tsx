import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function CustomerSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [carType, setCarType] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (loading) return;
    setLoading(true);

    if (!name || !email || !phone || !carType || !password) {
      Alert.alert("Missing fields", "Please fill all fields.");
      setLoading(false);
      return;
    }

    try {
      // 1️⃣ Create Supabase Auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: "customer" } // optional metadata
        }
      });

      if (error) throw error;

      const authId = data.user?.id;
      if (!authId) throw new Error("Auth user ID missing.");

      // 2️⃣ Insert customer into DB
      const { error: insertError } = await supabase.from("customers").insert({
        auth_id: authId,
        name,
        email,
        phone,
        car_type: carType,
      });

      if (insertError) throw insertError;

      // 3️⃣ Supabase signs user in automatically if email confirmation is disabled
      router.replace("/customer/customer-dashboard");

    } catch (err: any) {
      Alert.alert("Signup Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Customer Signup</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TextInput
        style={styles.input}
        placeholder="Car type"
        value={carType}
        onChangeText={setCarType}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/login")}>
                    <Text style={styles.link}>
                      Have an Account? <Text style={styles.linkBold}>Login</Text>
                    </Text>
                  </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#fff" },
  header: { fontSize: 28, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: "#1E90FF", padding: 14, borderRadius: 8, alignItems: "center" },
  link: {
    marginTop: 18,
    textAlign: "center",
    color: "#555",
    fontSize: 14,
  },
  linkBold: {
    color: "#1E90FF",
    fontWeight: "700",
  },

  buttonText: { color: "#fff", fontWeight: "700" },
});
