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
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formatMechanicPhoneToEmail = (input: string) => {
    // remove non-digits
    let phone = input.replace(/\D/g, "");

    // Ghana format: 024xxxxxxx → convert to email
    if (phone.length === 10 && phone.startsWith("0")) {
      return `${phone}@mech.auto`;
    }

    // If user typed full email already
    if (input.includes("@")) return input;

    // If digits only but not 10 digits
    return `${phone}@mech.auto`; 
  };

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      Alert.alert("Enter your details");
      return;
    }

    setLoading(true);

    try {
      await supabase.auth.signOut();
      
      let email = emailOrPhone.trim();

      // If mechanic is logging in with phone number — convert to mech email
      if (!email.includes("@")) {
        email = formatMechanicPhoneToEmail(emailOrPhone);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userId = data.user.id;

      // Check if customer
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_id", userId)
        .maybeSingle();

      if (customer) {
        router.replace("/customer/customer-dashboard");
        return;
      }

      // Check if mechanic
      const { data: mechanic } = await supabase
        .from("mechanics")
        .select("*")
        .eq("auth_id", userId)
        .maybeSingle();

      if (mechanic) {
        router.replace("/mechanic/dashboard");
        return;
      }

      Alert.alert("No profile found for this account");
    } catch (err: any) {
      Alert.alert("Login error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"   
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
      />

      <TextInput
        style={[styles.input, { color: "#000" }]}
        placeholder="Password"
        placeholderTextColor="#999"   
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />


      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
        onPress={handleLogin}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

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
  header:{ fontSize:28, fontWeight:"700", textAlign:"center", marginBottom:20 },
  input:{ borderWidth:1, borderColor:"#ccc", padding:12, borderRadius:8, marginBottom:12 },
  button:{ backgroundColor:"#1E90FF", padding:14, borderRadius:8, alignItems:"center" },
  buttonText:{ color:"#fff", fontWeight:"700" },
  link:{ marginTop:18, textAlign:"center", color:"#555" },
  linkBold:{ color:"#1E90FF", fontWeight:"700" }
});
