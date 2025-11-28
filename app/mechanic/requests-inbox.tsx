// app/mechanic/requests-inbox.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function MechanicRequestsInbox() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { router.replace("/login"); return; }

    const { data: me } = await supabase.from("mechanics").select("*").eq("auth_id", user.id).single();
    if (!me) { Alert.alert("No mechanic profile"); router.replace("/login"); return; }

    const { data } = await supabase.from("requests").select("*").eq("mechanic_id", me.id).in("status", ["pending", "accepted"]);
    setRequests(data || []);
    setLoading(false);

    // subscribe
    const channel = supabase
      .channel(`requests-mechanic-${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `mechanic_id=eq.${me.id}` }, (payload) => {
        setRequests(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `mechanic_id=eq.${me.id}` }, (payload) => {
        // update locally
        setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (r:any) => {
    const { error } = await supabase.from("requests").update({ status: "accepted" }).eq("id", r.id);
    if (error) Alert.alert("Error", error.message);
  };

  const reject = async (r:any) => {
    const { error } = await supabase.from("requests").update({ status: "rejected" }).eq("id", r.id);
    if (error) Alert.alert("Error", error.message);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator/></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Incoming Requests</Text>

      {requests.length === 0 ? <Text style={{color:"#777"}}>No requests</Text> : (
        <FlatList
          data={requests}
          keyExtractor={(i)=>i.id}
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.customer_name}</Text>
              <Text style={styles.meta}>{item.car_type} • {item.description}</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.customer_lat},${item.customer_lng}`)}>
                  <Text style={styles.mapText}>Open Map</Text>
                </TouchableOpacity>

                {item.status === "pending" && (
                  <>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(item)}><Text style={styles.btnText}>Accept</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item)}><Text style={styles.btnText}>Reject</Text></TouchableOpacity>
                  </>
                )}

                {item.status === "accepted" && (
                  <Text style={{color:"green", fontWeight:"700", marginLeft:8}}>Accepted</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16, backgroundColor:"#fff"},
  center:{flex:1,justifyContent:"center",alignItems:"center"},
  header:{fontSize:20,fontWeight:"700",marginBottom:12},
  card:{backgroundColor:"#f7f7f7", padding:12, borderRadius:8, marginBottom:12},
  name:{fontSize:16,fontWeight:"700"},
  meta:{color:"#666", marginTop:6},
  row:{flexDirection:"row", marginTop:10, alignItems:"center"},
  mapBtn:{backgroundColor:"#333", padding:8, borderRadius:8, marginRight:8},
  mapText:{color:"#fff"},
  acceptBtn:{backgroundColor:"green", padding:8, borderRadius:8, marginRight:8},
  rejectBtn:{backgroundColor:"red", padding:8, borderRadius:8},
  btnText:{color:"#fff", fontWeight:"700"}
});
