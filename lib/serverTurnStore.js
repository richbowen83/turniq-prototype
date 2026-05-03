const STORE_KEY = "__turniqTurnsStore";

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = [];
  }

  return globalThis[STORE_KEY];
}

export function readTurns() {
  return getStore();
}

export function writeTurns(turns) {
  globalThis[STORE_KEY] = Array.isArray(turns) ? turns : [];
}

export function clearTurns() {
  globalThis[STORE_KEY] = [];
}