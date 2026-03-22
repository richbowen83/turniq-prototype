"use client";

import { useEffect, useState } from "react";
import Card from "../shared/Card";
import {
  parseCsvText,
  validateImportRows,
  importRowsToTurnIQ,
  REQUIRED_IMPORT_FIELDS,
} from "../../lib/turniqImport";

const TURNIQ_TEST_HEADERS = [
  "id",
  "name",
  "market",
  "currentStage",
  "turnStatus",
  "readiness",
  "risk",
  "projectedCompletion",
  "projectedCost",
  "vendor",
  "turnOwner",
  "daysInStage",
  "blockers",
];

function detectSchema(rows) {
  if (!rows?.length) return "unknown";

  const headers = Object.keys(rows[0] || {});
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());

  const looksLikeTurnIQTest = TURNIQ_TEST_HEADERS.every((field) =>
    lowerHeaders.includes(field.toLowerCase())
  );

  if (looksLikeTurnIQTest) return "turniq-demo";

  const looksLikePmsExport = REQUIRED_IMPORT_FIELDS.every((field) =>
    headers.includes(field)
  );

  if (looksLikePmsExport) return "pms-export";

  return "unknown";
}

function adaptTurnIQDemoRows(rows) {
  return rows.map((row, index) => ({
    "Request Id": row.id || `demo-${index + 1}`,
    "Unit Id": row.id || `unit-${index + 1}`,
    "Full Address": row.name || `Imported Property ${index + 1}`,
    Market: row.market || "Unknown",
    Region: "",
    "Owner Names": "Imported Owner",
    "Owner Type": "",
    "Legal Entity Name": "Imported Entity",
    "Turn Status": row.turnStatus || "Monitoring",
    "Turn Stage": row.currentStage || "Scope Review",
    Stage: row.currentStage || "Scope Review",
    Assignee: row.turnOwner || "Unassigned",
    Vendors: row.vendor || "TBD",
    "Move Out Date": row.projectedCompletion || "",
    "Turn Start Date": "",
    "Current Estimated Rent Ready Date": row.projectedCompletion || "",
    "Initial Estimated Rent Ready Date": row.projectedCompletion || "",
    "Days Open": row.daysInStage || 0,
    "Current Days in Stage": row.daysInStage || 0,
    "Turn Type": "",
    Notes: row.blockers || "",
    "Estimate Cost": row.projectedCost || 0,
    "Approved Cost": row.projectedCost || 0,
    Risk: row.risk || 0,
    Readiness: row.readiness || 0,
    "Rri Inspection Result": "",
    "Moi Status": "",
    "Rri Status": "",
    "Lockbox Status": "",
    Link: "",
    City: "",
    State: "",
    "Is for Sale": "false",
    "Property Management Company": "Darwin Homes",
  }));
}

function prepareRowsForImport(parsedRows) {
  const schema = detectSchema(parsedRows);

  if (schema === "turniq-demo") {
    return {
      schema,
      adaptedRows: adaptTurnIQDemoRows(parsedRows),
    };
  }

  return {
    schema,
    adaptedRows: parsedRows,
  };
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
  lastUploadedCount,
  lastSkippedCount,
  lastImportTimestamp,
}) {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [preparedRows, setPreparedRows] = useState([]);
  const [validation, setValidation] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [error, setError] = useState("");
  const [detectedSchema, setDetectedSchema] = useState("");
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
          setPreparedRows([]);
          setValidation(null);
          setPreviewRows([]);
          setDetectedSchema("");
          return;
        }

        const { schema, adaptedRows } = prepareRowsForImport(parsedRows);
        const nextValidation = validateImportRows(adaptedRows);
        const importedPreview = nextValidation.isValid
          ? importRowsToTurnIQ(adaptedRows).slice(0, 5)
          : [];

        setRawRows(parsedRows);
        setPreparedRows(adaptedRows);
        setValidation(nextValidation);
        setPreviewRows(importedPreview);
        setDetectedSchema(schema);

        if (schema === "unknown") {
          setError(
            "CSV schema not recognized. Use either the TurnIQ demo CSV format or the PMS export format."
          );
        }
      } catch {
        setError("Unable to parse CSV file.");
        setRawRows([]);
        setPreparedRows([]);
        setValidation(null);
        setPreviewRows([]);
        setDetectedSchema("");
      }
    };

    reader.readAsText(file);
  }

  function handleImport() {
    if (!validation?.isValid || !preparedRows.length) return;
    const importedTurns = importRowsToTurnIQ(preparedRows);
    onImport(importedTurns);
  }

  function handleClear() {
    setFileName("");
    setRawRows([]);
    setPreparedRows([]);
    setValidation(null);
    setPreviewRows([]);
    setError("");
    setDetectedSchema("");
    onClearSuccess?.();
  }

  function getSchemaLabel() {
    if (detectedSchema === "turniq-demo") return "TurnIQ demo schema detected";
    if (detectedSchema === "pms-export") return "PMS export schema detected";
    if (detectedSchema === "unknown" && rawRows.length) return "Unknown schema";
    return "CSV import v1";
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Import</div>
          <div className="mt-1 text-sm text-slate-500">
            Upload and normalize portfolio data into TurnIQ.
          </div>
        </div>

        <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {getSchemaLabel()}
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Upload</div>
            <div className="mt-2 text-sm text-slate-500">Required file format: CSV</div>

            <input
              id="turniq-import-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <label
              htmlFor="turniq-import-file"
              className="mt-4 inline-flex cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Choose CSV
            </label>

            {fileName ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
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
                <span className="font-medium text-slate-700">Replace</span> overwrites the
                current imported dataset.{" "}
                <span className="font-medium text-slate-700">Append</span> adds new rows and
                skips duplicate turn IDs.
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleImport}
                disabled={!validation?.isValid || !preparedRows.length}
                className={`rounded-xl px-4 py-2 text-sm ${
                  validation?.isValid && preparedRows.length
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
              Reset file clears the current upload preview. Revert to demo dataset removes
              imported data and restores the sample dataset.
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
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">Validation</div>

            {!validation ? (
              <div className="mt-3 text-sm text-slate-500">
                Upload a CSV to validate required fields and preview warnings.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  Rows detected:{" "}
                  <span className="font-medium text-slate-900">{rawRows.length}</span>
                </div>

                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    validation.isValid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {validation.isValid
                    ? "Required fields validated"
                    : "Missing required fields"}
                </div>

                {!validation.isValid ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div className="font-medium">Missing fields</div>
                    <ul className="mt-2 space-y-1">
                      {validation.missingRequiredFields.map((field) => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {validation.warnings?.length ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">Required columns</div>
            <div className="mt-3 max-h-[320px] overflow-y-auto space-y-1 text-sm text-slate-600">
              {REQUIRED_IMPORT_FIELDS.map((field) => (
                <div key={field} className="rounded-lg bg-slate-50 px-3 py-2">
                  {field}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {previewRows.length ? (
        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold text-slate-900">Preview</div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
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
        </div>
      ) : null}
    </Card>
  );
}