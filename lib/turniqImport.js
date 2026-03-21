export const REQUIRED_IMPORT_FIELDS = [
  "Request Id",
  "Unit Id",
  "Full Address",
  "Market",
  "Owner Names",
  "Legal Entity Name",
  "Turn Status",
  "Turn Stage",
  "Assignee",
  "Vendors",
  "Current Estimated Rent Ready Date",
  "Days Open",
  "Current Days in Stage",
  "Estimate Cost",
  "Approved Cost",
  "Notes",
];

const STAGE_MAP = {
  PRE_LEASING: "Pre-Leasing",
  "PRE-LEASING": "Pre-Leasing",
  PRELEASING: "Pre-Leasing",

  PRE_MOVE_OUT_INSPECTION: "Pre-Move Out Inspection",
  "PRE-MOVE OUT INSPECTION": "Pre-Move Out Inspection",
  PRE_MOVE_OUT: "Pre-Move Out Inspection",
  "PRE MOVE OUT": "Pre-Move Out Inspection",

  MOVE_OUT_INSPECTION: "Move Out Inspection",
  "MOVE OUT INSPECTION": "Move Out Inspection",
  MOI: "Move Out Inspection",

  SCOPE_REVIEW: "Scope Review",
  SCOPE: "Scope Review",

  OWNER_APPROVAL: "Owner Approval",
  "OWNER APPROVAL": "Owner Approval",
  OA: "Owner Approval",

  DISPATCH: "Dispatch",
  DI: "Dispatch",

  PENDING_RRI: "Pending RRI",
  "PENDING RRI": "Pending RRI",
  RRI: "Pending RRI",

  RENT_READY_OPEN: "Rent Ready Open",
  "RENT READY OPEN": "Rent Ready Open",
  RR: "Rent Ready Open",
};

const STATUS_MAP = {
  OPEN: "Monitoring",
  ASSIGNED: "Monitoring",
  STARTED: "Monitoring",
  IN_PROGRESS: "Monitoring",
  "IN PROGRESS": "Monitoring",
  NOT_ASSIGNED: "Blocked",
  "NOT ASSIGNED": "Blocked",
  BLOCKED: "Blocked",
  ON_HOLD: "Blocked",
  "ON HOLD": "Blocked",
  COMPLETED: "Ready",
  COMPLETE: "Ready",
  READY: "Ready",
};

