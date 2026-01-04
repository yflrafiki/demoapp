// screens/MechanicMap.tsx
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert
} from "react-native";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import SimpleMap from "../components/SimpleMap";
import { Location as LocationType, Mechanic, MechanicRequest, MapMarker } from "../../types/map.types";

const MechanicMap: React.FC = () => {
  const [mechanicAuthId, setMechanicAuthId] = useState<string | null>(null);
  const [mechanicRec, setMechanicRec] = useState<Mechanic | null>(null);
  const [mechanicLocation, setMechanicLocation] = useState<LocationType | null>(null);
  const [requests, setRequests] = useState<MechanicRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<MechanicRequest | null>(null);

  // Get auth user id
  useEffect(() => {
    const getUser = async (): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      setMechanicAuthId(user?.id || null);
      console.log("🟡 Mechanic auth ID:", user?.id);
    };
    getUser();
  }, []);

  // Load mechanic record
  const loadMechanicRecord = async (): Promise<void> => {
    if (!mechanicAuthId) return;
    
    try {
      console.log("🟡 Loading mechanic record...");
      const { data: mech, error } = await supabase
        .from("mechanics")
        .select("id, auth_id, name, phone, lat, lng, online")
        .eq("auth_id", mechanicAuthId)
        .single();

      if (error || !mech) {
        console.log("🔴 Mechanic record not found:", error);
        return;
      }

      setMechanicRec(mech);
      console.log("🟢 Mechanic loaded:", mech.name);
    } catch (err) {
      console.log("🔴 loadMechanicRecord error:", err);
    }
  };

  // Get and update mechanic location
  const getAndUpdateLocation = async (): Promise<void> => {
    try {
      console.log("🟡 Updating mechanic location...");
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("🔴 Location permission denied");
        Alert.alert("Location required", "Please allow location access.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const location: LocationType = { 
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude 
      };
      
      setMechanicLocation(location);
      console.log("🟢 Mechanic location:", location.lat, location.lng);

      if (mechanicAuthId) {
        const { error } = await supabase
          .from("mechanics")
          .update({ 
            lat: location.lat, 
            lng: location.lng,
            online: 'true'
          })
          .eq("auth_id", mechanicAuthId);

        if (error) {
          console.log("🔴 Failed to update mechanic location:", error.message);
        } else {
          console.log("🟢 Mechanic location updated in database");
        }
      }
    } catch (err) {
      console.log("🔴 getAndUpdateLocation error:", err);
    }
  };

  // Load requests for this mechanic
  const loadRequests = async (): Promise<void> => {
    if (!mechanicRec) return;

    try {
      console.log("🟡 Loading requests for mechanic:", mechanicRec.id);
      
      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .select("*")
        .eq("mechanic_id", mechanicRec.id)
        .in("status", ["pending", "accepted", "arrived"])
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.log("🔴 Load requests error:", requestsError.message);
        return;
      }

      console.log("📋 Found requests:", requestsData);
      setRequests(requestsData || []);
      
    } catch (err) {
      console.log("🔴 loadRequests error:", err);
    }
  };

  // Convert requests to map markers
  const getMapMarkers = (): MapMarker[] => {
    const markers = requests
      .filter((request: MechanicRequest) => {
        return request.customer_lat !== null && request.customer_lng !== null;
      })
      .map((request: MechanicRequest) => ({
        id: request.id,
        lat: Number(request.customer_lat),
        lng: Number(request.customer_lng),
        type: 'customer' as const,
        name: request.customer_name || 'Customer'
      }));

    console.log("🎯 Customer markers:", markers);
    return markers;
  };

  useEffect(() => {
    const initialize = async (): Promise<void> => {
      if (!mechanicRec) return;

      setLoading(true);
      console.log("🚀 Initializing mechanic map...");
      
      await getAndUpdateLocation();
      await loadRequests();
      
      setLoading(false);
      console.log("✅ Mechanic map initialized");
    };

    initialize();
  }, [mechanicRec]);

  useEffect(() => {
    if (mechanicAuthId) {
      loadMechanicRecord();
    }
  }, [mechanicAuthId]);

  if (loading || !mechanicLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading mechanic map...</Text>
      </View>
    );
  }

  const mapMarkers = getMapMarkers();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mechanic Map</Text>
        <Text style={styles.subtitle}>
          {requests.length} active request{requests.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Map View */}
      <View style={styles.mapWrapper}>
        <SimpleMap
          userLocation={mechanicLocation}
          userType="mechanic"
          markers={mapMarkers}
          onMarkerPress={(id) => {
            console.log(`📍 Customer marker pressed: ${id}`);
            const request = requests.find((r: MechanicRequest) => r.id === id);
            setSelectedRequest(request || null);
          }}
          selectedMarker={selectedRequest ? {
            id: selectedRequest.id,
            lat: Number(selectedRequest.customer_lat!),
            lng: Number(selectedRequest.customer_lng!),
            type: 'customer',
            name: selectedRequest.customer_name || 'Customer'
          } : null}
        />
      </View>

      {/* Selected Request Details */}
      {selectedRequest && (
        <View style={styles.bottomSheet}>
          <Text style={styles.requestTitle}>Request Details</Text>
          <Text style={styles.customerName}>{selectedRequest.customer_name || 'Customer'}</Text>
          <Text style={styles.carType}>{selectedRequest.car_type || 'Unknown car'}</Text>
          <Text style={styles.issue}>Issue: {selectedRequest.description || 'Not specified'}</Text>
          <Text style={styles.phone}>📞 {selectedRequest.customer_phone || 'No phone'}</Text>
          <Text style={styles.status}>Status: {selectedRequest.status}</Text>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.acceptBtn]} 
            onPress={() => {
              Alert.alert("Accept", "Request accepted!");
            }}
          >
            <Text style={styles.btnText}>Accept Request</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.closeBtn]} 
            onPress={() => setSelectedRequest(null)}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug Info */}
      <View style={styles.debugPanel}>
        <Text style={styles.debugText}>
          Customer Markers: {mapMarkers.length} | 
          Requests: {requests.length} | 
          Location: {mechanicLocation ? '✅' : '❌'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: {
     marginTop: 16, 
     fontSize: 16,
      color: "#666" 
    },
  header: { 
    padding: 20, 
    paddingTop: 60, 
    backgroundColor: "#f8f9fa" 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#333" 
  },
  subtitle: { 
    fontSize: 16, 
    color: "#666", 
    marginTop: 4 
  },
  mapWrapper: {
     flex: 1 
    },
  bottomSheet: { 
    backgroundColor: "#fff", 
    padding: 20, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    elevation: 10 
  },
  requestTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 12, 
    color: "#333" 
  },
  customerName: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#333" 
  },
  carType: { 
    fontSize: 16, 
    color: "#555", 
    marginTop: 4 },
  issue: { 
    fontSize: 14, 
    color: "#666", 
    marginTop: 4 
  },
  phone: {
     fontSize: 14, 
     color: "#333", 
     marginVertical: 4 
    },
  status: { 
    fontSize: 14, 
    color: "#888", 
    marginTop: 4 
  },
  actionBtn: {
     padding: 14, 
     borderRadius: 10, 
     marginVertical: 6, 
     alignItems: "center" 
    },
  acceptBtn: { 
    backgroundColor: "#32CD32" 
  },
  closeBtn: { 
    backgroundColor: "transparent", 
    borderWidth: 1, 
    borderColor: "#ddd" 
  },
  btnText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  closeBtnText: { 
    color: "#666", 
    fontSize: 16,
     fontWeight: "600" 
    },
  debugPanel: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MechanicMap;