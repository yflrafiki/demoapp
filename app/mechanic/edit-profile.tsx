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
  const [specialization, setSpecialization] = useState("");

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
    setSpecialization(data.specialization)

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveChanges = async () => {
    if (saving) return;

    if (!name?.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }

    if (!phone?.trim()) {
      Alert.alert("Missing Phone", "Please enter your phone number.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("mechanics")
        .update({
          name: (name || "").trim(),
          phone: (phone || "").trim(),
          specialization: specialization.trim(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      Alert.alert("Success", "Profile updated!");
      router.back();
    } catch (err: any) {
      Alert.alert("Update failed", err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={name || ""}
            onChangeText={setName}
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            value={phone || ""}
            onChangeText={setPhone}
            editable={!saving}
          />
        </View>

        <View style={styles.section}>
  <Text style={styles.sectionLabel}>Specialization</Text>
  <TextInput
    style={styles.input}
    placeholder="e.g., General Repair, Tire Service"
    value={specialization || ""}
    onChangeText={setSpecialization}
    editable={!saving}
  />
</View>

        <TouchableOpacity
          style={[styles.button, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={saveChanges}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          disabled={saving}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  backBtn: {
    color: "#1E90FF",
    fontWeight: "600",
    fontSize: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },

  content: {
    padding: 16,
  },

  section: {
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#333",
  },

  button: {
    backgroundColor: "#1E90FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  cancelButton: {
    backgroundColor: "#f0f0f0",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
});
