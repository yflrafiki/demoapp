import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
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
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, "");
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    setPhone(limited);
  };

  const handleSignup = async () => {
    if (loading) return;
    setLoading(true);
    
    if (!name || !phone || !service || !password) {
      Alert.alert("Missing fields", "Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Invalid phone", "Phone number must be exactly 10 digits");
      setLoading(false);
      return;
    }

    try {
      // Use email if provided, otherwise create fallback email
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
      Alert.alert("Signup error", err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mechanic Signup</Text>
      <TextInput 
        style={[styles.input, { color: "#000" }]} 
        placeholder="Full name" 
        placeholderTextColor="#999"
        value={name} 
        onChangeText={setName} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Phone (10 digits)" 
        placeholderTextColor="#999"
        keyboardType="phone-pad" 
        value={phone} 
        onChangeText={handlePhoneChange}
        maxLength={10}
      />
      <TextInput 
        style={styles.input} 
        placeholder="Service" 
        placeholderTextColor="#999"
        value={service} 
        onChangeText={setService} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Email (optional)" 
        placeholderTextColor="#999"
        value={email} 
        onChangeText={setEmail} 
        keyboardType="email-address" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        placeholderTextColor="#999"
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={handleSignup} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Mechanic</Text>}
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
  container:{flex:1, padding:24, justifyContent:"center", backgroundColor:"#fff"},
  header:{fontSize:28,fontWeight:"700", marginBottom:20, textAlign:"center"},
  input:{borderWidth:1,borderColor:"#ccc",padding:12,borderRadius:8,marginBottom:12},
  button:{backgroundColor:"#1E90FF",padding:14,borderRadius:8, alignItems:"center"},
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
  buttonText:{color:"#fff", fontWeight:"700"}
});