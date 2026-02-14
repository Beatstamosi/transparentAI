import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config(); // Ensure env is loaded before initializing

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase Environment Variables");
}

console.log("URL Check:", process.env.SUPABASE_URL);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
