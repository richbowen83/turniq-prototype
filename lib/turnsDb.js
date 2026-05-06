import { getSupabaseServerClient } from "./supabaseServer";

function toDbTurn(turn) {
  return {
    id: turn.id,
    org_id: turn.orgId || turn.org_id || "demo",
    payload: turn,

    name: turn.name || null,
    market: turn.market || null,
    current_stage: turn.currentStage || null,
    turn_status: turn.turnStatus || null,
    turn_owner: turn.turnOwner || null,
    vendor: turn.vendor || null,

    projected_completion: turn.projectedCompletion || null,
    open_days: Number.isFinite(Number(turn.openDays)) ? Number(turn.openDays) : null,
    days_in_stage: Number.isFinite(Number(turn.daysInStage)) ? Number(turn.daysInStage) : null,
    risk: Number.isFinite(Number(turn.risk)) ? Number(turn.risk) : null,
    readiness: Number.isFinite(Number(turn.readiness)) ? Number(turn.readiness) : null,

    source_system_name: turn.sourceSystemName || null,
    sync_status: turn.syncStatus || null,
    last_synced_at: turn.lastSyncedAt || null,

    is_test_data: Boolean(turn.isTestData),

    updated_at: new Date().toISOString(),
  };
}

function fromDbTurn(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    orgId: row.org_id,
  };
}

export async function getTurnsByOrg(orgId) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("turns")
    .select("*")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(fromDbTurn);
}

export async function replaceTurnsForOrg(orgId, turns) {
  const supabase = getSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("turns")
    .delete()
    .eq("org_id", orgId);

  if (deleteError) throw deleteError;

  if (!turns.length) return [];

  const rows = turns.map((turn) => toDbTurn({ ...turn, orgId }));

  const { data, error } = await supabase
    .from("turns")
    .upsert(rows, { onConflict: "org_id,id" })
    .select();

  if (error) throw error;

  return (data || []).map(fromDbTurn);
}

export async function upsertTurnsForOrg(orgId, turns) {
  const supabase = getSupabaseServerClient();

  if (!turns.length) return [];

  const rows = turns.map((turn) => toDbTurn({ ...turn, orgId }));

  const { data, error } = await supabase
    .from("turns")
    .upsert(rows, { onConflict: "org_id,id" })
    .select();

  if (error) throw error;

  return (data || []).map(fromDbTurn);
}

export async function deleteTurnsForOrg(orgId) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("turns").delete().eq("org_id", orgId);

  if (error) throw error;
}

export async function deleteAllTurns() {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("turns")
    .delete()
    .neq("org_id", "__never__");

  if (error) throw error;
}