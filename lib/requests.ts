import { supabase } from "./supabase";

export async function createRequest({
  customerId,
  customerName,
  customerPhone,
  carType,
  description,
  lat,
  lng,
  mechanicId = null
}: {
  customerId: string,
  customerName: string,
  customerPhone: string,
  carType: string,
  description: string,
  lat: number,
  lng: number,
  mechanicId?: string | null
}) {
  const { data, error } = await supabase.from("requests").insert([{
    customer_id: customerId,
    mechanic_id: mechanicId,
    status: "pending",
    description,
    lat, lng,
    customer_name: customerName,
    customer_phone: customerPhone,
    car_type: carType
  }]);

  if (error) throw error;
  return data;
}
