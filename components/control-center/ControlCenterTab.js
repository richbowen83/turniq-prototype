"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { getStageTone } from "../../utils/tone";
import {
  formatShortDate,
  getDailyRentValue,
  getRentSourceLabel,
  getRevenueProtected,
  shiftDate,
} from "../../utils/economics";

const STAGE_SLA = {
  "Pre-Leasing": 3,
  "Pre-Move Out Inspection": 3,
  "Move Out Inspection": 2,
  "Scope Review": 3,
  "Owner Approval": 3,
  Dispatch: 2,
  "Pending RRI": 2,
  "Rent Ready Open": 1,
  "Failed Rent Ready": 0,
};

const NEXT_ACTION_OPTIONS = [
  "Chase owner approval",
  "Confirm vendor schedule",
  "Resolve blocker",
  "Update resident move-out",
  "Confirm appliance ETA",
  "Escalate internally",
  "Prepare for dispatch",
  "Ready for execution",
];

const BLOCKER_OPTIONS = [
  "None",
  "Owner approval delay",
  "Appliance ETA pending",
  "Access issue",
  "Inspection fail likelihood",
  "Trade coordination risk",
  "Vendor unavailable",
  "HVAC dependency",
  "Scope ambiguity",
];

const DEFAULT_FILTER_VIEWS = [
  "All Open Turns",
  "Blocked Turns",
  "At-Risk Turns",
  "Stale Turns",
  "Pending Approvals",
  "Vendorless Turns",
  "Over SLA",
  "Critical Priority",
  "Failed Rent Ready",
];

const SYSTEM_VIEWS = [
  {
    id: "my_queue",
    name: "My Queue",
    getFilters: () => ({
      queueFilter: "All Open Turns",
      customFilter: (row) => row.turnOwner === "Me",
      sortBy: "Priority",
    }),
  },
  {
    id: "blocked",
    name: "Blocked",
    getFilters: () => ({
      queueFilter: "Blocked Turns",
      sortBy: "Priority",
    }),
  },
  {
    id: "approvals",
    name: "Approvals",
    getFilters: () => ({
      queueFilter: "Pending Approvals",
      sortBy: "Priority",
    }),
  },
  {
    id: "failed_rri",
    name: "Failed Rent Ready",
    getFilters: () => ({
      queueFilter: "Failed Rent Ready",
      sortBy: "Priority",
    }),
  },
  {
    id: "over_sla",
    name: "Over SLA",
    getFilters: () => ({
      queueFilter: "Over SLA",
      sortBy: "Priority",
    }),
  },
  {
    id: "exec",
    name: "Exec Focus",
    getFilters: () => ({
      queueFilter: "At-Risk Turns",
      sortBy: "Priority",
    }),
  },
];

const STORAGE_KEY = "turniq_control_center_saved_views_v8";
const ACTION_LEARNING_STORAGE_KEY = "turniq_action_learning_v1";

function getStageSla(stage) {
  return STAGE_SLA[stage] || 3;
}

function getPrimaryBlocker(row) {
  const blockers = row.blockers || [];
  const live = blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
  return live[0] || "None";
}

function getDaysOverSla(row) {
  return Math.max(0, (row.daysInStage || 0) - getStageSla(row.currentStage));
}

function isOverSla(row) {
  const sla = getStageSla(row.currentStage);
  return sla > 0 && (row.daysInStage || 0) > sla;
}

function isStale(row) {
  return (row.daysInStage || 0) >= 6 && row.turnStatus !== "Ready";
}

function getNextAction(row) {
  if (row.nextAction) return row.nextAction;

  const blocker = getPrimaryBlocker(row).toLowerCase();

  if (row.currentStage === "Failed Rent Ready") return "Resolve blocker";
  if (row.currentStage === "Owner Approval") return "Chase owner approval";
  if (blocker.includes("appliance")) return "Confirm appliance ETA";
  if (blocker.includes("vendor")) return "Confirm vendor schedule";
  if (blocker.includes("access")) return "Resolve blocker";
  if (blocker.includes("trade")) return "Resolve blocker";
  if (!row.vendor || row.vendor === "TBD") return "Confirm vendor schedule";
  if (row.turnStatus === "Blocked") return "Resolve blocker";

  return "Prepare for dispatch";
}

function getLastTouchedLabel(row) {
  if (row.followUpDate) return `Follow-up ${row.followUpDate}`;
  if ((row.daysInStage || 0) >= 6) return "No recent movement";
  return "Recently active";
}

