import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "turns.json");

function readTurns() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read turns", error);
    return [];
  }
}

function writeTurns(turns) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(turns, null, 2));
}

export async function GET() {
  const turns = readTurns();

  return NextResponse.json({
    ok: true,
    count: turns.length,
    turns,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const turns = Array.isArray(body.turns) ? body.turns : [];

    writeTurns(turns);

    return NextResponse.json({
      ok: true,
      count: turns.length,
    });
  } catch (error) {
    console.error("Failed to save turns", error);

    return NextResponse.json(
      { ok: false, error: "Failed to save turns" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  writeTurns([]);

  return NextResponse.json({
    ok: true,
    count: 0,
  });
}