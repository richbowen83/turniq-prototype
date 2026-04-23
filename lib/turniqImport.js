import { getRecommendedAction } from "./actionEngine";
export const REQUIRED_IMPORT_FIELDS = [
  "Request Id",
  "Full Address",
  "Market",
  "Turn Status",
  "Turn Stage",
  "Assignee",
  "Current Estimated Rent Ready Date",
];

export const TURNIQ_TARGET_FIELDS = [
  { key: "requestId", label: "Request Id", required: true },
  { key: "unitId", label: "Unit Id", required: false },
  { key: "fullAddress", label: "Full Address", required: true },
  { key: "market", label: "Market", required: true },
  { key: "ownerNames", label: "Owner Names", required: false },
  { key: "ownerType", label: "Owner Type", required: false },
  { key: "legalEntityName", label: "Legal Entity Name", required: false },
  { key: "turnStatus", label: "Turn Status", required: true },
  { key: "turnStage", label: "Turn Stage", required: true },
  { key: "stage", label: "Stage", required: false },
  { key: "assignee", label: "Assignee", required: true },
  { key: "vendors", label: "Vendors", required: false },
  { key: "moveOutDate", label: "Move Out Date", required: false },
  { key: "turnStartDate", label: "Turn Start Date", required: false },
  { key: "currentEstimatedRentReadyDate", label: "Current Estimated Rent Ready Date", required: true },
  { key: "initialEstimatedRentReadyDate", label: "Initial Estimated Rent Ready Date", required: false },
  { key: "daysOpen", label: "Days Open", required: false },
  { key: "currentDaysInStage", label: "Current Days in Stage", required: false },
  { key: "turnType", label: "Turn Type", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "estimateCost", label: "Estimate Cost", required: false },
  { key: "approvedCost", label: "Approved Cost", required: false },
  { key: "moiStatus", label: "Moi Status", required: false },
  { key: "rriStatus", label: "Rri Status", required: false },
  { key: "rriInspectionResult", label: "Rri Inspection Result", required: false },
  { key: "lockboxStatus", label: "Lockbox Status", required: false },
  { key: "latestInvestorApprovalRequestedAt", label: "Latest Investor Approval Requested At", required: false },
  { key: "latestInvestorApprovalResponseAt", label: "Latest Investor Approval Response At", required: false },
  { key: "daysSinceLatestLockboxAccess", label: "Days Since Latest Lockbox Access", required: false },
  { key: "woEstimatesCount", label: "Wo Estimates Count", required: false },
  { key: "woApprovedCount", label: "Wo Approved Count", required: false },
  { key: "region", label: "Region", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "propertyManagementCompany", label: "Property Management Company", required: false },
  { key: "isForSale", label: "Is for Sale", required: false },
  { key: "link", label: "Link", required: false },
];

export const FIELD_TO_TAB_MAPPING = [
  { field: "Turn Stage", tabs: ["Control Center", "Pipeline", "Forecast"] },
  { field: "Turn Status", tabs: ["Control Center", "Pipeline"] },
  { field: "Current Estimated Rent Ready Date", tabs: ["Control Center", "Pipeline", "Forecast", "Analytics"] },
  { field: "Move Out Date", tabs: ["Pipeline", "Forecast"] },
  { field: "Vendors", tabs: ["Pipeline", "Vendors"] },
  { field: "Assignee", tabs: ["Control Center", "Pipeline"] },
  { field: "Estimate Cost / Approved Cost", tabs: ["Analytics", "Turn Drawer"] },
  { field: "Notes", tabs: ["Turn Drawer", "Forecast"] },
  { field: "Risk (computed)", tabs: ["Control Center", "Vendors", "Analytics"] },
  { field: "Readiness (computed)", tabs: ["Control Center", "Pipeline", "Turn Drawer"] },
];

