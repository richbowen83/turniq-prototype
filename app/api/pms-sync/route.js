import { NextResponse } from "next/server";
import { readTurns, writeTurns } from "../../../lib/serverTurnStore";
import { mapRawRowToTurnIQTurn } from "../../../lib/turniqImport";

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
      const mapped = mapRawRowToTurnIQTurn(row, index);

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

    if (mode === "replace") {
      const existingTurns = readTurns().filter((turn) => turn.orgId !== orgId);
      const nextTurns = [...existingTurns, ...incomingTurns];

      writeTurns(nextTurns);

      return NextResponse.json({
        ok: true,
        mode,
        source,
        orgId,
        count: incomingTurns.length,
        turns: incomingTurns,
      });
    }

    const allTurns = readTurns();
    const otherOrgTurns = allTurns.filter((turn) => turn.orgId !== orgId);
    const sameOrgTurns = allTurns.filter((turn) => turn.orgId === orgId);

    const byId = new Map(sameOrgTurns.map((turn) => [turn.id, turn]));

    incomingTurns.forEach((turn) => {
      byId.set(turn.id, {
        ...(byId.get(turn.id) || {}),
        ...turn,
      });
    });

    const mergedOrgTurns = Array.from(byId.values());
    const mergedTurns = [...otherOrgTurns, ...mergedOrgTurns];

    writeTurns(mergedTurns);

    return NextResponse.json({
      ok: true,
      mode,
      source,
      orgId,
      received: incomingTurns.length,
      count: mergedOrgTurns.length,
      turns: incomingTurns,
    });
  } catch (error) {
    console.error("PMS sync failed", error);

    return NextResponse.json(
      { ok: false, error: error.message || "PMS sync failed" },
      { status: 500 }
    );
  }
}