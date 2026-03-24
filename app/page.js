"use client";

import ImportPanel from "../components/Import/ImportPanel";
import { useState, useEffect, useMemo } from "react";
import AppHeader from "../components/layout/AppHeader";
import GlobalKpiStrip from "../components/layout/GlobalKpiStrip";
import TabNav from "../components/layout/TabNav";
import DashboardTab from "../components/dashboard/DashboardTab";
import ControlCenterTab from "../components/control-center/ControlCenterTab";
import AnalyticsTab from "../components/analytics/AnalyticsTab";
import ForecastTab from "../components/forecast/ForecastTab";
import VendorsTab from "../components/vendors/VendorsTab";
import OverviewTab from "../components/overview/OverviewTab";

const INITIAL_PROPERTIES = [
  {
    id: "p1",
    name: "123 Main St",
    market: "Dallas",
    leaseEnd: "2026-04-30",
    openDays: 18,
    daysInStage: 4,
    risk: 82,
    readiness: 55,
    projectedCost: 2695,
    projectedCompletion: "2026-05-06",
    timelineConfidence: 84,
    scope: "Flooring + Paint",
    turnOwner: "Ashley M.",
    turnStatus: "Blocked",
    currentStage: "Dispatch",
    vendor: "FloorCo",
    blockers: ["Appliance ETA pending", "Trade overlap risk"],
    alert: "Blocked by appliance ETA and overlapping trade schedule.",
    insight:
      "Paint and flooring are scheduled within the same week. Bundling vendors could reduce total labor mobilization.",
    delayDrivers: [
      { label: "Appliance vendor delay probability", days: 2 },
      { label: "Inspection fail likelihood", days: 1 },
      { label: "Trade overlap risk", days: 3 },
    ],
    timeline: [
      { key: "moveout", label: "Move Out", date: "Apr 30", progress: 100 },
      { key: "dispatch", label: "Dispatch", date: "May 1", progress: 72 },
      { key: "flooring", label: "Flooring", date: "May 1–3", progress: 58 },
      { key: "paint", label: "Paint", date: "May 4–5", progress: 34 },
      { key: "ready", label: "Ready", date: "May 6", progress: 0 },
    ],
  },
  {
    id: "p2",
    name: "456 Oak Ave",
    market: "Atlanta",
    leaseEnd: "2026-05-12",
    openDays: 11,
    daysInStage: 3,
    risk: 71,
    readiness: 68,
    projectedCost: 1850,
    projectedCompletion: "2026-05-15",
    timelineConfidence: 79,
    scope: "Paint + Patch",
    turnOwner: "Justin R.",
    turnStatus: "Monitoring",
    currentStage: "Scope Review",
    vendor: "ABC Paint",
    blockers: ["Appliance ETA confirmation"],
    alert: "Moderate risk due to pending appliance ETA.",
    insight: "Awaiting appliance ETA confirmation. Timeline risk rises if delivery slips.",
    delayDrivers: [
      { label: "Appliance ETA variance", days: 2 },
      { label: "Scope rework probability", days: 1 },
    ],
    timeline: [
      { key: "moveout", label: "Move Out", date: "May 12", progress: 0 },
      { key: "scope", label: "Scope Review", date: "May 13", progress: 0 },
      { key: "paint", label: "Paint + Patch", date: "May 14", progress: 0 },
      { key: "ready", label: "Ready", date: "May 15", progress: 0 },
    ],
  },
  {
    id: "p3",
    name: "789 Pine Rd",
    market: "Nashville",
    leaseEnd: "2026-05-18",
    openDays: 34,
    daysInStage: 2,
    risk: 64,
    readiness: 78,
    projectedCost: 950,
    projectedCompletion: "2026-05-19",
    timelineConfidence: 92,
    scope: "Deep Clean",
    turnOwner: "Thomas K.",
    turnStatus: "Monitoring",
    currentStage: "Pre-Leasing",
    vendor: "Sparkle",
    blockers: ["No major blockers"],
    alert: "Low-friction turn with limited coordination needs.",
    insight: "Low-friction turn. Most work is cosmetic and already staged.",
    delayDrivers: [{ label: "Cleaner availability variability", days: 1 }],
    timeline: [
      { key: "moveout", label: "Move Out", date: "May 18", progress: 0 },
      { key: "clean", label: "Deep Clean", date: "May 19", progress: 0 },
      { key: "ready", label: "Ready", date: "May 19", progress: 0 },
    ],
  },
  {
    id: "p4",
    name: "22 Cedar Ln",
    market: "Phoenix",
    leaseEnd: "2026-04-21",
    openDays: 67,
    daysInStage: 7,
    risk: 88,
    readiness: 44,
    projectedCost: 3850,
    projectedCompletion: "2026-05-01",
    timelineConfidence: 68,
    scope: "Heavy Turn Review",
    turnOwner: "Megan T.",
    turnStatus: "Blocked",
    currentStage: "Owner Approval",
    vendor: "CoolAir",
    blockers: ["Owner approval delay", "Access issue", "HVAC dependency"],
    alert: "High-risk turn blocked on approvals and access.",
    insight: "This turn is high risk due to access delays and unresolved trade dependencies.",
    delayDrivers: [
      { label: "Owner approval lag", days: 2 },
      { label: "HVAC dependency", days: 2 },
      { label: "Access delay", days: 3 },
    ],
    timeline: [
      { key: "moveout", label: "Move Out", date: "Apr 21", progress: 100 },
      { key: "approval", label: "Owner Approval", date: "Apr 22–23", progress: 25 },
      { key: "dispatch", label: "Dispatch", date: "Apr 24", progress: 10 },
      { key: "ready", label: "Ready", date: "May 1", progress: 0 },
    ],
  },
  {
    id: "p5",
    name: "88 Willow Dr",
    market: "Dallas",
    leaseEnd: "2026-05-07",
    openDays: 6,
    daysInStage: 1,
    risk: 59,
    readiness: 91,
    projectedCost: 375,
    projectedCompletion: "2026-05-08",
    timelineConfidence: 91,
    scope: "Deep Clean",
    turnOwner: "Ashley M.",
    turnStatus: "Monitoring",
    currentStage: "Pre-Move Out Inspection",
    vendor: "Sparkle",
    blockers: ["No active blockers"],
    alert: "On track and ready for fast turn execution.",
    insight: "Fast-turn candidate with minimal oversight required.",
    delayDrivers: [{ label: "Cleaner dispatch variance", days: 1 }],
    timeline: [
      { key: "moveout", label: "Move Out", date: "May 7", progress: 0 },
      { key: "clean", label: "Deep Clean", date: "May 8", progress: 0 },
      { key: "ready", label: "Ready", date: "May 8", progress: 0 },
    ],
  },
  {
    id: "p6",
    name: "17 Maple Ct",
    market: "Phoenix",
    leaseEnd: "2026-03-10",
    openDays: 25,
    daysInStage: 5,
    risk: 77,
    readiness: 61,
    projectedCost: 2100,
    projectedCompletion: "2026-03-14",
    timelineConfidence: 74,
    scope: "Paint + Flooring",
    turnOwner: "Justin R.",
    turnStatus: "Monitoring",
    currentStage: "Move Out Inspection",
    vendor: "Prime Paint",
    blockers: ["Trade coordination risk", "Inspection fail likelihood"],
    alert: "At-risk due to trade coordination and inspection exposure.",
    insight: "Trade coordination is the main risk driver on this home.",
    delayDrivers: [
      { label: "Paint + flooring conflict", days: 3 },
      { label: "Inspection fail likelihood", days: 1 },
    ],
    timeline: [
      { key: "inspect", label: "Move Out Inspection", date: "Mar 10", progress: 100 },
      { key: "scope", label: "Scope", date: "Mar 11", progress: 60 },
      { key: "ready", label: "Ready", date: "Mar 14", progress: 0 },
    ],
  },
];

