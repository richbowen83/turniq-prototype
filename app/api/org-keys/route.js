import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const KEY_FILE = path.join(DATA_DIR, "org-keys.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, JSON.stringify({}, null, 2));
}

function readKeys() {
  ensureStore();
  return JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
}

function writeKeys(keys) {
  ensureStore();
  fs.writeFileSync(KEY_FILE, JSON.stringify(keys, null, 2));
}

function generateKey(orgId) {
  return `tiq_${orgId}_${crypto.randomBytes(24).toString("hex")}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "Missing orgId" }, { status: 400 });
  }

  const keys = readKeys();

  if (!keys[orgId]) {
    keys[orgId] = {
      apiKey: generateKey(orgId),
      createdAt: new Date().toISOString(),
      rotatedAt: null,
    };
    writeKeys(keys);
  }

  return NextResponse.json({
    ok: true,
    orgId,
    apiKey: keys[orgId].apiKey,
    createdAt: keys[orgId].createdAt,
    rotatedAt: keys[orgId].rotatedAt,
  });
}

export async function POST(request) {
  const body = await request.json();
  const orgId = body?.orgId;

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "Missing orgId" }, { status: 400 });
  }

  const keys = readKeys();

  keys[orgId] = {
    apiKey: generateKey(orgId),
    createdAt: keys[orgId]?.createdAt || new Date().toISOString(),
    rotatedAt: new Date().toISOString(),
  };

  writeKeys(keys);

  return NextResponse.json({
    ok: true,
    orgId,
    apiKey: keys[orgId].apiKey,
    rotatedAt: keys[orgId].rotatedAt,
  });
}