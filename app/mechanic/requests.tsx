import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { databases, DB_ID } from "../../constants/Appwrite";
import { Query } from "react-native-appwrite";
import { router } from "expo-router";

const REQUESTS_COLLECTION = "requests";
const MECHANIC_COLLECTION = "mechanic";

export default function MechanicRequests({ route }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  const fetchLists = async () => {
    try {
      // pending/accepted for current mechanic — server-side must filter by mechanicId matching logged-in mechanic.$id
      const pending = await databases.listDocuments(DB_ID, REQUESTS_COLLECTION, [
        Query.equal("status", "accepted"),
      ]);

      const completed = await databases.listDocuments(DB_ID, REQUESTS_COLLECTION, [
        Query.equal("status", "completed"),
      ]);

      setRequests(pending.documents || []);
      setHistory(completed.documents || []);
    } catch (err) {
      console.log("Load requests failed:", err);
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const markCompleted = async (req: any) => {
    try {
      await databases.updateDocument(DB_ID, REQUESTS_COLLECTION, req.$id, {
        status: "completed",
      });
      fetchLists();
      Alert.alert("Job completed", "Good job — earnings recorded.");
    } catch (err) {
      console.log("Complete failed:", err);
      Alert.alert("Error", "Failed to update request");
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Jobs</Text>

      {requests.length === 0 ? (
        <Text style={styles.empty}>No active jobs</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i) => i.$id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.customerName}</Text>
              <Text>{item.carType} • {item.issue}</Text>
              <Text>Price: GH₵{item.price ?? "—"}</Text>

              <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                <TouchableOpacity 
                  style={styles.detailsBtn} 
                  onPress={() => router.push({ pathname: '/mechanic/request-details', params: { requestId: item.$id } })}
                >
                  <Text style={styles.detailsText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.completeBtn} onPress={() => markCompleted(item)}>
                  <Text style={styles.completeText}>Mark Completed</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Text style={[styles.title, { marginTop: 20 }]}>Job History</Text>

      {history.length === 0 ? (
        <Text style={styles.empty}>No past jobs</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(i) => i.$id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push({ pathname: '/mechanic/request-details', params: { requestId: item.$id } })}
            >
              <Text style={styles.cardTitle}>{item.customerName}</Text>
              <Text>{item.carType} • {item.issue}</Text>
              <Text>Price: GH₵{item.price ?? "—"}</Text>
              <Text style={{ color: "#666", marginTop: 8 }}>{new Date(item.$createdAt).toLocaleString()}</Text>
              <Text style={styles.viewDetailsHint}>Tap to view details</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#fff" 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    marginBottom: 12 
  },
  card: { 
    backgroundColor: "#f7f7f7",
     padding: 12, 
     borderRadius: 10, 
     marginBottom: 12 
    },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: "700" 
  },
  completeBtn: { 
    backgroundColor: "green", 
    padding: 10, 
    borderRadius: 8 
  },
  completeText: { 
    color: "#fff", 
    fontWeight: "700" 
  },
  detailsBtn: { 
    backgroundColor: "#FF6B35", 
    padding: 10, 
    borderRadius: 8, 
    flex: 1 
  },
  detailsText: { 
    color: "#fff", 
    fontWeight: "700", 
    textAlign: "center" 
  },
  viewDetailsHint: {
     color: "#FF6B35", 
     fontSize: 12, 
     marginTop: 4, 
     fontStyle: "italic" 
    },
  empty: { 
    color: "#999", 
    textAlign: "center", 
    marginVertical: 12 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
});
