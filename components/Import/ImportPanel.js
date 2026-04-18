"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import {
  buildSuggestedMappings,
  FIELD_TO_TAB_MAPPING,
  getHeadersFromRows,
  getMappingCompleteness,
  importRowsToTurnIQWithMapping,
  parseCsvText,
  REQUIRED_IMPORT_FIELDS,
  TURNIQ_TARGET_FIELDS,
  validateRowsWithMapping,
} from "../../lib/turniqImport";

function downloadCsv(filename, rows) {
  if (!rows?.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const SAMPLE_PMS_EXPORT = [
  {
    "Request Id": "REQ-1001",
    "Unit Id": "UNIT-4001",
    "Full Address": "123 Main St, Dallas, TX",
    Market: "Dallas",
    "Owner Names": "Owner 1",
    "Legal Entity Name": "Entity 1",
    "Turn Status": "OPEN",
    "Turn Stage": "SCOPE_REVIEW",
    Assignee: "Ashley",
    Vendors: "FloorCo",
    "Current Estimated Rent Ready Date": "2026-05-10",
    "Initial Estimated Rent Ready Date": "2026-05-08",
    "Move Out Date": "2026-05-03",
    "Days Open": "8",
    "Current Days in Stage": "3",
    "Estimate Cost": "3200",
    "Approved Cost": "3100",
    Notes: "Paint and flooring. Appliance ETA pending.",
  },
  {
    "Request Id": "REQ-1002",
    "Unit Id": "UNIT-4002",
    "Full Address": "456 Oak Ave, Phoenix, AZ",
    Market: "Phoenix",
    "Owner Names": "Owner 2",
    "Legal Entity Name": "Entity 2",
    "Turn Status": "ON HOLD",
    "Turn Stage": "OWNER_APPROVAL",
    Assignee: "Megan",
    Vendors: "CoolAir",
    "Current Estimated Rent Ready Date": "2026-05-12",
    "Initial Estimated Rent Ready Date": "2026-05-09",
    "Move Out Date": "2026-05-01",
    "Days Open": "12",
    "Current Days in Stage": "5",
    "Estimate Cost": "5400",
    "Approved Cost": "0",
    Notes: "HVAC issue. Waiting on approval.",
  },
  {
    "Request Id": "REQ-1003",
    "Unit Id": "UNIT-4003",
    "Full Address": "321 Peach Ln, Atlanta, GA",
    Market: "Atlanta",
    "Owner Names": "Owner 3",
    "Legal Entity Name": "Entity 3",
    "Turn Status": "OPEN",
    "Turn Stage": "PENDING_RRI",
    Assignee: "Mike",
    Vendors: "ABC Paint",
    "Current Estimated Rent Ready Date": "2026-05-06",
    "Initial Estimated Rent Ready Date": "2026-05-05",
    "Move Out Date": "2026-05-02",
    "Days Open": "4",
    "Current Days in Stage": "2",
    "Estimate Cost": "2200",
    "Approved Cost": "2200",
    Notes: "Paint completed. Pending final RRI.",
  },
];

const SAMPLE_OPERATOR_EXPORT_BASIC = [
  {
    id: "OP-2001",
    name: "789 Desert Ave, Phoenix, AZ",
    market: "Phoenix",
    currentStage: "Owner Approval",
    turnStatus: "Blocked",
    projectedCompletion: "2026-05-08",
    projectedCost: "6200",
    vendor: "CoolAir",
    turnOwner: "Sarah",
    daysInStage: "6",
    blockers: "HVAC delay",
    leaseEnd: "2026-05-02",
  },
  {
    id: "OP-2002",
    name: "321 Peach Ln, Atlanta, GA",
    market: "Atlanta",
    currentStage: "Rent Ready Open",
    turnStatus: "Ready",
    projectedCompletion: "2026-05-06",
    projectedCost: "2800",
    vendor: "ABC Paint",
    turnOwner: "Mike",
    daysInStage: "2",
    blockers: "",
    leaseEnd: "2026-05-03",
  },
];

const SAMPLE_OPERATOR_EXPORT_ADVANCED = [
  {
    property_id: "TURN-3001",
    property_address: "1450 Cedar Park Dr, Dallas, TX",
    market_name: "Dallas",
    stage_name: "Scope Review",
    status_name: "Open",
    assigned_to: "Ashley",
    assigned_vendor: "FloorCo",
    ecd: "2026-05-11",
    initial_ecd: "2026-05-08",
    move_out: "2026-05-04",
    days_open: "7",
    stage_age_days: "4",
    estimated_cost: "4100",
    approved_cost: "3800",
    notes_text: "Flooring and paint. Appliance ETA pending.",
    lockbox_state: "Assigned",
    rri_state: "",
    moi_state: "Complete",
    wo_estimate_count: "2",
    wo_approved_count: "1",
    latest_approval_requested_at: "2026-05-06",
    latest_approval_response_at: "",
    access_days_since: "5",
    city_name: "Dallas",
    state_code: "TX",
    region_name: "Central",
  },
  {
    property_id: "TURN-3002",
    property_address: "612 Music Row Ave, Nashville, TN",
    market_name: "Nashville",
    stage_name: "Dispatch",
    status_name: "Open",
    assigned_to: "Justin",
    assigned_vendor: "Music City Maintenance",
    ecd: "2026-05-13",
    initial_ecd: "2026-05-10",
    move_out: "2026-05-05",
    days_open: "6",
    stage_age_days: "3",
    estimated_cost: "1900",
    approved_cost: "1900",
    notes_text: "Cleaning and patch. Vendor scheduled.",
    lockbox_state: "Assigned",
    rri_state: "",
    moi_state: "Complete",
    wo_estimate_count: "1",
    wo_approved_count: "1",
    latest_approval_requested_at: "",
    latest_approval_response_at: "",
    access_days_since: "2",
    city_name: "Nashville",
    state_code: "TN",
    region_name: "Central",
  },
  {
    property_id: "TURN-3003",
    property_address: "88 Camelback Rd, Phoenix, AZ",
    market_name: "Phoenix",
    stage_name: "Owner Approval",
    status_name: "On Hold",
    assigned_to: "Megan",
    assigned_vendor: "Prime Paint",
    ecd: "2026-05-14",
    initial_ecd: "2026-05-10",
    move_out: "2026-05-02",
    days_open: "10",
    stage_age_days: "5",
    estimated_cost: "5600",
    approved_cost: "0",
    notes_text: "Approval pending. Trade coordination risk.",
    lockbox_state: "Missing",
    rri_state: "",
    moi_state: "Complete",
    wo_estimate_count: "3",
    wo_approved_count: "1",
    latest_approval_requested_at: "2026-05-07",
    latest_approval_response_at: "",
    access_days_since: "9",
    city_name: "Phoenix",
    state_code: "AZ",
    region_name: "West",
  },
];

const COMPUTED_FIELDS = [
  "Readiness score",
  "Risk score",
  "Delay drivers",
  "Forecast confidence",
  "Alerts",
  "Insights",
];

function renderTargetFieldLabel(field) {
  return (
    <div className="flex items-center gap-2">
      <span>{field.label}</span>
      {field.required ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
          Required
        </span>
      ) : (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          Optional
        </span>
      )}
    </div>
  );
}

function getFieldStatusTone(required, mapped) {
  if (required && !mapped) return "text-red-700";
  if (mapped) return "text-emerald-700";
  return "text-slate-400";
}

function getFieldStatusLabel(required, mapped) {
  if (required && !mapped) return "Required";
  if (mapped) return "Mapped";
  return "Ignored";
}

export default function ImportPanel({
  onImport,
  onClearSuccess,
  onClearImportedData,
  onUndoImport,
  canUndoImport,
  hasImportedData,
  importMode,
  setImportMode,
  lastImportCount,
  lastSkippedCount,
  lastImportTimestamp,
}) {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validation, setValidation] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [error, setError] = useState("");
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  useEffect(() => {
    if (!hasImportedData || lastImportCount <= 0) {
      setShowImportSuccess(false);
      return;
    }

    setShowImportSuccess(true);

    const timer = setTimeout(() => {
      setShowImportSuccess(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, [hasImportedData, lastImportCount, lastImportTimestamp]);

  const mappingCompleteness = useMemo(
    () => getMappingCompleteness(mapping),
    [mapping]
  );

  const mappedCount = useMemo(
    () => Object.values(mapping).filter(Boolean).length,
    [mapping]
  );

  function refreshValidation(rows, nextMapping) {
    const nextValidation = validateRowsWithMapping(rows, nextMapping);
    setValidation(nextValidation);

    if (nextValidation.isValid) {
      const nextPreview = importRowsToTurnIQWithMapping(rows, nextMapping).slice(0, 5);
      setPreviewRows(nextPreview);
    } else {
      setPreviewRows([]);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsedRows = parseCsvText(text);

        if (!parsedRows.length) {
          setError("The CSV appears to be empty.");
          setRawRows([]);
          setHeaders([]);
          setMapping({});
          setValidation(null);
          setPreviewRows([]);
          return;
        }

        const detectedHeaders = getHeadersFromRows(parsedRows);
        const suggestedMapping = buildSuggestedMappings(detectedHeaders);

        setRawRows(parsedRows);
        setHeaders(detectedHeaders);
        setMapping(suggestedMapping);
        refreshValidation(parsedRows, suggestedMapping);
      } catch {
        setError("Unable to parse CSV file.");
        setRawRows([]);
        setHeaders([]);
        setMapping({});
        setValidation(null);
        setPreviewRows([]);
      }
    };

    reader.readAsText(file);
  }

  function handleMappingChange(fieldKey, headerName) {
    const nextMapping = {
      ...mapping,
      [fieldKey]: headerName,
    };

    setMapping(nextMapping);
    refreshValidation(rawRows, nextMapping);
  }

  function handleImport() {
    if (!validation?.isValid || !rawRows.length) return;
    const importedTurns = importRowsToTurnIQWithMapping(rawRows, mapping);
    onImport(importedTurns);
  }

  function handleClear() {
    setFileName("");
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setValidation(null);
    setPreviewRows([]);
    setError("");
    onClearSuccess?.();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-slate-900">Import</div>
        <div className="mt-1 text-sm text-slate-500">
          Connect a PMS export or operator-maintained CSV into TurnIQ. TurnIQ normalizes the file,
          computes operating signals, and pushes one shared dataset across the workspace.
        </div>
      </div>

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">What this powers</div>
            <div className="mt-1 text-sm text-slate-600">
              One import feeds the full operating surface.
            </div>
          </div>

          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            Shared dataset across tabs
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5 text-sm">
          {["Control Center", "Pipeline", "Forecast", "Vendors", "Analytics"].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 space-y-6">
          <Card>
            <div className="text-sm font-semibold text-slate-900">Upload CSV</div>
            <div className="mt-2 text-sm text-slate-500">
              Use either a PMS export or an operator file. TurnIQ will map, normalize, and compute
              the missing operating signals after import.
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-4 block w-full text-sm text-slate-600"
            />

            {fileName ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {fileName}
              </div>
            ) : null}

            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Import mode
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    importMode === "replace"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Replace
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("append")}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    importMode === "append"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Append
                </button>
              </div>

              <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                Replace overwrites the imported dataset. Append adds new rows and skips duplicate
                turn IDs.
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleImport}
                disabled={!validation?.isValid || !rawRows.length}
                className={`rounded-xl px-4 py-2 text-sm ${
                  validation?.isValid && rawRows.length
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                Import turns
              </button>

              <button
                onClick={handleClear}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Reset file
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Operators should not supply readiness or risk. TurnIQ computes both after import.
            </div>

            <div
              className={`mt-4 overflow-hidden transition-all duration-500 ${
                showImportSuccess ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {lastImportCount} turns imported
                {lastSkippedCount > 0 ? ` • ${lastSkippedCount} duplicates skipped` : ""}
              </div>
            </div>

            {lastImportTimestamp ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Last import: {new Date(lastImportTimestamp).toLocaleString()}
                </div>

                {canUndoImport ? (
                  <button
                    type="button"
                    onClick={onUndoImport}
                    className="text-xs font-medium text-amber-700 hover:underline"
                  >
                    Undo
                  </button>
                ) : null}
              </div>
            ) : null}

            {hasImportedData ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onClearImportedData}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Revert to demo dataset
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="mt-2 text-sm text-slate-500">
  Test one clean PMS export, one simple operator file, and one advanced operator file with non-standard headers.
</div>

            <div className="mt-3 space-y-2">
              <button
                onClick={() => downloadCsv("turniq_pms_export_example.csv", SAMPLE_PMS_EXPORT)}
                className="w-full rounded-xl border px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                Download PMS export example
              </button>

              <button
                onClick={() =>
                  downloadCsv(
                    "turniq_operator_export_basic_example.csv",
                    SAMPLE_OPERATOR_EXPORT_BASIC
                  )
                }
                className="w-full rounded-xl border px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                Download operator basic example
              </button>

              <button
                onClick={() =>
                  downloadCsv(
                    "turniq_operator_export_advanced_example.csv",
                    SAMPLE_OPERATOR_EXPORT_ADVANCED
                  )
                }
                className="w-full rounded-xl border px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                Download operator advanced example
              </button>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-slate-900">Computed by TurnIQ</div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {COMPUTED_FIELDS.map((item) => (
                <div key={item} className="rounded-xl bg-slate-50 px-3 py-2">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-slate-900">Minimum required mapped fields</div>
            <div className="mt-3 space-y-1 text-sm">
              {REQUIRED_IMPORT_FIELDS.map((field) => (
                <div key={field} className="rounded-lg bg-slate-50 px-3 py-2">
                  {field}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Validation</div>
                <div className="mt-1 text-sm text-slate-500">
                  Mapping-aware validation against TurnIQ’s normalized schema.
                </div>
              </div>

              {validation ? (
                <div
                  className={`rounded-xl px-3 py-2 text-xs ${
                    validation.isValid
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {validation.isValid ? "Ready to import" : "Action required"}
                </div>
              ) : null}
            </div>

            {!validation ? (
              <div className="mt-3 text-sm text-slate-500">
                Upload a CSV to detect headers, suggest mappings, and validate rows.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  Rows detected:{" "}
                  <span className="font-medium text-slate-900">{rawRows.length}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  Uploaded columns:{" "}
                  <span className="font-medium text-slate-900">{headers.length}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  Fields mapped:{" "}
                  <span className="font-medium text-slate-900">{mappedCount}</span>
                </div>

                {!mappingCompleteness.isValid ? (
                  <div className="md:col-span-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                    <div className="font-medium">Missing required mappings</div>
                    <ul className="mt-2 space-y-1">
                      {mappingCompleteness.missingRequired.map((field) => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {validation.warnings?.length ? (
                  <div className="md:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    <div className="font-medium">Warnings</div>
                    <ul className="mt-2 space-y-1">
                      {validation.warnings.map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-sm font-semibold text-slate-900">Column mapping</div>
            <div className="mt-1 text-sm text-slate-500">
              Review TurnIQ’s suggested mapping. Required fields must be mapped before import.
            </div>

            {!headers.length ? (
              <div className="mt-3 text-sm text-slate-500">
                Upload a file to configure mappings.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">TurnIQ field</th>
                      <th className="px-3 py-2 font-medium">Map from uploaded column</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TURNIQ_TARGET_FIELDS.map((field) => {
                      const mapped = Boolean(mapping[field.key]);

                      return (
                        <tr key={field.key} className="border-t border-slate-100">
                          <td className="px-3 py-3">{renderTargetFieldLabel(field)}</td>
                          <td className="px-3 py-3">
                            <select
                              value={mapping[field.key] || ""}
                              onChange={(e) =>
                                handleMappingChange(field.key, e.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            >
                              <option value="">Ignore / not mapped</option>
                              {headers.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={`px-3 py-3 ${getFieldStatusTone(field.required, mapped)}`}>
                            {getFieldStatusLabel(field.required, mapped)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="text-sm font-semibold text-slate-900">Field → tab mapping</div>
            <div className="mt-1 text-sm text-slate-500">
              This shows where imported data is consumed in the workspace.
            </div>

            <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              {FIELD_TO_TAB_MAPPING.map((item) => (
                <div key={item.field} className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-medium text-slate-900">{item.field}</span>
                  <span className="text-slate-500"> → {item.tabs.join(" / ")}</span>
                </div>
              ))}
            </div>
          </Card>

          {previewRows.length ? (
            <Card>
              <div className="text-sm font-semibold text-slate-900">Normalized preview</div>
              <div className="mt-1 text-sm text-slate-500">
                This is how uploaded rows look after TurnIQ maps the file, standardizes stages and statuses, and computes risk, readiness, delay drivers, and forecast signals.
              </div>

              <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Property</th>
                      <th className="px-3 py-2 font-medium">Market</th>
                      <th className="px-3 py-2 font-medium">Stage</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Vendor</th>
                      <th className="px-3 py-2 font-medium">ECD</th>
                      <th className="px-3 py-2 font-medium">Risk</th>
                      <th className="px-3 py-2 font-medium">Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-3">{row.name}</td>
                        <td className="px-3 py-3">{row.market}</td>
                        <td className="px-3 py-3">{row.currentStage}</td>
                        <td className="px-3 py-3">{row.turnStatus}</td>
                        <td className="px-3 py-3">{row.vendor}</td>
                        <td className="px-3 py-3">{row.projectedCompletion}</td>
                        <td className="px-3 py-3">{row.risk}</td>
                        <td className="px-3 py-3">{row.readiness}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}