function cleanString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toKey(value) {
  return cleanString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace(/[$,]/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toBoolean(value) {
  const v = cleanString(value).toLowerCase();
  return ["true", "yes", "1"].includes(v);
}

function parseDate(value) {
  const raw = cleanString(value);
  if (!raw) return "";

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return "";
}

function shortAddress(fullAddress) {
  const raw = cleanString(fullAddress);
  if (!raw) return "";
  return raw.split(",")[0]?.trim() || raw;
}

export function normalizeStage(turnStage, fallbackStage = "") {
  const direct = STAGE_MAP[toKey(turnStage)];
  if (direct) return direct;

  const fallback = STAGE_MAP[toKey(fallbackStage)];
  if (fallback) return fallback;

  return cleanString(turnStage) || cleanString(fallbackStage) || "Scope Review";
}

export function normalizeStatus(turnStatus) {
  const mapped = STATUS_MAP[toKey(turnStatus)];
  return mapped || "Monitoring";
}

export function inferScopeCategory(row) {
  const notes = cleanString(row["Notes"]).toLowerCase();
  const turnType = cleanString(row["Turn Type"]).toLowerCase();
  const approvedCost = toNumber(row["Approved Cost"]);
  const estimateCost = toNumber(row["Estimate Cost"]);
  const cost = approvedCost || estimateCost;

  if (
    notes.includes("hvac") ||
    notes.includes("plumbing") ||
    notes.includes("electrical") ||
    cost > 3500
  ) {
    return "Heavy Turn Review";
  }

  if (notes.includes("floor") || notes.includes("lvp") || notes.includes("carpet")) {
    return "Flooring + Paint";
  }

  if (notes.includes("deep clean") || notes.includes("clean only") || cost < 750) {
    return "Deep Clean";
  }

  if (
    notes.includes("paint") ||
    notes.includes("patch") ||
    turnType.includes("standard")
  ) {
    return "Paint + Patch";
  }

  return "General Turn";
}

export function inferBlockers(row) {
  const blockers = [];

  const currentStage = normalizeStage(row["Turn Stage"], row["Stage"]);
  const vendor = cleanString(row["Vendors"]);
  const rriStatus = cleanString(row["Rri Status"]);
  const moiStatus = cleanString(row["Moi Status"]);
  const lockboxStatus = cleanString(row["Lockbox Status"]);
  const approvalRequested = cleanString(row["Latest Investor Approval Requested At"]);
  const approvalResponse = cleanString(row["Latest Investor Approval Response At"]);
  const lastAccessDays = toNumber(row["Days Since Latest Lockbox Access"]);
  const woEstimates = toNumber(row["Wo Estimates Count"]);
  const woApproved = toNumber(row["Wo Approved Count"]);
  const notes = cleanString(row["Notes"]).toLowerCase();

  if (currentStage === "Owner Approval" && approvalRequested && !approvalResponse) {
    blockers.push("Owner approval delay");
  }

  if (!vendor || toKey(vendor) === "NOT_ASSIGNED" || toKey(vendor) === "TBD") {
    blockers.push("Vendor not assigned");
  }

  if (!lockboxStatus || ["NOT_ASSIGNED", "MISSING"].includes(toKey(lockboxStatus))) {
    blockers.push("Access / lockbox issue");
  }

  if (currentStage === "Pending RRI" || (rriStatus && !["COMPLETE", "PASSED"].includes(toKey(rriStatus)))) {
    blockers.push("RRI pending");
  }

  if (
    ["Move Out Inspection", "Pre-Move Out Inspection"].includes(currentStage) &&
    moiStatus &&
    !["COMPLETE", "COMPLETED"].includes(toKey(moiStatus))
  ) {
    blockers.push("MOI pending");
  }

  if (lastAccessDays >= 7) {
    blockers.push("No recent vendor access");
  }

  if (woApproved < woEstimates) {
    blockers.push("Estimate not fully approved");
  }

  if (notes.includes("appliance")) {
    blockers.push("Appliance ETA pending");
  }

  if (notes.includes("trade overlap") || notes.includes("coordination")) {
    blockers.push("Trade coordination risk");
  }

  return blockers.length ? Array.from(new Set(blockers)) : ["No active blockers"];
}

export function inferDelayDrivers(row, blockers) {
  const drivers = [];

  blockers.forEach((blocker) => {
    if (blocker === "Owner approval delay") {
      drivers.push({ label: "Owner approval lag", days: 2 });
    }
    if (blocker === "Vendor not assigned") {
      drivers.push({ label: "Vendor assignment gap", days: 2 });
    }
    if (blocker === "RRI pending") {
      drivers.push({ label: "RRI failure exposure", days: 1 });
    }
    if (blocker === "MOI pending") {
      drivers.push({ label: "Inspection completion lag", days: 1 });
    }
    if (blocker === "No recent vendor access") {
      drivers.push({ label: "No recent access activity", days: 2 });
    }
    if (blocker === "Estimate not fully approved") {
      drivers.push({ label: "Work order approval lag", days: 1 });
    }
    if (blocker === "Trade coordination risk") {
      drivers.push({ label: "Trade coordination risk", days: 2 });
    }
    if (blocker === "Appliance ETA pending") {
      drivers.push({ label: "Appliance vendor delay probability", days: 2 });
    }
  });

  return drivers.length ? drivers : [{ label: "Standard execution variability", days: 1 }];
}

export function computeRiskScore(row, blockers) {
  let risk = 0;

  const daysOpen = toNumber(row["Days Open"]);
  const daysInStage = toNumber(row["Current Days in Stage"]);
  const currentStage = normalizeStage(row["Turn Stage"], row["Stage"]);
  const rriResult = cleanString(row["Rri Inspection Result"]).toUpperCase();
  const lastAccessDays = toNumber(row["Days Since Latest Lockbox Access"]);
  const woEstimates = toNumber(row["Wo Estimates Count"]);
  const woApproved = toNumber(row["Wo Approved Count"]);

  if (daysOpen >= 21) risk += 25;
  else if (daysOpen >= 14) risk += 15;
  else if (daysOpen >= 7) risk += 8;

  if (daysInStage >= 5) risk += 20;
  else if (daysInStage >= 3) risk += 10;

  if (currentStage === "Owner Approval") risk += 15;
  if (blockers.includes("Vendor not assigned")) risk += 15;
  if (lastAccessDays >= 7) risk += 10;
  if (rriResult.includes("FAIL")) risk += 15;
  if (woApproved < woEstimates) risk += 10;
  if (blockers.includes("Trade coordination risk")) risk += 8;
  if (blockers.includes("Appliance ETA pending")) risk += 8;

  return Math.min(100, risk);
}

export function computeReadinessScore(row, blockers) {
  let readiness = 100;
  const currentStage = normalizeStage(row["Turn Stage"], row["Stage"]);

  if (["Move Out Inspection", "Scope Review"].includes(currentStage)) readiness -= 20;
  if (currentStage === "Owner Approval") readiness -= 25;
  if (blockers.includes("Vendor not assigned")) readiness -= 20;
  if (blockers.includes("Access / lockbox issue")) readiness -= 10;
  if (blockers.includes("RRI pending")) readiness -= 10;
  if (blockers.includes("MOI pending")) readiness -= 10;
  if (blockers.includes("No recent vendor access")) readiness -= 5;

  return Math.max(0, readiness);
}

export function computeTimelineConfidence(row, blockers) {
  let confidence = 92;

  if (!parseDate(row["Current Estimated Rent Ready Date"])) confidence -= 18;
  if (!cleanString(row["Vendors"])) confidence -= 10;
  if (!cleanString(row["Assignee"])) confidence -= 6;
  if (blockers.includes("Owner approval delay")) confidence -= 10;
  if (blockers.includes("Vendor not assigned")) confidence -= 12;
  if (blockers.includes("No recent vendor access")) confidence -= 8;
  if (blockers.includes("RRI pending")) confidence -= 6;

  return Math.max(45, confidence);
}

function buildTimeline(turn) {
  const start = parseDate(turn.move_out_date) || parseDate(turn.turn_start_date) || turn.projected_completion;

  return [
    {
      key: "moveout",
      label: "Move Out",
      date: start || turn.projected_completion,
      progress: turn.current_stage === "Pre-Leasing" ? 0 : 100,
    },
    {
      key: "scope",
      label: "Scope Review",
      date: turn.projected_completion,
      progress: ["Scope Review", "Owner Approval", "Dispatch", "Pending RRI", "Rent Ready Open"].includes(turn.current_stage)
        ? 70
        : 0,
    },
    {
      key: "dispatch",
      label: "PM Dispatch",
      date: turn.pm_dispatch_date || turn.projected_completion,
      progress: ["Dispatch", "Pending RRI", "Rent Ready Open"].includes(turn.current_stage)
        ? 70
        : 0,
    },
    {
      key: "ready",
      label: "Ready",
      date: turn.projected_completion,
      progress: turn.current_stage === "Rent Ready Open" ? 100 : 0,
    },
  ];
}

export function mapRawRowToTurnIQTurn(row, index = 0) {
  const blockers = inferBlockers(row);
const delayDrivers = inferDelayDrivers(row, blockers);
const currentStage = normalizeStage(row["Turn Stage"], row["Stage"]);
const turnStatus = normalizeStatus(row["Turn Status"]);

const importedRisk =
  row.risk !== undefined && row.risk !== null && row.risk !== ""
    ? toNumber(row.risk)
    : row["Risk"] !== undefined && row["Risk"] !== null && row["Risk"] !== ""
    ? toNumber(row["Risk"])
    : null;

const importedReadiness =
  row.readiness !== undefined && row.readiness !== null && row.readiness !== ""
    ? toNumber(row.readiness)
    : row["Readiness"] !== undefined &&
      row["Readiness"] !== null &&
      row["Readiness"] !== ""
    ? toNumber(row["Readiness"])
    : null;

const risk =
  importedRisk !== null ? importedRisk : computeRiskScore(row, blockers);

const readiness =
  importedReadiness !== null
    ? importedReadiness
    : computeReadinessScore(row, blockers);
  const projectedCompletion =
    parseDate(row["Current Estimated Rent Ready Date"]) ||
    parseDate(row["Scheduled Turn End Date"]) ||
    parseDate(row["Initial Estimated Rent Ready Date"]) ||
    "2026-05-07";

  const turn = {
    id: cleanString(row["Request Id"]) || `import-${index + 1}`,
    request_id: cleanString(row["Request Id"]),
    turn_id: cleanString(row["Request Id"]),
    property_id: cleanString(row["Unit Id"]) || `unit-${index + 1}`,
    unit_id: cleanString(row["Unit Id"]),
    property_name: cleanString(row["Full Address"]),
    name: shortAddress(row["Full Address"]) || `Imported Property ${index + 1}`,
    market: cleanString(row["Market"]) || "Unknown",
    region: cleanString(row["Region"]),
    city: cleanString(row["City"]),
    state: cleanString(row["State"]),
    property_management_company: cleanString(row["Property Management Company"]) || "Darwin Homes",
    owner_name: cleanString(row["Owner Names"]),
    owner_type: cleanString(row["Owner Type"]),
    legal_entity_name: cleanString(row["Legal Entity Name"]),
    leaseEnd: parseDate(row["Move Out Date"]) || projectedCompletion,
    lease_end_date: parseDate(row["Move Out Date"]) || projectedCompletion,
    move_out_date: parseDate(row["Move Out Date"]),
    turn_start_date: parseDate(row["Turn Start Date"]),
    pm_dispatch_date: parseDate(row["Property Management Company Dispatch Date"]) || parseDate(row["Darwin Dispatch Date"]),
    projectedCompletion,
    projected_completion: projectedCompletion,
    initial_estimated_completion: parseDate(row["Initial Estimated Rent Ready Date"]),
    openDays: toNumber(row["Days Open"]),
    days_open: toNumber(row["Days Open"]),
    daysInStage: toNumber(row["Current Days in Stage"]),
    days_in_stage: toNumber(row["Current Days in Stage"]),
    risk,
    risk_score: risk,
    readiness,
    readiness_score: readiness,
    projectedCost: toNumber(row["Approved Cost"]) || toNumber(row["Estimate Cost"]),
    projected_cost: toNumber(row["Approved Cost"]) || toNumber(row["Estimate Cost"]),
    estimated_cost: toNumber(row["Estimate Cost"]),
    approved_cost: toNumber(row["Approved Cost"]),
    timelineConfidence: computeTimelineConfidence(row, blockers),
    timeline_confidence: computeTimelineConfidence(row, blockers),
    scope: inferScopeCategory(row),
    scope_category: inferScopeCategory(row),
    scope_text: cleanString(row["Notes"]),
    turnOwner: cleanString(row["Assignee"]) || "Unassigned",
    turn_owner: cleanString(row["Assignee"]) || "Unassigned",
    operator: cleanString(row["Assignee"]) || "Unassigned",
    turnStatus,
    turn_status: turnStatus,
    currentStage,
    current_stage: currentStage,
    vendor: cleanString(row["Vendors"]) || "TBD",
    blockers,
    delayDrivers: delayDrivers,
    delay_drivers: delayDrivers,
    turn_type: cleanString(row["Turn Type"]),
    moi_status: cleanString(row["Moi Status"]),
    rri_status: cleanString(row["Rri Status"]),
    rri_result: cleanString(row["Rri Inspection Result"]),
    inspection_status: cleanString(row["Rri Inspection Result"]) || cleanString(row["Moi Status"]),
    approval_status:
      cleanString(row["Latest Investor Approval Requested At"]) &&
      !cleanString(row["Latest Investor Approval Response At"])
        ? "Pending"
        : "Not Pending",
    lockbox_status: cleanString(row["Lockbox Status"]),
    is_for_sale: toBoolean(row["Is for Sale"]),
    link: cleanString(row["Link"]),
    alert:
      blockers[0] && blockers[0] !== "No active blockers"
        ? `Attention required: ${blockers[0]}.`
        : "Turn is progressing without major blockers.",
    insight:
      delayDrivers.length > 0
        ? `${delayDrivers[0].label} is currently the strongest modeled execution risk.`
        : "Turn is moving through the workflow with limited modeled friction.",
  };

  turn.timeline = buildTimeline(turn);

  return turn;
}

export function validateImportRows(rows) {
  const warnings = [];
  const missingRequiredFields = [];

  REQUIRED_IMPORT_FIELDS.forEach((field) => {
    if (!rows.length || !Object.prototype.hasOwnProperty.call(rows[0], field)) {
      missingRequiredFields.push(field);
    }
  });

  rows.forEach((row, index) => {
    if (!cleanString(row["Full Address"])) {
      warnings.push(`Row ${index + 2}: Missing Full Address`);
    }
    if (!cleanString(row["Market"])) {
      warnings.push(`Row ${index + 2}: Missing Market`);
    }
    if (!parseDate(row["Current Estimated Rent Ready Date"])) {
      warnings.push(`Row ${index + 2}: Missing or invalid Current Estimated Rent Ready Date`);
    }
    if (!cleanString(row["Turn Stage"]) && !cleanString(row["Stage"])) {
      warnings.push(`Row ${index + 2}: Missing Turn Stage / Stage`);
    }
  });

  return {
    isValid: missingRequiredFields.length === 0,
    missingRequiredFields,
    warnings: warnings.slice(0, 20),
  };
}

export function parseCsvText(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const rows = [];
  const headers = parseCsvLine(lines[0]);

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });

    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, ""));
}

export function importRowsToTurnIQ(rows) {
  return rows.map((row, index) => mapRawRowToTurnIQTurn(row, index));
}