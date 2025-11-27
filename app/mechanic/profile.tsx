import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { account, databases, storage, DB_ID, MECHANIC_COLLECTION, BUCKET_ID } from "../../constants/Appwrite";
import { Query, ID } from "react-native-appwrite";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function MechanicProfile() {
  const [mechanic, setMechanic] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load mechanic profile
  const loadProfile = async () => {
    try {
      const user = await account.get();
      const res = await databases.listDocuments(DB_ID, MECHANIC_COLLECTION, [
        Query.equal("userId", user.$id),
      ]);

      if (res.documents.length) {
        const m = res.documents[0];
        setMechanic(m);
        setName(m.name || "");
        setPhone(m.phone || "");
        setServiceType(m.serviceType || "");
        setAvatar(m.avatarUrl || null);
      }
    } catch (err) {
      console.log("Load profile failed:", err);
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Pick Image
  const pickImage = async () => {
    let permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "You must allow access to photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  // Upload image to Appwrite Storage
  const uploadImage = async (image: any) => {
    setUploading(true);

    try {
      const file = {
        uri: image.uri,
        name: `avatar-${ID.unique()}.jpg`,
        type: "image/jpeg",
      };

      const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);

      const previewUrl = storage.getFilePreview(BUCKET_ID, uploaded.$id);

      setAvatar(previewUrl.href);
    } catch (err) {
      console.log("Upload failed:", err);
      Alert.alert("Error", "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!mechanic) return;

    setSaving(true);

    try {
      await databases.updateDocument(DB_ID, MECHANIC_COLLECTION, mechanic.$id, {
        name,
        phone,
        serviceType,
        avatarUrl: avatar,
      });

      Alert.alert("Success", "Profile updated.");
    } catch (err) {
      console.log("Save failed:", err);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await account.deleteSessions();
    } catch (err) {
      console.log("Logout error:", err);
    }
    router.replace("/login");
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mechanic Profile</Text>

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{ color: "#888" }}>Pick Image</Text>
          </View>
        )}
      </TouchableOpacity>

      {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}

      {/* Inputs */}
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <TextInput style={styles.input} value={serviceType} onChangeText={setServiceType} placeholder="Service Type" />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.button, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={{ color: "#ff4444", fontWeight: "700" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1E90FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  logoutBtn: { marginTop: 16, alignItems: "center" },
  avatarContainer: { alignSelf: "center", marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingText: { textAlign: "center", color: "#888", marginBottom: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