function buildPriority(row) {
  let score = 0;
  const reasons = [];

  if (row.currentStage === "Failed Rent Ready") {
    score += 30;
    reasons.push("Failed rent ready");
  }

  if (row.turnStatus === "Blocked") {
    score += 40;
    reasons.push("Blocked");
  }

  const daysOver = getDaysOverSla(row);
  if (daysOver > 0) {
    score += Math.min(25, daysOver * 5);
    reasons.push(`${daysOver}d over SLA`);
  }

  if ((row.risk || 0) >= 85) {
    score += 20;
    reasons.push("Very high risk");
  } else if ((row.risk || 0) >= 75) {
    score += 14;
    reasons.push("High risk");
  } else if ((row.risk || 0) >= 60) {
    score += 8;
    reasons.push("Elevated risk");
  }

  if (row.currentStage === "Owner Approval") {
    score += 12;
    reasons.push("Pending approval");
  }

  if (row.stale) {
    score += 10;
    reasons.push("Stale");
  }

  if (!row.vendor || row.vendor === "TBD") {
    score += 8;
    reasons.push("No vendor");
  }

  const blocker = getPrimaryBlocker(row);
  if (blocker !== "None") {
    score += 6;
    reasons.push(blocker);
  }

  let label = "Low";
  let tone = "green";

  if (score >= 60) {
    label = "Critical";
    tone = "red";
  } else if (score >= 35) {
    label = "High";
    tone = "amber";
  } else if (score >= 18) {
    label = "Medium";
    tone = "slate";
  }

  return {
    score,
    label,
    tone,
    whyNow: reasons.slice(0, 4).join(" + ") || "Routine monitoring",
  };
}

function buildImpact(row) {
  let daysRecovered = 0;

  if (row.currentStage === "Failed Rent Ready") {
    daysRecovered += 3;
  }

  const daysOver = getDaysOverSla(row);

  if (row.turnStatus === "Blocked") {
    daysRecovered += 2;
  }

  if (row.currentStage === "Owner Approval") {
    daysRecovered += 2;
  }

  if (daysOver > 0) {
    daysRecovered += Math.min(4, daysOver);
  }

  if (row.stale) {
    daysRecovered += 1;
  }

  const dailyRentValue = getDailyRentValue(row);
  const revenueRecovered = getRevenueProtected(daysRecovered, row);

  return {
    daysRecovered,
    dailyRentValue,
    revenueRecovered,
    rentSourceLabel: getRentSourceLabel(row),
  };
}

function buildEnrichedRows(rows) {
  return rows.map((row) => {
    const stale = isStale(row);
    const overdue = isOverSla(row);

    const base = {
      ...row,
      blocker: getPrimaryBlocker(row),
      nextAction: getNextAction(row),
      followUpDate: row.followUpDate || "",
      stale,
      overdue,
      stageSla: getStageSla(row.currentStage),
      systemLink:
        row.systemLink || `https://pms.example/turns/${encodeURIComponent(row.id)}`,
      lastAction: row.lastAction || null,
      dailyRentValue: getDailyRentValue(row),
      rentSourceLabel: getRentSourceLabel(row),
    };

    return {
      ...base,
      priority: buildPriority(base),
      impact: buildImpact(base),
    };
  });
}

function buildStageBuckets(rows) {
  const stages = [
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

  return stages.map((stage) => {
    const stageRows = rows.filter((row) => row.currentStage === stage);
    const count = stageRows.length;
    const avgDays = count
      ? Number(
          (
            stageRows.reduce((sum, row) => sum + (row.daysInStage || 0), 0) / count
          ).toFixed(1)
        )
      : 0;

    const overdueCount = stageRows.filter((row) => row.overdue).length;
    const blockedCount = stageRows.filter((row) => row.turnStatus === "Blocked").length;
    const blockedPercent = count ? Math.round((blockedCount / count) * 100) : 0;
    const sla = getStageSla(stage);

    return {
      stage,
      count,
      avgDays,
      overdueCount,
      blockedCount,
      blockedPercent,
      sla,
      tone: getStageTone(overdueCount, avgDays, sla),
    };
  });
}

function applyFilter(rows, queueFilter) {
  if (queueFilter === "Blocked Turns") return rows.filter((row) => row.turnStatus === "Blocked");
  if (queueFilter === "At-Risk Turns") return rows.filter((row) => row.risk >= 75 || row.overdue);
  if (queueFilter === "Stale Turns") return rows.filter((row) => row.stale);
  if (queueFilter === "Pending Approvals") return rows.filter((row) => row.currentStage === "Owner Approval");
  if (queueFilter === "Vendorless Turns") return rows.filter((row) => !row.vendor || row.vendor === "TBD");
  if (queueFilter === "Over SLA") return rows.filter((row) => row.overdue);
  if (queueFilter === "Critical Priority") return rows.filter((row) => row.priority.label === "Critical");
  if (queueFilter === "Failed Rent Ready") return rows.filter((row) => row.currentStage === "Failed Rent Ready");
  return rows;
}

function sortRows(rows, sortBy) {
  const sorted = [...rows];

  if (sortBy === "Priority") {
    sorted.sort((a, b) => b.priority.score - a.priority.score);
  } else if (sortBy === "Risk") {
    sorted.sort((a, b) => (b.risk || 0) - (a.risk || 0));
  } else if (sortBy === "Open Days") {
    sorted.sort((a, b) => (b.openDays || 0) - (a.openDays || 0));
  } else if (sortBy === "ECD") {
    sorted.sort(
      (a, b) =>
        new Date(a.projectedCompletion).getTime() -
        new Date(b.projectedCompletion).getTime()
    );
  } else if (sortBy === "Stage") {
    sorted.sort((a, b) => a.currentStage.localeCompare(b.currentStage));
  } else if (sortBy === "Days in Stage") {
    sorted.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));
  }

  return sorted;
}

