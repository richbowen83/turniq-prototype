import { supabaseServer } from "./supabaseServer";

export async function insertActionHistory(payload) {
  const { data, error } = await supabaseServer
    .from("action_history")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Failed to insert action history", error);
    throw error;
  }

  return data;
}

export async function getRecentActionHistory(orgId, limit = 25) {
  const { data, error } = await supabaseServer
    .from("action_history")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch action history", error);
    return [];
  }

  return data || [];
}