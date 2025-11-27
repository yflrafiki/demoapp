import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function MechanicDashboard() {
  const [mechanic, setMechanic] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  const loadProfileAndRequests = async () => {
    setLoading(true);
    const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
    const authId = user?.id;
    if (!authId) {
      router.replace("/login");
      return;
    }

    const { data: meRows } = await supabase.from("mechanics").select("*").eq("auth_id", authId).single();
    if (!meRows) {
      router.replace("/login");
      return;
    }
    setMechanic(meRows);

    // initial fetch of pending requests assigned to this mechanic
    const { data: reqs } = await supabase.from("requests").select("*").eq("mechanic_id", meRows.id).eq("status", "pending");
    setRequests(reqs || []);

    setLoading(false);
  };

  useEffect(() => {
    loadProfileAndRequests();

    // realtime subscription to requests for this mechanic
    let channel: any;
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: me } = await supabase.from("mechanics").select("*").eq("auth_id", user.id).single();

      if (!me) return;

      channel = supabase
        .channel(`public:requests:mechanic:${me.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "requests", filter: `mechanic_id=eq.${me.id}` },
          (payload) => {
            // payload.eventType: INSERT, UPDATE, DELETE
            // refresh list simply
            loadProfileAndRequests();
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const acceptRequest = async (r: any) => {
    await supabase.from("requests").update({ status: "accepted" }).eq("id", r.id);
    loadProfileAndRequests();
  };

  const rejectRequest = async (r: any) => {
    await supabase.from("requests").update({ status: "rejected" }).eq("id", r.id);
    loadProfileAndRequests();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {mechanic.name}</Text>
      <Text style={styles.section}>Incoming requests</Text>

      {requests.length === 0 ? <Text>No requests</Text> : (
        <FlatList data={requests} keyExtractor={(i)=>i.id} renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.customer_name}</Text>
            <Text>{item.car_type} • {item.description}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.mapBtn} onPress={()=>Linking.openURL(`https://www.google.com/maps?q=${item.lat},${item.lng}`)}>
                <Text style={{color:'#fff'}}>Map</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={()=>acceptRequest(item)}><Text style={{color:'#fff'}}>Accept</Text></TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={()=>rejectRequest(item)}><Text style={{color:'#fff'}}>Reject</Text></TouchableOpacity>
            </View>
          </View>
        )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:20,backgroundColor:'#fff'},
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  title:{fontSize:26,fontWeight:'700',marginBottom:10},
  section:{fontSize:18,fontWeight:'600',marginBottom:10},
  card:{background:'#f7f7f7',padding:12,borderRadius:10,marginBottom:10},
  cardTitle:{fontSize:16,fontWeight:'700'},
  row:{flexDirection:'row',marginTop:8},
  mapBtn:{background:'#333',padding:8,borderRadius:8,marginRight:8},
  acceptBtn:{background:'green',padding:8,borderRadius:8,marginRight:8},
  rejectBtn:{background:'red',padding:8,borderRadius:8}
});
