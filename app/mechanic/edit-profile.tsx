import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function MechanicEditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");

  const router = useRouter();

  const loadProfile = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("mechanics")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (error) {
      Alert.alert("Error loading profile", error.message);
      setLoading(false);
      return;
    }

    setProfile(data);
    setName(data.name);
    setPhone(data.phone);
    setServiceType(data.service_type);

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveChanges = async () => {
    if (saving) return;

    if (!name || !phone || !serviceType) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("mechanics")
      .update({
        name,
        phone,
        service: serviceType,
        // updated_at: new Date(),
      })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }

    Alert.alert("Success", "Profile updated!");
    router.back();
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

      <TextInput
        style={styles.input}
        placeholder=" Full name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder=" Phone number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TextInput
        style={styles.input}
        placeholder=" Service type"
        value={serviceType}
        onChangeText={setServiceType}
      />

      <TouchableOpacity
        style={[styles.button, saving && { opacity: 0.5 }]}
        disabled={saving}
        onPress={saveChanges}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#1E90FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