const INITIAL_NOTES = {
  "123 Main St": ["Resident confirmed move-out date.", "Appliance ETA still pending."],
};

const INITIAL_ACTIVITY = {
  "123 Main St": ["Turn created", "Scope approved", "Vendor recommendation generated"],
};

const INITIAL_ACTION_HISTORY = [];

const TABS = [
  "Import",
  "Dashboard",
  "Control Center",
  "Forecast",
  "Vendors",
  "Analytics",
  "Overview",
];

const PIPELINE_STAGES = [
  "Pre-Leasing",
  "Pre-Move Out Inspection",
  "Move Out Inspection",
  "Scope Review",
  "Owner Approval",
  "Dispatch",
  "Pending RRI",
  "Rent Ready Open",
  "Failed Rent Ready",
];

function formatMoney(value) {
  return `$${value.toLocaleString()}`;
}

function getToneFromRisk(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "emerald";
}

function getMarketHealth(properties) {
  return Array.from(new Set(properties.map((x) => x.market))).map((market) => {
    const rows = properties.filter((x) => x.market === market);
    const avgRisk = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.risk, 0) / rows.length)
      : 0;

    const status = avgRisk >= 75 ? "High Risk" : avgRisk >= 60 ? "Watch" : "Healthy";
    const tone = avgRisk >= 75 ? "red" : avgRisk >= 60 ? "amber" : "emerald";

    return { market, avgRisk, status, tone };
  });
}