const FIELD_ALIASES = {
  requestId: ["Request Id", "RequestID", "Turn Request Id", "Turn Id", "id", "property_id"],
  unitId: ["Unit Id", "UnitID", "Property Id", "unitId"],
  fullAddress: ["Full Address", "Address", "Property Address", "name", "property_address"],
  market: ["Market", "market", "market_name"],
  ownerNames: ["Owner Names", "Owner Name"],
  ownerType: ["Owner Type"],
  legalEntityName: ["Legal Entity Name", "Entity", "Owner Legal Entity"],
  turnStatus: ["Turn Status", "Status", "turnStatus", "status_name"],
  turnStage: ["Turn Stage", "currentStage", "stage_name"],
  stage: ["Stage"],
  assignee: ["Assignee", "Owner", "turnOwner", "assigned_to"],
  vendors: ["Vendors", "Vendor", "Assigned Vendor", "vendor", "assigned_vendor"],
  moveOutDate: ["Move Out Date", "Lease End", "leaseEnd", "move_out"],
  turnStartDate: ["Turn Start Date"],
  currentEstimatedRentReadyDate: [
    "Current Estimated Rent Ready Date",
    "Estimated Rent Ready Date",
    "ECD",
    "Projected Completion",
    "projectedCompletion",
    "ecd",
  ],
  initialEstimatedRentReadyDate: ["Initial Estimated Rent Ready Date", "initial_ecd"],
  daysOpen: ["Days Open", "Open Days", "days_open"],
  currentDaysInStage: ["Current Days in Stage", "Days In Stage", "daysInStage", "stage_age_days"],
  turnType: ["Turn Type"],
  notes: ["Notes", "blockers", "notes_text"],
  estimateCost: ["Estimate Cost", "Estimated Cost", "projectedCost", "estimated_cost"],
  approvedCost: ["Approved Cost", "approved_cost"],
  risk: ["Risk", "risk"],
  moiStatus: ["Moi Status", "moi_state"],
  rriStatus: ["Rri Status", "rri_state"],
  rriInspectionResult: ["Rri Inspection Result"],
  lockboxStatus: ["Lockbox Status", "lockbox_state"],
  latestInvestorApprovalRequestedAt: [
    "Latest Investor Approval Requested At",
    "latest_approval_requested_at",
  ],
  latestInvestorApprovalResponseAt: [
    "Latest Investor Approval Response At",
    "latest_approval_response_at",
  ],
  daysSinceLatestLockboxAccess: [
    "Days Since Latest Lockbox Access",
    "access_days_since",
  ],
  woEstimatesCount: ["Wo Estimates Count", "wo_estimate_count"],
  woApprovedCount: ["Wo Approved Count", "wo_approved_count"],
  region: ["Region", "region_name"],
  city: ["City", "city_name"],
  state: ["State", "state_code"],
  propertyManagementCompany: ["Property Management Company"],
  isForSale: ["Is for Sale"],
  link: ["Link"],
};

const TARGET_KEY_TO_LABEL = Object.fromEntries(
  TURNIQ_TARGET_FIELDS.map((field) => [field.key, field.label])
);

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

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return raw;
  }

  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, "0");
    const day = usMatch[2].padStart(2, "0");
    const year = usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

function addDays(dateStr, days) {
  const raw = parseDate(dateStr);
  if (!raw) return "";
  const d = new Date(raw);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function shortAddress(fullAddress) {
  const raw = cleanString(fullAddress);
  if (!raw) return "";
  return raw.split(",")[0]?.trim() || raw;
}

export function getHeadersFromRows(rows) {
  if (!rows?.length) return [];
  return Object.keys(rows[0] || {});
}

export function buildSuggestedMappings(headers) {
  const suggestions = {};
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    key: toKey(header),
  }));

  TURNIQ_TARGET_FIELDS.forEach((field) => {
    const aliases = FIELD_ALIASES[field.key] || [];
    const normalizedAliases = aliases.map((alias) => toKey(alias));

    const matchedHeader = normalizedHeaders.find((header) =>
      normalizedAliases.includes(header.key)
    );

    suggestions[field.key] = matchedHeader?.raw || "";
  });

  return suggestions;
}

export function getMappingCompleteness(mapping) {
  const missingRequired = TURNIQ_TARGET_FIELDS
    .filter((field) => field.required)
    .filter((field) => !cleanString(mapping[field.key]))
    .map((field) => field.label);

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
  };
}

export function normalizeRowsWithMapping(rows, mapping) {
  return rows.map((row) => {
    const normalized = {};

    TURNIQ_TARGET_FIELDS.forEach((field) => {
      const sourceHeader = mapping[field.key];
      normalized[TARGET_KEY_TO_LABEL[field.key]] = sourceHeader
        ? row[sourceHeader] ?? ""
        : "";
    });

    return normalized;
  });
}

function getRiskDelay(risk) {
  if (risk >= 85) return 4;
  if (risk >= 75) return 3;
  if (risk >= 65) return 2;
  if (risk >= 55) return 1;
  return 0;
}

function getStageDelay(stage) {
  if (stage === "Owner Approval") return 3;
  if (stage === "Dispatch") return 2;
  if (stage === "Scope Review") return 2;
  if (stage === "Move Out Inspection") return 1;
  return 0;
}

function getBlockerSeverity(blocker) {
  const b = cleanString(blocker).toLowerCase();
  if (
    b.includes("approval") ||
    b.includes("access") ||
    b.includes("hvac") ||
    b.includes("inspection")
  ) {
    return 2;
  }
  return 1;
}

