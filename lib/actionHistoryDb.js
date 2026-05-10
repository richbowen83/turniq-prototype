import { getSupabaseServerClient } from "./supabaseServer";

export async function insertActionHistory(payload) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("action_history")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getRecentActionHistory(orgId, limit = 25) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("action_history")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
}