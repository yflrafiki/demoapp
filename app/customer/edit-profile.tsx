import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function EditCustomerProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!profile?.name?.trim() || !profile?.phone?.trim() || !profile?.car_type?.trim()) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          car_type: profile.car_type.trim(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      Alert.alert("Success", "Profile updated!");
      router.back(); // go back to profile
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || String(err));
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
      <Text style={styles.header}>Edit Profile</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={profile?.name || ""}
        onChangeText={(t) => setProfile({ ...profile, name: t })}
        style={styles.input}
        editable={!saving}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        value={profile?.phone || ""}
        onChangeText={(t) => setProfile({ ...profile, phone: t })}
        style={styles.input}
        keyboardType="phone-pad"
        editable={!saving}
      />

      <Text style={styles.label}>Car Type</Text>
      <TextInput
        value={profile?.car_type || ""}
        onChangeText={(t) => setProfile({ ...profile, car_type: t })}
        style={styles.input}
        editable={!saving}
      />

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.saveText}>
          {saving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#fff" 
},
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
},
  header: { 
    fontSize: 26, 
    fontWeight: "700", 
    marginBottom: 20 
},
  label: { 
    marginTop: 15, 
    fontSize: 14, 
    color: "#444" 
},
  input: {
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: "#1E90FF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
