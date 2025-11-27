import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    if (!emailOrPhone || !password) {
      Alert.alert("Enter credentials");
      setLoading(false);
      return;
    }

    try {
      let email = emailOrPhone;

      // Map phone number to fallback email if needed (mechanic signup path)
      if (/^\d+$/.test(emailOrPhone)) {
        email = `${emailOrPhone}@mech.auto`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const userId = data.user.id;

      // Check customer profile
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_id", userId)
        .limit(1);

      if (customers?.length) {
        router.replace("/customer/customer-dashboard");
        return;
      }

      // Check mechanic profile
      const { data: mechanics } = await supabase
        .from("mechanics")
        .select("*")
        .eq("auth_id", userId)
        .limit(1);

      if (mechanics?.length) {
        router.replace("/mechanic/dashboard");
        return;
      }

      Alert.alert("No profile linked");
    } catch (err: any) {
      Alert.alert("Login error", err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email or Phone"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      {/* NEW TEXT ADDED BELOW BUTTON */}
      <TouchableOpacity onPress={() => router.push("/auth/select-role")}>
        <Text style={styles.link}>
          Don't have an account? <Text style={styles.linkBold}>Create one</Text>
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:24, justifyContent:"center", backgroundColor:"#fff" },
  header:{ fontSize:28, fontWeight:"700", marginBottom:20, textAlign:"center" },
  input:{ borderWidth:1, borderColor:"#ccc", padding:12, borderRadius:8, marginBottom:12 },
  button:{ backgroundColor:"#1E90FF", padding:14, borderRadius:8, alignItems:"center" },
  buttonText:{ color:"#fff", fontWeight:"700" },

  link: {
    marginTop: 18,
    textAlign: "center",
    color: "#555",
    fontSize: 14,
  },
  linkBold: {
    color: "#1E90FF",
    fontWeight: "700",
  }
});
