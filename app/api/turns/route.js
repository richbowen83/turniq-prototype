import { NextResponse } from "next/server";
import {
  deleteAllTurns,
  deleteTurnsForOrg,
  getTurnsByOrg,
  replaceTurnsForOrg,
  updateTurnForOrg,
} from "../../../lib/turnsDb";

function errorResponse(error) {
  console.error("TURNS API ERROR:", error);

  return NextResponse.json(
    {
      ok: false,
      error: error?.message || String(error),
      stack: error?.stack || null,
    },
    { status: 500 }
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "demo";

    const turns = await getTurnsByOrg(orgId);

    return NextResponse.json({
      ok: true,
      orgId,
      count: turns.length,
      turns,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const orgId = body.orgId || "demo";
    const turnId = body.turnId;
    const patch = body.patch || {};

    if (!turnId) {
      return NextResponse.json(
        { ok: false, error: "turnId is required" },
        { status: 400 }
      );
    }

    const turn = await updateTurnForOrg(orgId, turnId, patch);

    return NextResponse.json({
      ok: true,
      orgId,
      turnId,
      turn,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "demo";
    const body = await request.json();

    const incomingTurns = Array.isArray(body.turns)
      ? body.turns.map((turn) => ({ ...turn, orgId }))
      : [];

    const turns = await replaceTurnsForOrg(orgId, incomingTurns);

    return NextResponse.json({
      ok: true,
      orgId,
      count: turns.length,
      turns,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get("orgId");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      await deleteAllTurns();
      return NextResponse.json({ ok: true, cleared: "all" });
    }

    if (orgId) {
      await deleteTurnsForOrg(orgId);
      return NextResponse.json({ ok: true, cleared: orgId });
    }

    return NextResponse.json(
      { ok: false, error: "Missing orgId or all=true" },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}