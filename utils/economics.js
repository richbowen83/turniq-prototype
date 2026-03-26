const MARKET_DAILY_RENT = {
  Dallas: 92,
  Phoenix: 88,
  Atlanta: 81,
  Nashville: 84,
  Columbus: 78,
  Cincinnati: 76,
  Birmingham: 72,
  Huntsville: 75,
  Charleston: 86,
};

function parseMoneyLike(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getMonthlyRentValue(row) {
  const candidates = [
    row?.monthlyRentValue,
    row?.monthlyRent,
    row?.rent,
    row?.marketRent,
    row?.askingRent,
    row?.leaseRent,
    row?.actualRent,
    row?.monthly_rent,
    row?.rent_amount,
  ];

  for (const candidate of candidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed && parsed > 0) return parsed;
  }

  return null;
}

export function getDailyRentValue(row) {
  const explicitDailyCandidates = [
    row?.dailyRentValue,
    row?.dailyRent,
    row?.daily_rent,
    row?.rentPerDay,
  ];

  for (const candidate of explicitDailyCandidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed && parsed > 0) return Number(parsed.toFixed(2));
  }

  const monthly = getMonthlyRentValue(row);
  if (monthly && monthly > 0) {
    return Number((monthly / 30).toFixed(2));
  }

  return MARKET_DAILY_RENT[row?.market] || 80;
}

export function getRentSourceLabel(row) {
  const explicitDailyCandidates = [
    row?.dailyRentValue,
    row?.dailyRent,
    row?.daily_rent,
    row?.rentPerDay,
  ];

  for (const candidate of explicitDailyCandidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed && parsed > 0) return "Imported daily rent";
  }

  const monthly = getMonthlyRentValue(row);
  if (monthly && monthly > 0) return "Imported monthly rent";

  return "Market fallback";
}

export function getRevenueProtected(daysSaved, row) {
  const dailyRentValue = getDailyRentValue(row);
  return Math.round(Math.max(0, daysSaved) * dailyRentValue);
}

export function shiftDate(dateStr, deltaDays) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function formatShortDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}