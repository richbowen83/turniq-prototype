import { NextResponse } from "next/server";
import { mapRawRowToTurnIQTurn } from "../../../lib/turniqImport";
import { enrichTurnWithIntelligence } from "../../../lib/turniqBrain";
import { replaceTurnsForOrg, upsertTurnsForOrg } from "../../../lib/turnsDb";

export async function POST(request) {
  try {
    const body = await request.json();

    const source = body.source || "PMS";
    const mode = body.mode || "upsert";
    const rawTurns = Array.isArray(body.turns) ? body.turns : [];
    const orgId =
      request.headers.get("x-turniq-org-id") || body.orgId || "demo";

    if (!rawTurns.length) {
      return NextResponse.json(
        { ok: false, error: "No turns provided" },
        { status: 400 }
      );
    }

    const incomingTurns = rawTurns.map((row, index) => {
      const mapped = enrichTurnWithIntelligence(
        mapRawRowToTurnIQTurn(row, index)
      );

      return {
        ...mapped,
        orgId,
        isTestData: Boolean(body.isTestData || row.isTestData),
        sourceSystemName: source,
        syncStatus: "Synced",
        lastSyncedAt: new Date().toISOString(),
        lastSyncedLabel: `${source} sync`,
      };
    });

    const turns =
      mode === "replace"
        ? await replaceTurnsForOrg(orgId, incomingTurns)
        : await upsertTurnsForOrg(orgId, incomingTurns);

    return NextResponse.json({
      ok: true,
      mode,
      source,
      orgId,
      received: incomingTurns.length,
      count: turns.length,
      turns,
    });
  } catch (error) {
    console.error("PMS sync failed", error);

    return NextResponse.json(
      { ok: false, error: error.message || "PMS sync failed" },
      { status: 500 }
    );
  }
}