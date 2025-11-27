import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://becpcjwlqjgbxyrsclfc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlY3BjandscWpnYnh5cnNjbGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODEwNDksImV4cCI6MjA3OTc1NzA0OX0.ZBAjtzNhBPP5OaWTV3ltAEjntker4S-_ImyPpCgZa5g";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