function buildWorkflowSteps(row) {
  if (row.currentStage === "Failed Rent Ready") {
    return ["Clear rework items", "Re-inspect home", "Confirm rent ready"];
  }

  if (row.currentStage === "Owner Approval") {
    return ["Escalate approval", "Confirm scope signoff", "Dispatch vendor"];
  }

  if (row.turnStatus === "Blocked") {
    return ["Identify blocker owner", "Remove blocker", "Resume execution"];
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))) {
    return ["Confirm appliance ETA", "Re-sequence vendors", "Protect ECD"];
  }

  return ["Confirm owner", "Advance next action", "Hold ECD"];
}

export default function ControlCenterTab({
  mode = "operator",
  viewMode = "guided",
  rows,
  queueFilter,
  setQueueFilter,
  resetQueueView,
  selectedStageFilter,
  toggleStageFilter,
  sortBy,
  setSortBy,
  operatorSummary,
  selectedPropertyId,
  setSelectedPropertyId,
  updateProperty,
  topStageBottleneck = null,
}) {
  const [draftNotes, setDraftNotes] = useState({});
  const [savedViews, setSavedViews] = useState([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState(null);
  const [lastActionImpact, setLastActionImpact] = useState(null);
  const [activeSystemView, setActiveSystemView] = useState(null);
  const [customRowFilter, setCustomRowFilter] = useState(null);
  const [actionLearningLog, setActionLearningLog] = useState([]);

  const enrichedRows = useMemo(() => buildEnrichedRows(rows), [rows]);
  const stageBuckets = useMemo(() => buildStageBuckets(enrichedRows), [enrichedRows]);

  const workingRows = useMemo(() => {
    let next = applyFilter(enrichedRows, queueFilter);
    if (customRowFilter) next = next.filter(customRowFilter);
    if (selectedStageFilter) {
      next = next.filter((row) => row.currentStage === selectedStageFilter);
    }
    return sortRows(next, sortBy);
  }, [enrichedRows, queueFilter, customRowFilter, selectedStageFilter, sortBy]);

  const queueSummary = useMemo(() => {
    const blocked = workingRows.filter((row) => row.turnStatus === "Blocked").length;
    const overdue = workingRows.filter((row) => row.overdue).length;
    const stale = workingRows.filter((row) => row.stale).length;
    const critical = workingRows.filter((row) => row.priority.label === "Critical").length;
    const failedRentReady = workingRows.filter(
      (row) => row.currentStage === "Failed Rent Ready"
    ).length;

    return { blocked, overdue, stale, critical, failedRentReady };
  }, [workingRows]);

  const topActions = useMemo(() => {
    return [...enrichedRows]
      .filter(
        (row) =>
          row.turnStatus === "Blocked" ||
          row.currentStage === "Failed Rent Ready" ||
          row.priority.score >= 18 ||
          row.impact.daysRecovered > 0
      )
      .sort((a, b) => b.priority.score - a.priority.score)
      .slice(0, 5)
      .map((row) => ({
        ...row,
        workflowSteps: buildWorkflowSteps(row),
      }));
  }, [enrichedRows]);

  const portfolioImpact = useMemo(() => {
    return topActions.reduce(
      (acc, row) => {
        acc.daysRecovered += row.impact.daysRecovered;
        acc.revenueRecovered += row.impact.revenueRecovered;
        return acc;
      },
      { daysRecovered: 0, revenueRecovered: 0 }
    );
  }, [topActions]);

  const actionLearningSummary = useMemo(() => {
    const grouped = {};

    for (const entry of actionLearningLog) {
      if ((entry.daysSaved || 0) <= 0 && (entry.revenueProtected || 0) <= 0) continue;

      if (!grouped[entry.actionLabel]) {
        grouped[entry.actionLabel] = {
          actionLabel: entry.actionLabel,
          uses: 0,
          totalDaysSaved: 0,
          totalRevenueProtected: 0,
        };
      }

      grouped[entry.actionLabel].uses += 1;
      grouped[entry.actionLabel].totalDaysSaved += entry.daysSaved || 0;
      grouped[entry.actionLabel].totalRevenueProtected += entry.revenueProtected || 0;
    }

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        avgDaysSaved: item.uses ? Number((item.totalDaysSaved / item.uses).toFixed(1)) : 0,
        avgRevenueProtected: item.uses
          ? Math.round(item.totalRevenueProtected / item.uses)
          : 0,
      }))
      .sort((a, b) => b.totalRevenueProtected - a.totalRevenueProtected)
      .slice(0, 5);
  }, [actionLearningLog]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTION_LEARNING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setActionLearningLog(parsed);
      }
    } catch (error) {
      console.error("Failed to load action learning log", error);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedViews(parsed);
      }
    } catch (error) {
      console.error("Failed to load saved views", error);
    }
  }, []);

  function persistSavedViews(nextViews) {
    setSavedViews(nextViews);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextViews));
    } catch (error) {
      console.error("Failed to persist saved views", error);
    }
  }

  function persistActionLearning(nextLog) {
    setActionLearningLog(nextLog);
    try {
      localStorage.setItem(ACTION_LEARNING_STORAGE_KEY, JSON.stringify(nextLog));
    } catch (error) {
      console.error("Failed to persist action learning log", error);
    }
  }

  function patchRow(id, patch) {
    updateProperty(id, patch);
  }

  function recordActionOutcome(row, patch, label) {
    const nextDays = patch.daysInStage ?? row.daysInStage ?? 0;
    const daysSaved = Math.max(0, (row.daysInStage || 0) - nextDays);
    const prevECD = row.projectedCompletion;
    const nextECD = daysSaved > 0 ? shiftDate(prevECD, -daysSaved) : prevECD;
    const revenueProtected = getRevenueProtected(daysSaved, row);

    const learningEntry = {
      id: `learn-${Date.now()}-${row.id}`,
      propertyId: row.id,
      propertyName: row.name,
      actionLabel: label,
      stage: row.currentStage,
      blocker: row.blocker || getPrimaryBlocker(row),
      turnStatus: row.turnStatus,
      risk: row.risk || 0,
      daysSaved,
      revenueProtected,
      timestamp: new Date().toISOString(),
    };

    const nextLearningLog = [learningEntry, ...actionLearningLog].slice(0, 200);
    persistActionLearning(nextLearningLog);

    patchRow(row.id, {
      lastAction: {
        label,
        timestamp: new Date().toISOString(),
        daysRecovered: daysSaved,
        revenueProtected,
        prevECD,
        nextECD,
      },
    });

    setLastActionImpact({
      property: row.name,
      daysSaved,
      revenueProtected,
      prevECD,
      nextECD,
    });
  }

  function handleOwnerChange(id, value) {
    patchRow(id, { turnOwner: value });
  }

  function handleBlockerChange(id, value, row) {
    const blockers = value === "None" ? ["No active blockers"] : [value];
    patchRow(id, {
      blockers,
      turnStatus: value === "None" ? "Monitoring" : row.turnStatus,
    });
  }

  function handleNextActionChange(id, value) {
    patchRow(id, { nextAction: value });
  }

  function handleFollowUpChange(id, value) {
    patchRow(id, { followUpDate: value });
  }

  function handleInlineNoteSave(id, row) {
    const note = (draftNotes[id] || "").trim();
    if (!note) return;

    const existingNotes = row.operationalNotes || [];
    patchRow(id, {
      operationalNotes: [...existingNotes, note],
    });

    setDraftNotes((prev) => ({ ...prev, [id]: "" }));
  }

  function handleResolve(id) {
    const row = enrichedRows.find((r) => r.id === id);
    if (!row) return;

    const targetDays = Math.min(1, row.stageSla);
    const daysSaved = Math.max(0, (row.daysInStage || 0) - targetDays);
    const nextProjectedCompletion =
      daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

    const patch = {
      turnStatus: "Monitoring",
      blockers: ["No active blockers"],
      nextAction: "Prepare for dispatch",
      daysInStage: targetDays,
      projectedCompletion: nextProjectedCompletion,
    };

    patchRow(id, patch);
    recordActionOutcome(row, patch, "Resolve issue");
  }

  function handleFlagReady(id) {
    const row = enrichedRows.find((r) => r.id === id);
    if (!row) return;

    const daysSaved = row.daysInStage || 0;
    const nextProjectedCompletion =
      daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

    const patch = {
      turnStatus: "Ready",
      nextAction: "Ready for execution",
      daysInStage: 0,
      projectedCompletion: nextProjectedCompletion,
    };

    patchRow(id, patch);
    recordActionOutcome(row, patch, "Mark ready");
  }

  function applySystemView(view) {
    const config = view.getFilters(enrichedRows);

    setQueueFilter(config.queueFilter || "All Open Turns");
    setSortBy(config.sortBy || "Priority");
    setActiveSystemView(view.id);
    setActiveSavedViewId(null);

    if (config.customFilter) {
      setCustomRowFilter(() => config.customFilter);
    } else {
      setCustomRowFilter(null);
    }
  }

  function handleApplyTopAction(row) {
    if (row.turnStatus === "Blocked") {
      handleResolve(row.id);
      return;
    }

    if (row.currentStage === "Failed Rent Ready") {
      const daysSaved = Math.max(0, (row.daysInStage || 0) - 1);
      const nextProjectedCompletion =
        daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

      const patch = {
        currentStage: "Rent Ready Open",
        daysInStage: 1,
        turnStatus: "Monitoring",
        nextAction: "Re-inspect and confirm ready state",
        blockers: ["No active blockers"],
        projectedCompletion: nextProjectedCompletion,
      };

      patchRow(row.id, patch);
      recordActionOutcome(row, patch, "Recover failed rent ready");
      return;
    }

    if (row.currentStage === "Owner Approval") {
      const daysSaved = row.daysInStage || 0;
      const nextProjectedCompletion =
        daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

      const patch = {
        currentStage: "Dispatch",
        daysInStage: 0,
        nextAction: "Confirm vendor schedule",
        turnStatus: "Monitoring",
        blockers: ["No active blockers"],
        projectedCompletion: nextProjectedCompletion,
      };

      patchRow(row.id, patch);
      recordActionOutcome(row, patch, "Advance owner approval");
      return;
    }

    const targetDays = Math.max(0, row.stageSla - 1);
    if ((row.daysInStage || 0) <= targetDays) return;

    const daysSaved = Math.max(0, (row.daysInStage || 0) - targetDays);
    const nextProjectedCompletion =
      daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

    const patch = {
      daysInStage: targetDays,
      turnStatus: "Monitoring",
      nextAction: "Prepare for dispatch",
      projectedCompletion: nextProjectedCompletion,
    };

    patchRow(row.id, patch);
    recordActionOutcome(row, patch, "Apply top action");
  }

  function saveCurrentView() {
    const name = window.prompt("Name this saved view");
    if (!name?.trim()) return;

    const view = {
      id: `view-${Date.now()}`,
      name: name.trim(),
      queueFilter,
      selectedStageFilter,
      sortBy,
    };

    persistSavedViews([...savedViews, view]);
    setActiveSavedViewId(view.id);
  }

  function applySavedViewPreset(view) {
    setQueueFilter(view.queueFilter || "All Open Turns");
    setSortBy(view.sortBy || "Priority");
    setActiveSavedViewId(view.id);

    if (selectedStageFilter && selectedStageFilter !== view.selectedStageFilter) {
      toggleStageFilter(selectedStageFilter);
    }
    if (view.selectedStageFilter && view.selectedStageFilter !== selectedStageFilter) {
      toggleStageFilter(view.selectedStageFilter);
    }
  }

  function deleteSavedView(id) {
    const next = savedViews.filter((view) => view.id !== id);
    persistSavedViews(next);
    if (activeSavedViewId === id) setActiveSavedViewId(null);
  }

  function resetQueueViewFull() {
    resetQueueView();
    setActiveSystemView(null);
    setActiveSavedViewId(null);
    setCustomRowFilter(null);
  }

  const isExecView = viewMode === "exec";

  const execReadout = useMemo(() => {
    const blocked = enrichedRows.filter((row) => row.turnStatus === "Blocked").length;
    const failed = enrichedRows.filter((row) => row.currentStage === "Failed Rent Ready").length;
    const critical = enrichedRows.filter((row) => row.priority.label === "Critical").length;
    return { blocked, failed, critical };
  }, [enrichedRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Control Center</div>
          <div className="mt-1 text-sm text-slate-500">
            {isExecView
              ? "Portfolio-level execution intelligence with bottlenecks, heatmap signals, and intervention priorities."
              : "Work the live turn pipeline directly from TurnIQ."}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Live
            </span>
            <span>{mode === "exec" ? "Executive audience" : "Operator audience"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetQueueViewFull}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset view
          </button>
          {!isExecView ? (
            <>
              <button
                onClick={() => setQueueFilter("Blocked Turns")}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Focus blocked
              </button>
              <button
                onClick={() => setQueueFilter("Over SLA")}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Focus over SLA
              </button>
            </>
          ) : null}
        </div>
      </div>

      {lastActionImpact ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Action applied on <span className="font-medium">{lastActionImpact.property}</span> — saved{" "}
          {lastActionImpact.daysSaved} days, moved ECD from{" "}
          <span className="font-medium">{formatShortDate(lastActionImpact.prevECD)}</span> to{" "}
          <span className="font-medium">{formatShortDate(lastActionImpact.nextECD)}</span>, and protected $
          {lastActionImpact.revenueProtected}.
        </div>
      ) : null}

      {!isExecView ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xl font-semibold text-slate-900">Quick Views</div>
              <button onClick={saveCurrentView} className="text-sm underline">
                Save current view
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SYSTEM_VIEWS.map((view) => (
                <button
                  key={view.id}
                  onClick={() => applySystemView(view)}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    activeSystemView === view.id
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {view.name}
                </button>
              ))}
            </div>

            {savedViews.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {savedViews.map((view) => (
                  <div
                    key={view.id}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                      activeSavedViewId === view.id
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white"
                    }`}
                  >
                    <button onClick={() => applySavedViewPreset(view)}>{view.name}</button>
                    <button
                      onClick={() => deleteSavedView(view.id)}
                      className={activeSavedViewId === view.id ? "text-white/70" : "text-slate-400"}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">No saved views yet.</div>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Working Queue</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{workingRows.length}</div>
              <div className="mt-1 text-sm text-slate-500">{queueFilter}</div>
            </Card>

            <Card>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-xs uppercase tracking-wide text-rose-700">Failed Rent Ready</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {queueSummary.failedRentReady}
                </div>
                <div className="mt-1 text-xs text-rose-700">Rework required</div>
              </div>
            </Card>

            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Critical Priority</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{queueSummary.critical}</div>
              <div className="mt-1 text-sm text-slate-500">Immediate attention required</div>
            </Card>

            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Blocked</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{queueSummary.blocked}</div>
              <div className="mt-1 text-sm text-slate-500">Need direct intervention</div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Guided Workflow</div>
                <div className="mt-1 text-sm text-slate-500">
                  Step-by-step operator actions prioritized by recoverable time and revenue.
                </div>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="text-3xl font-semibold text-slate-900">
                    {portfolioImpact.daysRecovered}
                  </div>
                  <div className="text-sm text-slate-500">Days recoverable</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-slate-900">
                    ${portfolioImpact.revenueRecovered.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">Revenue protected</div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {topActions.map((row) => (
                <div
                  key={row.id}
                  className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{row.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.currentStage} • {row.market}
                      </div>
                    </div>
                    <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
                  </div>

                  <div className="mt-3 text-sm font-medium text-slate-900">{row.nextAction}</div>
                  <div className="mt-2 text-xs text-slate-500">{row.priority.whyNow}</div>

                  <div className="mt-4 space-y-2">
                    {row.workflowSteps.map((step, index) => (
                      <div
                        key={step}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-sm text-slate-700">
                    +{row.impact.daysRecovered} days • ${row.impact.revenueRecovered}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {row.rentSourceLabel} • ${row.impact.dailyRentValue}/day
                  </div>

                  {row.lastAction ? (
                    <div className="mt-2 text-xs text-emerald-600">
                      {row.lastAction.label} • {row.lastAction.daysRecovered}d saved • $
                      {row.lastAction.revenueProtected || 0} protected
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">
                      No action taken yet — learning starts after first intervention
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <button
                      onClick={() => handleApplyTopAction(row)}
                      disabled={row.impact.daysRecovered <= 0}
                      className={`w-full rounded-md px-3 py-1 text-xs font-medium ${
                        row.impact.daysRecovered > 0
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      {row.impact.daysRecovered > 0 ? "Apply Action" : "No action benefit"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Stage Buckets</div>
                <div className="mt-1 text-sm text-slate-500">
                  Click a stage to isolate the queue and surface stale turns faster.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_FILTER_VIEWS.map((view) => (
                  <button
                    key={view}
                    onClick={() => setQueueFilter(view)}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      queueFilter === view
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {stageBuckets.map((bucket) => (
                <button
                  key={bucket.stage}
                  onClick={() => toggleStageFilter(bucket.stage)}
                  className="text-left"
                >
                  <div
                    className={`rounded-2xl border p-4 transition ${
                      selectedStageFilter === bucket.stage
                        ? "border-slate-900 bg-slate-50"
                        : bucket.stage === "Failed Rent Ready"
                        ? "border-red-200 bg-red-50 hover:bg-red-100"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{bucket.stage}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {bucket.stage === "Failed Rent Ready"
                            ? `${bucket.count} turns`
                            : `${bucket.count} turns • avg ${bucket.avgDays}d`}
                        </div>
                      </div>
                      {bucket.stage === "Failed Rent Ready" ? (
                        <Pill tone={bucket.count > 0 ? "red" : "green"}>
                          {bucket.count > 0 ? `${bucket.count} failed` : "No failures"}
                        </Pill>
                      ) : (
                        <Pill tone={bucket.tone}>{bucket.overdueCount} overdue</Pill>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      {bucket.stage === "Failed Rent Ready"
                        ? bucket.count > 0
                          ? `${bucket.blockedCount} blocked`
                          : "No recovery required"
                        : `SLA ${bucket.sla}d • ${bucket.blockedCount} blocked`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div className="grid items-start gap-6 xl:grid-cols-12">
            <div className="xl:col-span-9 min-w-0">
              <div className="flex flex-col gap-6">
                <div className="shrink-0">
                  <Card>
                    <div className="text-2xl font-semibold text-slate-900">Action Outcome Learning</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Tracks which interventions are creating the most operational and financial impact.
                    </div>

                    {actionLearningSummary.length ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {actionLearningSummary.map((item) => (
                          <div
                            key={item.actionLabel}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="text-sm font-medium text-slate-900">{item.actionLabel}</div>
                            <div className="mt-3 text-2xl font-semibold text-slate-900">
                              ${item.totalRevenueProtected.toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.totalDaysSaved}d recovered across {item.uses} uses
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              Avg {item.avgDaysSaved}d • ${item.avgRevenueProtected.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">
                        No action outcomes logged yet. Apply actions in Control Center to start building a learning loop.
                      </div>
                    )}
                  </Card>
                </div>

                <div className="shrink-0">
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-slate-900">Live Working Queue</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Built to reduce dependency on Google Sheets and make TurnIQ the working surface.
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm text-slate-500">Sort by</div>
                        {["Priority", "Risk", "Days in Stage", "Open Days", "ECD", "Stage"].map((option) => (
                          <button
                            key={option}
                            onClick={() => setSortBy(option)}
                            className={`rounded-xl px-3 py-2 text-sm ${
                              sortBy === option
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-[1760px] text-sm">
                        <thead className="bg-slate-50 text-left text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium">Turn</th>
                            <th className="px-4 py-3 font-medium">Priority</th>
                            <th className="px-4 py-3 font-medium">Why Now</th>
                            <th className="px-4 py-3 font-medium">Stage</th>
                            <th className="px-4 py-3 font-medium">Days</th>
                            <th className="px-4 py-3 font-medium">Owner</th>
                            <th className="px-4 py-3 font-medium">Blocker</th>
                            <th className="px-4 py-3 font-medium">Next Action</th>
                            <th className="px-4 py-3 font-medium">Follow-up</th>
                            <th className="px-4 py-3 font-medium">Notes</th>
                            <th className="px-4 py-3 font-medium">PMS</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workingRows.map((row) => (
                            <tr
                              key={row.id}
                              className={`border-t border-slate-100 ${
                                selectedPropertyId === row.id ? "bg-slate-50" : ""
                              }`}
                            >
                              <td className="w-[300px] px-4 py-4 align-top">
                                <button
                                  onClick={() => setSelectedPropertyId(row.id)}
                                  className="text-left"
                                >
                                  <div className="max-w-[220px] text-base font-medium text-blue-700 hover:underline">
                                    {row.name}
                                  </div>
                                </button>
                                <div className="mt-1 text-sm text-slate-500">
                                  {row.market} • {row.currentStage}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  Risk {row.risk} • {row.turnStatus}
                                </div>
                                <div className="mt-2 text-xs text-slate-400">
                                  {row.rentSourceLabel} • ${row.dailyRentValue}/day
                                </div>
                              </td>

                              <td className="w-[140px] px-4 py-4 align-top">
                                <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
                                <div className="mt-2 text-sm text-slate-500">
                                  Score {row.priority.score}
                                </div>
                              </td>

                              <td className="w-[320px] px-4 py-4 align-top">
                                <div className="text-sm leading-7 text-slate-700">
                                  {row.priority.whyNow}
                                </div>
                              </td>

                              <td className="w-[220px] px-4 py-4 align-top">
                                <div className="font-medium text-slate-900">{row.currentStage}</div>
                                <div className="mt-1 text-sm text-slate-500">SLA {row.stageSla}d</div>
                              </td>

                              <td className="w-[140px] px-4 py-4 align-top">
                                <Pill tone={row.overdue ? "red" : "slate"}>
                                  {row.daysInStage || 0}d
                                </Pill>
                                <div className="mt-2 text-sm">
                                  {row.overdue ? (
                                    <span className="font-medium text-red-600">
                                      {getDaysOverSla(row)}d over SLA
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Within SLA</span>
                                  )}
                                </div>
                              </td>

                              <td className="w-[180px] px-4 py-4 align-top">
                                <input
                                  value={row.turnOwner || ""}
                                  onChange={(e) => handleOwnerChange(row.id, e.target.value)}
                                  className="w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </td>

                              <td className="w-[230px] px-4 py-4 align-top">
                                <select
                                  value={row.blocker}
                                  onChange={(e) => handleBlockerChange(row.id, e.target.value, row)}
                                  className="w-[210px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                  {BLOCKER_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="w-[230px] px-4 py-4 align-top">
                                <div className="space-y-2">
                                  <select
                                    value={row.nextAction}
                                    onChange={(e) => handleNextActionChange(row.id, e.target.value)}
                                    className="w-[210px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  >
                                    {NEXT_ACTION_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>

                                  {(row.overdue || row.turnStatus === "Blocked") && (
                                    <div className="text-xs font-medium text-red-600">Action required</div>
                                  )}
                                </div>
                              </td>

                              <td className="w-[150px] px-4 py-4 align-top">
                                <input
                                  type="date"
                                  value={row.followUpDate || ""}
                                  onChange={(e) => handleFollowUpChange(row.id, e.target.value)}
                                  className="w-[140px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                                <div className="mt-2 text-xs text-slate-500">
                                  {getLastTouchedLabel(row)}
                                </div>
                              </td>

                              <td className="w-[250px] px-4 py-4 align-top">
                                <div className="flex w-[230px] gap-2">
                                  <input
                                    value={draftNotes[row.id] || ""}
                                    onChange={(e) =>
                                      setDraftNotes((prev) => ({
                                        ...prev,
                                        [row.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Add note"
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  />
                                  <button
                                    onClick={() => handleInlineNoteSave(row.id, row)}
                                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Save
                                  </button>
                                </div>
                                {row.operationalNotes?.length ? (
                                  <div className="mt-2 text-xs text-slate-500">
                                    Latest: {row.operationalNotes[row.operationalNotes.length - 1]}
                                  </div>
                                ) : null}
                              </td>

                              <td className="w-[100px] px-4 py-4 align-top whitespace-nowrap">
                                <a
                                  href={row.systemLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-blue-700 hover:underline"
                                >
                                  Open →
                                </a>
                              </td>

                              <td className="w-[130px] px-4 py-4 align-top">
                                <div className="flex w-[110px] flex-col gap-2">
                                  <button
                                    onClick={() => handleResolve(row.id)}
                                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    onClick={() => handleFlagReady(row.id)}
                                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Mark ready
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {!workingRows.length ? (
                            <tr>
                              <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-500">
                                No turns match the current filters.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3 min-w-0">
              <div className="flex flex-col gap-6">
                <div className="shrink-0">
                  <Card>
                    <div className="text-xl font-semibold text-slate-900">Guided Workflow Summary</div>
                    <div className="mt-1 text-sm text-slate-500">
                      The highest-friction execution issues standing out right now
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-red-700">Problem Child Turns</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          {workingRows.filter((row) => row.overdue || row.turnStatus === "Blocked").length}
                        </div>
                        <div className="mt-1 text-xs text-red-700">Over SLA or blocked</div>
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-amber-700">Stale Turns</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{queueSummary.stale}</div>
                        <div className="mt-1 text-xs text-amber-700">No recent movement</div>
                      </div>

                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-blue-700">Pending Approvals</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          {workingRows.filter((row) => row.currentStage === "Owner Approval").length}
                        </div>
                        <div className="mt-1 text-xs text-blue-700">Waiting for owner action</div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="shrink-0">
                  <Card>
                    <div className="text-xl font-semibold text-slate-900">Team Load</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Active turns and high-risk concentration by operator
                    </div>

                    <div className="mt-4 space-y-3">
                      {operatorSummary.map((item) => (
                        <div key={item.owner} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-900">{item.owner}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                {item.activeTurns} active turns
                              </div>
                            </div>
                            <Pill tone={item.highRisk > 0 ? "red" : "green"}>
                              {item.highRisk} high risk
                            </Pill>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <Card>
            <div className="text-xl font-semibold text-slate-900">Executive Readout</div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              TurnIQ is currently surfacing <span className="font-medium">{execReadout.critical}</span> critical turns,
              <span className="font-medium"> {execReadout.blocked}</span> blocked turns, and
              <span className="font-medium"> {execReadout.failed}</span> failed-rent-ready homes.
              {topStageBottleneck
                ? ` The current portfolio bottleneck is ${topStageBottleneck.stage}, averaging ${topStageBottleneck.avgDaysInStage} days in stage.`
                : ""}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Critical Turns</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{execReadout.critical}</div>
              <div className="mt-1 text-sm text-slate-500">Highest intervention urgency</div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Blocked Turns</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{execReadout.blocked}</div>
              <div className="mt-1 text-sm text-slate-500">Immediate flow disruption</div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Failed Rent Ready</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{execReadout.failed}</div>
              <div className="mt-1 text-sm text-slate-500">Direct rework signal</div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-slate-500">Modeled Value</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                ${portfolioImpact.revenueRecovered.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-slate-500">Recoverable revenue signal</div>
            </Card>
          </div>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold text-slate-900">Stage Flow / Bottleneck Heatmap</div>
                <div className="mt-1 text-sm text-slate-500">
                  A portfolio view of stage congestion, blocked concentration, and delay pressure.
                </div>
              </div>
              {topStageBottleneck ? (
                <Pill tone="amber">{topStageBottleneck.stage} bottleneck</Pill>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stageBuckets.map((bucket) => {
                const heatClass =
                  bucket.stage === "Failed Rent Ready"
                    ? "border-red-200 bg-red-50"
                    : bucket.blockedPercent >= 40 || bucket.overdueCount > 0
                    ? "border-red-200 bg-red-50"
                    : bucket.avgDays > bucket.sla
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-white";

                return (
                  <div key={bucket.stage} className={`rounded-2xl border p-4 ${heatClass}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{bucket.stage}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {bucket.count} turns • avg {bucket.avgDays}d
                        </div>
                      </div>
                      <Pill tone={bucket.stage === "Failed Rent Ready" ? "red" : bucket.tone}>
                        {bucket.blockedPercent}% blocked
                      </Pill>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Count</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{bucket.count}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Avg Days</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{bucket.avgDays}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Overdue</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          {bucket.overdueCount}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <Card>
                <div className="text-2xl font-semibold text-slate-900">Intervention Focus</div>
                <div className="mt-1 text-sm text-slate-500">
                  Highest-leverage turns based on blocked state, delay exposure, and recovery upside.
                </div>

                <div className="mt-4 space-y-3">
                  {topActions.slice(0, 5).map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.market} • {row.currentStage}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">{row.priority.whyNow}</div>
                      </div>

                      <div className="text-right">
                        <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          +{row.impact.daysRecovered}d
                        </div>
                        <div className="text-xs text-slate-500">
                          ${row.impact.revenueRecovered.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="xl:col-span-5">
              <Card>
                <div className="text-2xl font-semibold text-slate-900">Action Outcome Learning</div>
                <div className="mt-1 text-sm text-slate-500">
                  Which interventions are producing measurable recovery.
                </div>

                {actionLearningSummary.length ? (
                  <div className="mt-4 space-y-3">
                    {actionLearningSummary.map((item) => (
                      <div
                        key={item.actionLabel}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="text-sm font-medium text-slate-900">{item.actionLabel}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          ${item.totalRevenueProtected.toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.totalDaysSaved}d recovered across {item.uses} uses
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          Avg {item.avgDaysSaved}d • ${item.avgRevenueProtected.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No outcome learning logged yet.
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}