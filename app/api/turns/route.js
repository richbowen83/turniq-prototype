import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "turns.json");

function readTurns() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTurns(turns) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(turns, null, 2));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    const turns = readTurns();

    const filteredTurns = orgId
      ? turns.filter((turn) => turn.orgId === orgId)
      : turns;

    return NextResponse.json({
      ok: true,
      count: filteredTurns.length,
      turns: filteredTurns,
    });
  } catch (error) {
    console.error("Failed to load turns", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load turns" },
      { status: 500 }
    );
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

    const existingTurns = readTurns().filter((turn) => turn.orgId !== orgId);
    const nextTurns = [...existingTurns, ...incomingTurns];

    writeTurns(nextTurns);

    return NextResponse.json({
      ok: true,
      orgId,
      count: incomingTurns.length,
      turns: incomingTurns,
    });
  } catch (error) {
    console.error("Failed to save turns", error);

    return NextResponse.json(
      { ok: false, error: "Failed to save turns" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get("orgId");
    const clearAll = searchParams.get("all") === "true";

    const existingTurns = readTurns();

    // 🔥 Global nuke
    if (clearAll) {
      writeTurns([]);
      return NextResponse.json({ ok: true, cleared: "all" });
    }

    // 🔥 Org-specific delete
    if (orgId) {
      const remaining = existingTurns.filter((t) => t.orgId !== orgId);
      writeTurns(remaining);

      return NextResponse.json({ ok: true, cleared: orgId });
    }

    return NextResponse.json(
      { ok: false, error: "Missing orgId or all=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to clear turns", error);

    return NextResponse.json(
      { ok: false, error: "Failed to clear turns" },
      { status: 500 }
    );
  }
}