function buildForecastFields(projectedCompletion, risk, currentStage, blockers) {
  const liveBlockers = (blockers || []).filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );

  const forecastDaysLate =
    getRiskDelay(risk) +
    getStageDelay(currentStage) +
    liveBlockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);

  const forecastCompletion = addDays(projectedCompletion, forecastDaysLate);
  const forecastConfidence = Math.max(
    40,
    Math.min(95, Math.round(100 - risk * 0.5 - liveBlockers.length * 5))
  );

  const forecastRiskBand =
    forecastDaysLate >= 4
      ? "High Delay Risk"
      : forecastDaysLate >= 2
      ? "Watch"
      : "On Track";

  const forecastInsight =
    forecastDaysLate >= 4
      ? "Material slippage risk is modeled. Prioritize blocker removal and execution acceleration."
      : forecastDaysLate >= 2
      ? "Moderate delay risk is modeled. Focus on the highest-friction execution points."
      : "Current forecast remains close to the stated ECD.";

  const forecastDelayDrivers = [
    ...(getRiskDelay(risk) > 0
      ? [{ label: `Risk score pressure (${risk})`, days: getRiskDelay(risk) }]
      : []),
    ...(getStageDelay(currentStage) > 0
      ? [{ label: `${currentStage} stage pressure`, days: getStageDelay(currentStage) }]
      : []),
    ...liveBlockers.map((blocker) => ({
      label: blocker,
      days: getBlockerSeverity(blocker),
    })),
  ];

  return {
    forecastCompletion,
    forecastDaysLate,
    forecastConfidence,
    forecastRiskBand,
    forecastInsight,
    forecastDelayDrivers:
      forecastDelayDrivers.length > 0
        ? forecastDelayDrivers
        : [{ label: "Standard execution variability", days: 0 }],
  };
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

  if (notes.includes("paint") || notes.includes("patch") || turnType.includes("standard")) {
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

  if (
    currentStage === "Pending RRI" ||
    (rriStatus && !["COMPLETE", "PASSED"].includes(toKey(rriStatus)))
  ) {
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
  const start =
    parseDate(turn.move_out_date) ||
    parseDate(turn.turn_start_date) ||
    turn.projected_completion;

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
      progress: ["Scope Review", "Owner Approval", "Dispatch", "Pending RRI", "Rent Ready Open"].includes(
        turn.current_stage
      )
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

export function validateRowsWithMapping(rows, mapping) {
  const completeness = getMappingCompleteness(mapping);
  const warnings = [];

  if (!completeness.isValid) {
    return {
      isValid: false,
      missingRequiredFields: completeness.missingRequired,
      warnings,
    };
  }

  const normalizedRows = normalizeRowsWithMapping(rows, mapping);

  normalizedRows.forEach((row, index) => {
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
    isValid: true,
    missingRequiredFields: [],
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

export function mapRawRowToTurnIQTurn(row, index = 0) {
  const blockers = inferBlockers(row);
  const delayDrivers = inferDelayDrivers(row, blockers);

  const currentStage = normalizeStage(row["Turn Stage"], row["Stage"]);
  const turnStatus = normalizeStatus(row["Turn Status"]);

  const projectedCompletion =
    parseDate(row["Current Estimated Rent Ready Date"]) ||
    parseDate(row["Scheduled Turn End Date"]) ||
    parseDate(row["Initial Estimated Rent Ready Date"]) ||
    "";

  const moveOutDate = parseDate(row["Move Out Date"]);
  const turnStartDate = parseDate(row["Turn Start Date"]);
  const pmDispatchDate =
    parseDate(row["Property Management Company Dispatch Date"]) ||
    parseDate(row["PM Dispatch Date"]);

  const initialECD = parseDate(row["Initial Estimated Rent Ready Date"]);

  const daysOpen = toNumber(row["Days Open"]);
  const stageAgeDays = toNumber(row["Current Days in Stage"]);
  const estimatedCost = toNumber(row["Estimate Cost"]);
  const approvedCost = toNumber(row["Approved Cost"]);

  const woEstimateCount = toNumber(row["Wo Estimates Count"]);
  const woApprovedCount = toNumber(row["Wo Approved Count"]);
  const accessDaysSince = toNumber(row["Days Since Latest Lockbox Access"]);

  const notes = cleanString(row["Notes"]);
  const vendor = cleanString(row["Vendors"]) || "TBD";
  const assignee = cleanString(row["Assignee"]) || "Unassigned";

  const moiState = cleanString(row["Moi Status"]);
  const rriState = cleanString(row["Rri Status"]);
  const rriInspectionResult = cleanString(row["Rri Inspection Result"]);
  const lockboxState = cleanString(row["Lockbox Status"]);

  const approvalRequestedAt = parseDate(row["Latest Investor Approval Requested At"]);
  const approvalResponseAt = parseDate(row["Latest Investor Approval Response At"]);

  const risk = computeRiskScore(row, blockers);
  const readiness = computeReadinessScore(row, blockers);
  const timelineConfidence = computeTimelineConfidence(row, blockers);

  const forecastFields = buildForecastFields(
    projectedCompletion,
    risk,
    currentStage,
    blockers
  );

  const ecdDeltaDays =
    moveOutDate && projectedCompletion
      ? Math.round(
          (new Date(projectedCompletion) - new Date(moveOutDate)) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const ecdReason =
    blockers.length > 0 ? blockers[0] : "No material delay drivers";

  const turn = {
    id: cleanString(row["Request Id"]) || `import-${index + 1}`,
    request_id: cleanString(row["Request Id"]),
    turn_id: cleanString(row["Request Id"]),

    property_id: cleanString(row["Unit Id"]) || `unit-${index + 1}`,
    unit_id: cleanString(row["Unit Id"]),

    property_name: cleanString(row["Full Address"]),
    name: shortAddress(row["Full Address"]) || `Property ${index + 1}`,

    market: cleanString(row["Market"]) || "Unknown",
    region: cleanString(row["Region"]),
    city: cleanString(row["City"]),
    state: cleanString(row["State"]),

    owner_name: cleanString(row["Owner Names"]),
    owner_type: cleanString(row["Owner Type"]),
    legal_entity_name: cleanString(row["Legal Entity Name"]),
    property_management_company:
      cleanString(row["Property Management Company"]) || "Imported Portfolio",

    vendor,
    turnOwner: assignee,
    turn_owner: assignee,
    operator: assignee,

    currentStage,
    current_stage: currentStage,
    turnStatus,
    turn_status: turnStatus,

    projectedCompletion,
    projected_completion: projectedCompletion,
    initialProjectedCompletion: initialECD,
    initial_estimated_completion: initialECD,

    moveOutDate,
    move_out_date: moveOutDate,
    leaseEnd: moveOutDate || projectedCompletion,
    lease_end_date: moveOutDate || projectedCompletion,

    turnStartDate,
    turn_start_date: turnStartDate,
    pmDispatchDate,
    pm_dispatch_date: pmDispatchDate,

    openDays: daysOpen,
    days_open: daysOpen,
    daysInStage: stageAgeDays,
    days_in_stage: stageAgeDays,
    stage_age_days: stageAgeDays,

    estimatedCost,
    estimated_cost: estimatedCost,
    approvedCost,
    approved_cost: approvedCost,
    projectedCost: approvedCost || estimatedCost,
    projected_cost: approvedCost || estimatedCost,

    risk,
    risk_score: risk,
    readiness,
    readiness_score: readiness,
    timelineConfidence,
    timeline_confidence: timelineConfidence,

    notes,
    scope_text: notes,
    scope: inferScopeCategory(row),
    scope_category: inferScopeCategory(row),

    moiStatus: moiState,
    moi_state: moiState,
    rriStatus: rriState,
    rri_state: rriState,
    rri_result: rriInspectionResult,
    inspection_status: rriInspectionResult || moiState,

    lockboxStatus: lockboxState,
    lockbox_status: lockboxState,
    accessDaysSince,
    access_days_since: accessDaysSince,

    woEstimatesCount: woEstimateCount,
    woApprovedCount: woApprovedCount,
    wo_estimate_count: woEstimateCount,
    wo_approved_count: woApprovedCount,

    latestApprovalRequestedAt: approvalRequestedAt,
    latestApprovalResponseAt: approvalResponseAt,
    latest_approval_requested_at: approvalRequestedAt,
    latest_approval_response_at: approvalResponseAt,

    approval_status:
      approvalRequestedAt && !approvalResponseAt ? "Pending" : "Not Pending",

    blockers,
    delayDrivers,
    delay_drivers: delayDrivers,

    ecd_delta_days: ecdDeltaDays,
    ecd_reason: ecdReason,

    alert:
      blockers[0] && blockers[0] !== "No active blockers"
        ? `Attention: ${blockers[0]}`
        : "No major blockers",

    insight:
      delayDrivers.length > 0
        ? delayDrivers[0].label
        : "No major risk drivers",

    turn_type: cleanString(row["Turn Type"]),
    isForSale: toBoolean(row["Is for Sale"]),
    is_for_sale: toBoolean(row["Is for Sale"]),
    link: cleanString(row["Link"]),

    ...forecastFields,
  };

  turn.timeline = buildTimeline(turn);

  try {
    turn.recommendation = getRecommendedAction(turn);
  } catch (error) {
    console.error("Failed to compute recommendation", error);
    turn.recommendation = null;
  }

  return turn;
}

export function importRowsToTurnIQ(rows) {
  return rows.map((row, index) => mapRawRowToTurnIQTurn(row, index));
}

export function importRowsToTurnIQWithMapping(rows, mapping) {
  const normalizedRows = normalizeRowsWithMapping(rows, mapping);
  return importRowsToTurnIQ(normalizedRows);
}