import { supabase } from "./supabase";

export async function createRequest({
  customerId,
  customerName,
  customerPhone,
  carType,
  description,
  lat = null,
  lng = null,
  mechanicId = null
}: {
  customerId: string,
  customerName: string,
  customerPhone: string,
  carType: string,
  description: string,
  lat?: number | null,
  lng?: number | null,
  mechanicId?: string | null
}) {
  // If provided, store the customer's latest location on their profile
  try {
    if (lat !== null && lng !== null) {
      await supabase.from("customers").update({ lat: lat, lng: lng }).eq("id", customerId);
    }
  } catch (e) {
    // non-fatal: continue to create request even if customer update fails
    console.warn("Failed to update customer location:", e);
  }

  const { data, error } = await supabase.from("requests").insert([{
    customer_id: customerId,
    mechanic_id: mechanicId,
    status: "pending",
    description,
    // store both legacy lat/lng and explicit customer_lat/customer_lng for clarity
    lat: lat ?? null,
    lng: lng ?? null,
    customer_lat: lat ?? null,
    customer_lng: lng ?? null,
    mechanic_lat: null,
    mechanic_lng: null,
    customer_name: customerName,
    customer_phone: customerPhone,
    car_type: carType,
    created_at: new Date().toISOString()
  }]);

  if (error) throw error;
  return data;
}

export async function getCustomerRequests(authUserId: string) {
  // Accept auth user id and lookup customer row to find internal customer id
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_id", authUserId)
    .single();

  if (customerError) throw customerError;
  if (!customerData) return [];

  const customerId = customerData.id;

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getMechanicRequests(mechanicId: string) {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("mechanic_id", mechanicId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getPendingRequestsForMechanic(mechanicId: string) {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("mechanic_id", mechanicId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function acceptRequest(requestId: string, mechanicId: string) {
  // Try to include mechanic's current coordinates on the request when accepting
  let mechanicCoords: { lat?: number | null; lng?: number | null } = {};
  try {
    const { data: mech } = await supabase.from("mechanics").select("lat,lng").eq("id", mechanicId).single();
    if (mech) {
      mechanicCoords.lat = mech.lat ?? null;
      mechanicCoords.lng = mech.lng ?? null;
    }
  } catch (e) {
    // ignore
  }

  const { data, error } = await supabase
    .from("requests")
    .update({
      mechanic_id: mechanicId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      mechanic_lat: mechanicCoords.lat ?? null,
      mechanic_lng: mechanicCoords.lng ?? null,
    })
    .eq("id", requestId);
  
  if (error) throw error;
  return data;
}

export async function declineRequest(requestId: string) {
  const { data, error } = await supabase
    .from("requests")
    .update({
      status: "declined",
      mechanic_id: null,
      declined_at: new Date().toISOString()
    })
    .eq("id", requestId);
  
  if (error) throw error;
  return data;
}

export async function completeRequest(requestId: string) {
  const { data, error } = await supabase
    .from("requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", requestId);
  
  if (error) throw error;
  return data;
}

export async function updateRequestLocation(
  requestId: string,
  lat: number,
  lng: number,
  isMechanic: boolean = false
) {
  const updateData = isMechanic
    ? { mechanic_lat: lat, mechanic_lng: lng }
    : { customer_lat: lat, customer_lng: lng };

  const { data, error } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", requestId);
  
  if (error) throw error;
  return data;
}
