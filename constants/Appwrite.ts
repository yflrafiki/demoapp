import { Client, Account, Databases, Storage } from "react-native-appwrite";

export const client = new Client();

client
.setEndpoint("https://nyc.cloud.appwrite.io/v1")
.setProject("692506420004e376e03c"); // paste project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// IDs from Appwrite console
export const DB_ID = "69283327003a4cda3714";
export const CUSTOMER_COLLECTION = "customers";
export const MECHANIC_COLLECTION = "mechanic";
export const BUCKET_ID = "692836f6001b4d459c91";