function getStageFlow(properties) {
  return PIPELINE_STAGES.map((stage) => ({
    stage,
    count: properties.filter((p) => p.currentStage === stage).length,
  }));
}

export default function Page() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [selectedMarket, setSelectedMarket] = useState("All Markets");
  const [selectedPropertyId, setSelectedPropertyId] = useState("p1");
  const [forecastUndoStack, setForecastUndoStack] = useState([]);
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);
  const [notesMap, setNotesMap] = useState(INITIAL_NOTES);
  const [activityMap, setActivityMap] = useState(INITIAL_ACTIVITY);
  const [actionHistory, setActionHistory] = useState(INITIAL_ACTION_HISTORY);
  const [queueFilter, setQueueFilter] = useState("All Open Turns");
  const [selectedStageFilter, setSelectedStageFilter] = useState(null);
  const [sortBy, setSortBy] = useState("Priority");
  const [dirtyRowIds, setDirtyRowIds] = useState([]);
  const [savedRowIds, setSavedRowIds] = useState([]);
  const [importedProperties, setImportedProperties] = useState([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [previousImportedProperties, setPreviousImportedProperties] = useState([]);
  const [canUndoImport, setCanUndoImport] = useState(false);
  const [importMode, setImportMode] = useState("replace");
  const [lastImportCount, setLastImportCount] = useState(0);
  const [lastUploadedCount, setLastUploadedCount] = useState(0);
  const [lastSkippedCount, setLastSkippedCount] = useState(0);
  const [lastImportTimestamp, setLastImportTimestamp] = useState(null);
  const [mode, setMode] = useState("operator");

  useEffect(() => {
  if (!hasHydrated) return;

  try {
    localStorage.setItem(
      "turniq_imported_properties",
      JSON.stringify(importedProperties)
    );
  } catch (error) {
    console.error("Failed to persist imported properties", error);
  }
}, [importedProperties, hasHydrated]);

  useEffect(() => {
  try {
    const saved = localStorage.getItem("turniq_imported_properties");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setImportedProperties(parsed);
      }
    }
  } catch (error) {
    console.error("Failed to load imported properties", error);
  } finally {
    setHasHydrated(true);
  }
}, []);

useEffect(() => {
  const savedUndo = localStorage.getItem("turniq_forecast_undo_stack");
  if (savedUndo) {
    try {
      const parsed = JSON.parse(savedUndo);
      if (Array.isArray(parsed)) {
        setForecastUndoStack(parsed);
      }
    } catch (error) {
      console.error("Failed to load forecast undo stack", error);
    }
  }
}, []);

