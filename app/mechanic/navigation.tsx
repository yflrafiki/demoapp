import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import LeafletMap from "../components/LeafletMap";
import * as Location from "expo-location";
import { useLocalSearchParams, router } from "expo-router";
import { updateRequestLocation } from "../../lib/requests";

export default function MechanicNavigation() {
  const { requestId } = useLocalSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [mechanic, setMechanic] = useState<any>(null);
  const [mechanicLocation, setMechanicLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;
    let locationInterval: any;
    let channel: any;

    const init = async () => {
      setLoading(true);
      try {
        const { data: req } = await supabase.from("requests").select("*").eq("id", requestId).single();
        if (!mounted) return;
        setRequest(req);

        if (req?.mechanic_id) {
          const { data: mech } = await supabase.from("mechanics").select("*").eq("id", req.mechanic_id).single();
          if (!mounted) return;
          setMechanic(mech);
        }
      } catch (e: any) {
        Alert.alert("Error", e.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    init();

    // Subscribe to request changes in realtime instead of polling
    (async () => {
      try {
        channel = supabase
          .channel(`public:requests:${requestId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "requests",
              filter: `id=eq.${requestId}`
            },
            (payload: any) => {
              if (mounted) {
                setRequest(payload.new);
              }
            }
          )
          .subscribe();

        // Also subscribe to mechanic updates for the assigned mechanic
        const currentRequest = request || (await supabase.from("requests").select("*").eq("id", requestId).single()).data;
        if (currentRequest?.mechanic_id) {
          channel.on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "mechanics",
              filter: `id=eq.${currentRequest.mechanic_id}`
            },
            (payload: any) => {
              if (mounted) {
                setMechanic(payload.new);
              }
            }
          );
        }
      } catch (e) {
        console.log("realtime subscription failed", e);
      }
    })();

    // Publish location every 30s instead of 5s (reduce DB load)
    (async () => {
      const publishLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            if (mounted) {
              setMechanicLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
              if (requestId) {
                await updateRequestLocation(requestId as string, loc.coords.latitude, loc.coords.longitude, true);
              }
            }
          }
        } catch (e) {
          // ignore location errors
        }
      };

      // Publish immediately on mount
      await publishLocation();

      // Then every 30s
      locationInterval = setInterval(publishLocation, 30000);
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [requestId]);

  const markers = [] as any[];
  // customer marker from request
  const custLat = request?.customer_lat ?? request?.lat ?? null;
  const custLng = request?.customer_lng ?? request?.lng ?? null;
  if (custLat && custLng) {
    markers.push({ id: request?.customer_id || "customer", lat: Number(custLat), lng: Number(custLng), title: request?.customer_name || "Customer" });
  }

  // mechanic marker from live mechanicLocation or mechanic row
  const mechLat = mechanicLocation?.lat ?? mechanic?.lat ?? null;
  const mechLng = mechanicLocation?.lng ?? mechanic?.lng ?? null;
  if (mechLat && mechLng) {
    markers.push({ id: mechanic?.id || "mech", lat: Number(mechLat), lng: Number(mechLng), title: mechanic?.name || "You" });
  }

  const polylines = [] as any[];
  if (mechLat && mechLng && custLat && custLng) {
    polylines.push({ id: requestId || "route", coords: [[Number(mechLat), Number(mechLng)], [Number(custLat), Number(custLng)]], color: "#FF6B35" });
  }

  const handleComplete = async () => {
    try {
      if (!requestId) return;
      // Mark as completed (this will trigger realtime notification to customer)
      await supabase.from("requests").update({ status: "completed" }).eq("id", requestId);
      Alert.alert("Completed", "Request marked as completed. Customer has been notified.");
      router.replace("/mechanic/dashboard");
    } catch (e: any) {
      Alert.alert("Error", e.message || String(e));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Navigation</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapWrap}>
        <LeafletMap customer={custLat && custLng ? { lat: Number(custLat), lng: Number(custLng) } : null} markers={markers} polylines={polylines} />
      </View>

      <View style={styles.controls}>
        <Text style={styles.info}>Request: {request?.car_type} • {request?.description}</Text>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeText}>Mark Arrived / Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  back: { color: '#1E90FF', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },
  mapWrap: { height: 420 },
  controls: { padding: 16 },
  info: { marginBottom: 12, color: '#333' },
  completeBtn: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  completeText: { color: '#fff', fontWeight: '700' }
});