useEffect(() => {
  localStorage.setItem(
    "turniq_forecast_undo_stack",
    JSON.stringify(forecastUndoStack)
  );
}, [forecastUndoStack]);

  const activeProperties = useMemo(
    () => (importedProperties.length ? importedProperties : properties),
    [importedProperties, properties]
  );

  const markets = useMemo(
    () => ["All Markets", ...Array.from(new Set(activeProperties.map((x) => x.market)))],
    [activeProperties]
  );

  const filteredProperties = useMemo(() => {
    return activeProperties.filter(
      (x) => selectedMarket === "All Markets" || x.market === selectedMarket
    );
  }, [activeProperties, selectedMarket]);

  const selectedProperty =
    activeProperties.find((x) => x.id === selectedPropertyId) || activeProperties[0];

  const marketHealth = useMemo(() => getMarketHealth(filteredProperties), [filteredProperties]);
  const stageFlow = useMemo(() => getStageFlow(filteredProperties), [filteredProperties]);

  const stagePipeline = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => {
      const rows = filteredProperties.filter((p) => p.currentStage === stage);
      const count = rows.length;
      const avgDaysInStage = count
        ? Number(
            (
              rows.reduce((sum, row) => sum + (row.daysInStage || 0), 0) / count
            ).toFixed(1)
          )
        : 0;

      const blockedCount = rows.filter((row) => row.turnStatus === "Blocked").length;
      const blockedPercent = count ? Math.round((blockedCount / count) * 100) : 0;

      return {
        stage,
        count,
        avgDaysInStage,
        blockedPercent,
      };
    });
  }, [filteredProperties]);

  const topStageBottleneck = useMemo(() => {
    if (!stagePipeline.length) return null;
    return [...stagePipeline].sort((a, b) => b.avgDaysInStage - a.avgDaysInStage)[0];
  }, [stagePipeline]);

  const operatorSummary = useMemo(() => {
    const owners = Array.from(new Set(filteredProperties.map((p) => p.turnOwner)));
    return owners.map((owner) => {
      const rows = filteredProperties.filter((p) => p.turnOwner === owner);
      return {
        owner,
        activeTurns: rows.length,
        highRisk: rows.filter((row) => row.risk >= 75).length,
      };
    });
  }, [filteredProperties]);

  const kpis = useMemo(() => {
    const rows = filteredProperties;

    const blockedTurns = rows.filter((x) => x.turnStatus === "Blocked").length;
    const scopeReviewsPending = rows.filter((x) => x.currentStage === "Scope Review").length;
    const ownerApprovalPending = rows.filter((x) => x.currentStage === "Owner Approval").length;
    const highRisk = rows.filter((x) => x.risk >= 75).length;

    const avgTurnTime = rows.length
      ? `${(rows.reduce((sum, x) => sum + x.openDays, 0) / rows.length).toFixed(1)} days`
      : "0 days";

    const ecdPastDue = rows.filter(
      (x) => new Date(x.projectedCompletion) < new Date("2026-05-07")
    ).length;

    const ecdThisWeek = rows.filter((x) =>
      ["2026-05-06", "2026-05-08"].includes(x.projectedCompletion)
    ).length;

    const failedRentReadyCount = rows.filter(
  (x) => x.currentStage === "Failed Rent Ready"
).length;

const rentReadyRelatedCount = rows.filter((x) =>
  ["Pending RRI", "Rent Ready Open", "Failed Rent Ready"].includes(x.currentStage)
).length;

const rriFailRate = rentReadyRelatedCount
  ? `${Math.round((failedRentReadyCount / rentReadyRelatedCount) * 100)}%`
  : "0%";

    return {
      allOpenTurns: rows.length,
      blockedTurns,
      scopeReviewsPending,
      ownerApprovalPending,
      highRisk,
      avgTurnTime,
      ecdPastDue,
      ecdThisWeek,
      rriFailRate,
    };
  }, [filteredProperties]);

  const queueRows = useMemo(() => {
    let rows = filteredProperties;

    if (queueFilter === "Open Turns > 60 Days") rows = rows.filter((x) => x.openDays > 60);
    if (queueFilter === "Open Turns 31–60 Days") {
      rows = rows.filter((x) => x.openDays >= 31 && x.openDays <= 60);
    }
    if (queueFilter === "Open Turns 8–30 Days") {
      rows = rows.filter((x) => x.openDays >= 8 && x.openDays <= 30);
    }
    if (queueFilter === "Open Turns 0–7 Days") {
      rows = rows.filter((x) => x.openDays <= 7);
    }
    if (queueFilter === "Blocked Turns") {
      rows = rows.filter((x) => x.turnStatus === "Blocked");
    }
    if (queueFilter === "High-Risk Turns") {
      rows = rows.filter((x) => x.risk >= 75);
    }
    if (queueFilter === "ECD Past Due") {
      rows = rows.filter((x) => new Date(x.projectedCompletion) < new Date("2026-05-07"));
    }
    if (queueFilter === "ECD This Week") {
      rows = rows.filter((x) =>
        ["2026-05-06", "2026-05-08"].includes(x.projectedCompletion)
      );
    }
    if (selectedStageFilter) {
      rows = rows.filter((x) => x.currentStage === selectedStageFilter);
    }

    const sorted = [...rows];

    if (sortBy === "Risk") {
      sorted.sort((a, b) => b.risk - a.risk);
    } else if (sortBy === "Open Days") {
      sorted.sort((a, b) => b.openDays - a.openDays);
    } else if (sortBy === "ECD") {
      sorted.sort(
        (a, b) =>
          new Date(a.projectedCompletion).getTime() -
          new Date(b.projectedCompletion).getTime()
      );
    } else if (sortBy === "Stage") {
      sorted.sort((a, b) => a.currentStage.localeCompare(b.currentStage));
    }

    return sorted;
  }, [filteredProperties, queueFilter, selectedStageFilter, sortBy]);

  function updateProperty(id, patch) {
  if (importedProperties.length) {
    setImportedProperties((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
    return;
  }

  setProperties((prev) =>
    prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
  );
}

function getActiveDatasetInfo() {
  return {
    datasetType: importedProperties.length ? "imported" : "demo",
    rows: importedProperties.length ? importedProperties : properties,
  };
}

function applyRowsToDataset(datasetType, nextRows) {
  if (datasetType === "imported") {
    setImportedProperties(nextRows);
  } else {
    setProperties(nextRows);
  }
}

function applyForecastPatch(id, patch, label = "Forecast action") {
  const { datasetType, rows } = getActiveDatasetInfo();

  const originalRow = rows.find((row) => row.id === id);
  if (!originalRow) return;

  const nextRows = rows.map((row) =>
    row.id === id ? { ...row, ...patch } : row
  );

  applyRowsToDataset(datasetType, nextRows);

  setForecastUndoStack((prev) => [
    {
      id: `forecast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "single",
      label,
      datasetType,
      timestamp: new Date().toISOString(),
      rows: [{ id, before: originalRow }],
    },
    ...prev.slice(0, 19),
  ]);
}
function applyForecastBatch(patches, label = "Forecast batch action") {
  if (!patches?.length) return;

  const datasetType = importedProperties.length ? "imported" : "demo";
  const rows = importedProperties.length ? importedProperties : properties;

  const patchMap = new Map(patches.map((item) => [item.id, item.patch]));

  const beforeRows = rows
    .filter((row) => patchMap.has(row.id))
    .map((row) => ({
      id: row.id,
      before: row,
    }));

  if (!beforeRows.length) return;

  const nextRows = rows.map((row) =>
    patchMap.has(row.id) ? { ...row, ...patchMap.get(row.id) } : row
  );

  if (datasetType === "imported") {
    setImportedProperties(nextRows);
  } else {
    setProperties(nextRows);
  }

  setForecastUndoStack((prev) => [
    {
      id: `forecast-batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "batch",
      label,
      datasetType,
      timestamp: new Date().toISOString(),
      rows: beforeRows,
    },
    ...prev.slice(0, 19),
  ]);
}

function undoLastForecastAction() {
  if (!forecastUndoStack.length) return;

  const [latest, ...rest] = forecastUndoStack;
  const targetRows = latest.datasetType === "imported" ? importedProperties : properties;
  const restoreMap = new Map(latest.rows.map((item) => [item.id, item.before]));

  const restoredRows = targetRows.map((row) =>
    restoreMap.has(row.id) ? restoreMap.get(row.id) : row
  );

  applyRowsToDataset(latest.datasetType, restoredRows);
  setForecastUndoStack(rest);
}

  function addNote(propertyName, note) {
    if (!note.trim()) return;
    setNotesMap((prev) => ({
      ...prev,
      [propertyName]: [...(prev[propertyName] || []), note.trim()],
    }));
  }

  function addActivity(propertyName, item) {
    if (!item?.trim()) return;
    setActivityMap((prev) => ({
      ...prev,
      [propertyName]: [...(prev[propertyName] || []), item.trim()],
    }));
  }

  function handleClearImportedData() {
    setImportedProperties([]);
    setPreviousImportedProperties([]);
    setCanUndoImport(false);
    setLastImportCount(0);
    setLastUploadedCount(0);
    setLastSkippedCount(0);
    setLastImportTimestamp(null);
    setForecastUndoStack([]);
    localStorage.removeItem("turniq_imported_properties");
    localStorage.removeItem("turniq_forecast_undo_stack");
    setSelectedMarket("All Markets");
    setSelectedPropertyId("p1");
    setActiveTab("Import");
  }

  function handleUndoImport() {
    setImportedProperties(previousImportedProperties || []);
    setCanUndoImport(false);
    setLastImportCount(0);
    setLastUploadedCount(0);
    setLastSkippedCount(0);
    setLastImportTimestamp(null);
  }

  function addActionHistory(entry) {
    setActionHistory((prev) => [
      {
        id: `${entry.propertyId || "action"}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ]);
  }

  function saveRow(id) {
    setSavedRowIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDirtyRowIds((prev) => prev.filter((rowId) => rowId !== id));
  }

  function openRow(id) {
    setSelectedPropertyId(id);
    setActiveTab("Dashboard");
  }

  function markDirtyRow(id) {
    setDirtyRowIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSavedRowIds((prev) => prev.filter((rowId) => rowId !== id));
  }

  function toggleStageFilter(stage) {
    setSelectedStageFilter((prev) => (prev === stage ? null : stage));
  }

  function resetQueueView() {
    setQueueFilter("All Open Turns");
    setSelectedStageFilter(null);
    setSortBy("Risk");
  }

  function handleImportTurns(importedTurns) {
    const totalRows = importedTurns.length;
    let newCount = 0;
    let skippedCount = 0;

    setPreviousImportedProperties(importedProperties);
    setCanUndoImport(true);

    if (importMode === "replace") {
      newCount = totalRows;
      skippedCount = 0;
      setImportedProperties(importedTurns);
    } else {
      setImportedProperties((prev) => {
        const merged = [...prev];
        const existingIds = new Set(prev.map((row) => row.id));

        importedTurns.forEach((row) => {
          if (!existingIds.has(row.id)) {
            merged.push(row);
            existingIds.add(row.id);
            newCount += 1;
          } else {
            skippedCount += 1;
          }
        });

        return merged;
      });
    }

    setLastUploadedCount(totalRows);
    setLastImportCount(newCount);
    setLastSkippedCount(skippedCount);
    setLastImportTimestamp(new Date().toISOString());

    if (importedTurns.length) {
      setSelectedPropertyId(importedTurns[0].id);
      setSelectedMarket("All Markets");
      setActiveTab("Dashboard");
    }
  }

  const activeDatasetLabel = importedProperties.length
    ? `Imported dataset • ${importedProperties.length} turns`
    : "Demo dataset";

if (!hasHydrated) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-semibold text-slate-900">TurnIQ</div>
          <div className="mt-2 text-sm text-slate-500">
            Loading workspace...
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto max-w-7xl space-y-4 px-6 py-3">
          <AppHeader
            selectedMarket={selectedMarket}
            setSelectedMarket={setSelectedMarket}
            markets={markets}
          />

<div className="mt-4 max-w-lg text-sm text-slate-600">
  TurnIQ is a control tower for turns operations, connecting to your PMS to turn fragmented data into a live workspace for faster turn execution.
</div>

          <div className="flex flex-wrap items-center justify-between gap-3">
  <div className="flex items-center gap-2">
    <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
      {activeDatasetLabel}
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={() => setMode("operator")}
        className={`rounded-xl px-3 py-2 text-xs ${
          mode === "operator"
            ? "bg-slate-900 text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Operator
      </button>

      <button
        onClick={() => setMode("presentation")}
        className={`rounded-xl px-3 py-2 text-xs ${
          mode === "presentation"
            ? "bg-slate-900 text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Presentation
      </button>
    </div>
  </div>

  {lastImportTimestamp ? (
    <div className="text-xs text-slate-500">
      Last import: {new Date(lastImportTimestamp).toLocaleString()}
    </div>
  ) : null}
</div>

          <GlobalKpiStrip
            kpis={kpis}
            onOpenTurnsClick={() => {
              setQueueFilter("All Open Turns");
              setSelectedStageFilter(null);
              setActiveTab("Control Center");
            }}
            onBlockedTurnsClick={() => {
              setQueueFilter("Blocked Turns");
              setSelectedStageFilter(null);
              setActiveTab("Dashboard");
            }}
            onScopeReviewsClick={() => {
              setQueueFilter("All Open Turns");
              setSelectedStageFilter("Scope Review");
              setActiveTab("Control Center");
            }}
            onOwnerApprovalClick={() => {
              setQueueFilter("All Open Turns");
              setSelectedStageFilter("Owner Approval");
              setActiveTab("Control Center");
            }}
            onHighRiskClick={() => {
              setQueueFilter("High-Risk Turns");
              setSelectedStageFilter(null);
              setActiveTab("Control Center");
            }}
            onPastDueClick={() => {
              setQueueFilter("ECD Past Due");
              setSelectedStageFilter(null);
              setActiveTab("Control Center");
            }}
            onEcdThisWeekClick={() => {
              setQueueFilter("ECD This Week");
              setSelectedStageFilter(null);
              setActiveTab("Control Center");
            }}
            onRriFailRateClick={() => {
              setActiveTab("Analytics");
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-4">
  <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
</div>

      <div className="mx-auto max-w-7xl px-6 py-4">
        {activeTab === "Dashboard" && (
          <DashboardTab
            mode={mode}
            properties={filteredProperties}
            selectedProperty={selectedProperty}
            setSelectedPropertyId={setSelectedPropertyId}
            selectedMarket={selectedMarket}
            setSelectedMarket={setSelectedMarket}
            notes={notesMap[selectedProperty.name] || []}
            activity={activityMap[selectedProperty.name] || []}
            addNote={addNote}
            addActivity={addActivity}
            addActionHistory={addActionHistory}
            actionHistory={actionHistory}
            updateProperty={updateProperty}
            formatMoney={formatMoney}
            getToneFromRisk={getToneFromRisk}
            topStageBottleneck={topStageBottleneck}
          />
        )}

        {activeTab === "Control Center" && (
          <ControlCenterTab
            rows={queueRows}
            queueFilter={queueFilter}
            setQueueFilter={setQueueFilter}
            resetQueueView={resetQueueView}
            selectedStageFilter={selectedStageFilter}
            toggleStageFilter={toggleStageFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            operatorSummary={operatorSummary}
            selectedPropertyId={selectedPropertyId}
            setSelectedPropertyId={setSelectedPropertyId}
            updateProperty={updateProperty}
            getToneFromRisk={getToneFromRisk}
            stagePipeline={stagePipeline}
            topStageBottleneck={topStageBottleneck}
            saveRow={saveRow}
            openRow={openRow}
            savedRowIds={savedRowIds}
            dirtyRowIds={dirtyRowIds}
            markDirtyRow={markDirtyRow}
          />
        )}

        {activeTab === "Forecast" && (
  <ForecastTab
    mode={mode}
    selectedProperty={selectedProperty}
    properties={filteredProperties}
    setSelectedPropertyId={setSelectedPropertyId}
    applyForecastPatch={applyForecastPatch}
    applyForecastBatch={applyForecastBatch}
    undoLastForecastAction={undoLastForecastAction}
    canUndoForecastAction={forecastUndoStack.length > 0}
    lastForecastUndoLabel={forecastUndoStack[0]?.label || ""}
  />
)}

        {activeTab === "Analytics" && (
          <AnalyticsTab properties={filteredProperties} actionHistory={actionHistory} />
        )}

        {activeTab === "Vendors" && <VendorsTab properties={filteredProperties} />}

        {activeTab === "Import" && (
  <ImportPanel
    onImport={handleImportTurns}
    onClearSuccess={() => {
      setLastImportCount(0);
      setLastUploadedCount(0);
      setLastSkippedCount(0);
      setLastImportTimestamp(null);
    }}
    onClearImportedData={handleClearImportedData}
    onUndoImport={handleUndoImport}
    canUndoImport={canUndoImport}
    hasImportedData={importedProperties.length > 0}
    importMode={importMode}
    setImportMode={setImportMode}
    lastImportCount={lastImportCount}
    lastUploadedCount={lastUploadedCount}
    lastSkippedCount={lastSkippedCount}
    lastImportTimestamp={lastImportTimestamp}
  />
)}

        {activeTab === "Overview" && (
          <OverviewTab
    mode={mode}
    properties={filteredProperties}
    kpis={kpis}
    selectedMarket={selectedMarket}
    setSelectedMarket={setSelectedMarket}
    setActiveTab={setActiveTab}
    actionHistory={actionHistory}
    hasImportedData={importedProperties.length > 0}
    topStageBottleneck={topStageBottleneck}
    lastImportCount={lastImportCount}
/>
        )}
      </div>
    </div>
  );
}