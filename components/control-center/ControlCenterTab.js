"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import TurnDetailDrawer from "./TurnDetailDrawer";
import { getStageTone } from "../../utils/tone";
import {
  getAiRecommendation,
  getAiPriorityScore,
  getAiRiskDrivers,
} from "../../utils/turnAi";
import {
  buildPatchForResolve,
  buildPatchForMarkReady,
  buildPatchForApplyRecommendation,
} from "../../utils/turnActions";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
  "Top 10 Actions",
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
    id: "top_actions",
    name: "Top 10 Actions",
    getFilters: () => ({
      queueFilter: "Top 10 Actions",
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
];

const STORAGE_KEY = "turniq_control_center_saved_views_v13";
const ACTION_LEARNING_STORAGE_KEY = "turniq_action_learning_v1";

function getStageSla(stage) {
  return STAGE_SLA[stage] || 3;
}

function getPrimaryBlocker(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  const live = blockers.filter(
    (item) => item && item !== "No active blockers" && item !== "No major blockers"
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

  if (row.currentStage === "Failed Rent Ready") return "Resolve rework";
  if (row.currentStage === "Owner Approval") return "Escalate approval";
  if (blocker.includes("appliance")) return "Confirm appliance ETA";
  if (blocker.includes("vendor")) return "Assign or confirm vendor";
  if (blocker.includes("access")) return "Resolve access";
  if (blocker.includes("trade")) return "Coordinate trades";
  if (!row.vendor || row.vendor === "TBD") return "Assign vendor";
  if (row.turnStatus === "Blocked") return "Remove blocker";

  return "Advance execution";
}

function getLastTouchedLabel(row) {
  if (row.followUpDate) return `Follow-up ${row.followUpDate}`;
  if ((row.daysInStage || 0) >= 6) return "No recent movement";
  return "Recently active";
}

function buildImpact(row) {
  let daysRecovered = 0;

  if (row.currentStage === "Failed Rent Ready") daysRecovered += 3;
  if (row.turnStatus === "Blocked") daysRecovered += 2;
  if (row.currentStage === "Owner Approval") daysRecovered += 2;

  const daysOver = getDaysOverSla(row);
  if (daysOver > 0) daysRecovered += Math.min(4, daysOver);
  if (isStale(row)) daysRecovered += 1;

  const revenueRecovered = getRevenueProtected(daysRecovered, row);

  return {
    daysRecovered,
    revenueRecovered,
    dailyRentValue: getDailyRentValue(row),
    rentSourceLabel: getRentSourceLabel(row),
  };
}

function getActionHeadline(row) {
  if (row.currentStage === "Failed Rent Ready") {
    return "Resolve failed rent ready and re-certify";
  }
  if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
    return "Escalate approval and unblock dispatch";
  }
  if (row.turnStatus === "Blocked") {
    return "Clear blocker and resume execution";
  }
  if (!row.vendor || row.vendor === "TBD") {
    return "Assign vendor coverage now";
  }
  if (getDaysOverSla(row) > 0) {
    return "Compress over-SLA stage time";
  }
  return getNextAction(row);
}

function getWhyNow(row) {
  const reasons = [];

  if (row.currentStage === "Failed Rent Ready") reasons.push("failed ready");
  if (row.turnStatus === "Blocked") reasons.push("blocked");
  if (row.currentStage === "Owner Approval") reasons.push("approval pending");

  const daysOver = getDaysOverSla(row);
  if (daysOver > 0) reasons.push(`${daysOver}d over SLA`);

  if ((row.risk || 0) >= 85) reasons.push("very high risk");
  else if ((row.risk || 0) >= 75) reasons.push("high risk");

  const blocker = getPrimaryBlocker(row);
  if (blocker !== "None") reasons.push(blocker);

  return reasons.length ? reasons.slice(0, 4).join(" • ") : "execution attention needed";
}

function buildActionEngine(row) {
  const impact = buildImpact(row);
  let score = 0;

  if (row.currentStage === "Failed Rent Ready") score += 35;
  if (row.turnStatus === "Blocked") score += 28;
  if (row.currentStage === "Owner Approval") score += 12;
  if (!row.vendor || row.vendor === "TBD") score += 10;
  if (isStale(row)) score += 8;
  score += Math.min(24, getDaysOverSla(row) * 6);
  score += Math.min(18, Math.round((row.risk || 0) / 8));
  score += Math.min(12, impact.daysRecovered * 2);
  score += Math.min(10, Math.round(impact.revenueRecovered / 150));

  let urgency = "Low";
  let tone = "green";

  if (score >= 75) {
    urgency = "Critical";
    tone = "red";
  } else if (score >= 50) {
    urgency = "High";
    tone = "amber";
  } else if (score >= 28) {
    urgency = "Medium";
    tone = "blue";
  }

  return {
    score,
    urgency,
    tone,
    headline: getActionHeadline(row),
    whyNow: getWhyNow(row),
    daysRecovered: impact.daysRecovered,
    revenueRecovered: impact.revenueRecovered,
  };
}

function buildSourceSystemMetadata(row) {
  const sourceSystemName = row.sourceSystemName || "Connected PMS";
  const syncStatus = row.syncStatus || "Connected";
  const lastSyncedAt = row.lastSyncedAt || new Date().toISOString();
  const fieldCoverageLabel = row.fieldCoverageLabel || "Core fields";
  const externalRecordId = row.externalRecordId || `turn-${row.id}`;
  const portfolioName = row.portfolioName || "Default Portfolio";

  const workOrders =
    row.workOrders ||
    (row.scope
      ? [
          {
            id: `${row.id}-wo-1`,
            title: row.scope,
            trade: row.scope.includes("Paint")
              ? "Paint"
              : row.scope.includes("Floor")
              ? "Flooring"
              : row.scope.includes("Clean")
              ? "Cleaning"
              : "General",
            vendor: row.vendor || "Unassigned",
            status: row.turnStatus === "Blocked" ? "Blocked" : "In Progress",
            statusTone: row.turnStatus === "Blocked" ? "red" : "amber",
          },
        ]
      : []);

  const approvals =
    row.approvals ||
    (row.currentStage === "Owner Approval"
      ? [{ id: `${row.id}-approval-1`, status: "Pending owner approval" }]
      : []);

  const attachments =
    row.attachments ||
    (workOrders.length ? [{ id: `${row.id}-attachment-1`, label: "Scope detail" }] : []);

  return {
    sourceSystemName,
    syncStatus,
    lastSyncedAt,
    lastSyncedLabel: row.lastSyncedLabel || "Source system update",
    fieldCoverageLabel,
    externalRecordId,
    portfolioName,
    moveOutDate: row.moveOutDate || row.leaseEnd || null,
    initialProjectedCompletion: row.initialProjectedCompletion || row.projectedCompletion || null,
    estimatedAmount: row.estimatedAmount || row.projectedCost || row.estimatedCost || 0,
    approvedAmount:
      row.approvedAmount ||
      (row.currentStage === "Owner Approval" ? 0 : row.projectedCost || row.estimatedCost || 0),
    workOrders,
    approvals,
    attachments,
    workOrderCount: workOrders.length,
    approvalCount: approvals.length,
    attachmentCount: attachments.length,
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
      systemLink: row.systemLink || `https://pms.example/turns/${encodeURIComponent(row.id)}`,
      lastAction: row.lastAction || null,
      dailyRentValue: getDailyRentValue(row),
      rentSourceLabel: getRentSourceLabel(row),
      workflowCompletedSteps: Array.isArray(row.workflowCompletedSteps)
        ? row.workflowCompletedSteps
        : [],
      ...buildSourceSystemMetadata(row),
    };

    const actionEngine = buildActionEngine(base);

    return {
      ...base,
      actionEngine,
      aiRecommendation: getAiRecommendation(base),
      aiPriorityScore: Math.max(getAiPriorityScore(base), actionEngine.score),
      aiRiskDrivers: getAiRiskDrivers(base),
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
      ? Number((stageRows.reduce((sum, row) => sum + (row.daysInStage || 0), 0) / count).toFixed(1))
      : 0;

    const overdueCount = stageRows.filter((row) => row.overdue).length;
    const blockedCount = stageRows.filter((row) => row.turnStatus === "Blocked").length;
    const blockedPercent = count ? Math.round((blockedCount / count) * 100) : 0;

    return {
      stage,
      count,
      avgDays,
      overdueCount,
      blockedCount,
      blockedPercent,
      sla: getStageSla(stage),
      tone: getStageTone(overdueCount, avgDays, getStageSla(stage)),
    };
  });
}

function sortRows(rows, sortBy) {
  const sorted = [...rows];

  if (sortBy === "Priority") {
    sorted.sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
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
  } else if (sortBy === "Impact") {
    sorted.sort((a, b) => b.actionEngine.revenueRecovered - a.actionEngine.revenueRecovered);
  }

  return sorted;
}

function applyFilter(rows, queueFilter) {
  if (queueFilter === "Blocked Turns") {
    return rows.filter((row) => row.turnStatus === "Blocked");
  }
  if (queueFilter === "At-Risk Turns") {
    return rows.filter((row) => row.risk >= 75 || row.overdue);
  }
  if (queueFilter === "Stale Turns") {
    return rows.filter((row) => row.stale);
  }
  if (queueFilter === "Pending Approvals") {
    return rows.filter((row) => row.currentStage === "Owner Approval");
  }
  if (queueFilter === "Vendorless Turns") {
    return rows.filter((row) => !row.vendor || row.vendor === "TBD");
  }
  if (queueFilter === "Over SLA") {
    return rows.filter((row) => row.overdue);
  }
  if (queueFilter === "Critical Priority") {
    return rows.filter((row) => row.actionEngine.urgency === "Critical");
  }
  if (queueFilter === "Failed Rent Ready") {
    return rows.filter((row) => row.currentStage === "Failed Rent Ready");
  }
  if (queueFilter === "Top 10 Actions") {
    return [...rows]
      .filter(
        (row) =>
          row.actionEngine.score >= 28 ||
          row.turnStatus === "Blocked" ||
          row.currentStage === "Failed Rent Ready" ||
          row.actionEngine.daysRecovered > 0
      )
      .sort((a, b) => {
        return (
          b.actionEngine.revenueRecovered - a.actionEngine.revenueRecovered ||
          b.actionEngine.daysRecovered - a.actionEngine.daysRecovered ||
          b.aiPriorityScore - a.aiPriorityScore ||
          (b.risk || 0) - (a.risk || 0)
        );
      })
      .slice(0, 10);
  }
  return rows;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Updated just now";

  const then = new Date(timestamp).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Updated just now";
  if (diffMin === 1) return "Updated 1m ago";
  if (diffMin < 60) return `Updated ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "Updated 1h ago";
  if (diffHr < 24) return `Updated ${diffHr}h ago`;

  return `Updated ${formatShortDate(new Date(then).toISOString())}`;
}

function buildWorkflowPlan(row) {
  const completed = new Set(row.workflowCompletedSteps || []);
  const liveBlocker = getPrimaryBlocker(row);

  if (row.currentStage === "Failed Rent Ready") {
    return {
      title: "Recover failed rent ready",
      summary: "Clear rework, re-inspect, and get the home back into clean execution.",
      primaryActionLabel: "Complete Step",
      steps: [
        {
          id: "rework",
          label: "Clear rework items",
          action: "resolve_rework",
          done:
            completed.has("rework") ||
            (row.currentStage !== "Failed Rent Ready" && row.turnStatus !== "Blocked"),
        },
        {
          id: "inspect",
          label: "Re-inspect home",
          action: "reinspect",
          done:
            completed.has("inspect") ||
            row.currentStage === "Rent Ready Open" ||
            row.turnStatus === "Ready",
        },
        {
          id: "certify",
          label: "Confirm rent ready",
          action: "ready",
          done: completed.has("certify") || row.turnStatus === "Ready",
        },
      ],
    };
  }

  if (row.currentStage === "Owner Approval") {
    return {
      title: "Push approval to dispatch",
      summary: "Approval is the main unlock for this turn.",
      primaryActionLabel: "Complete Step",
      steps: [
        {
          id: "escalate_approval",
          label: "Escalate owner approval",
          action: "advance_approval",
          done: completed.has("escalate_approval") || row.currentStage !== "Owner Approval",
        },
        {
          id: "confirm_scope",
          label: "Confirm scope signoff",
          action: "mark_step_only",
          done: completed.has("confirm_scope") || row.currentStage === "Dispatch",
        },
        {
          id: "dispatch_vendor",
          label: "Dispatch vendor",
          action: "progress",
          done: completed.has("dispatch_vendor") || row.currentStage === "Dispatch",
        },
      ],
    };
  }

  if (row.turnStatus === "Blocked" || liveBlocker !== "None") {
    return {
      title: "Clear blocker and resume execution",
      summary: "Blocked workflow is the primary source of avoidable delay here.",
      primaryActionLabel: "Complete Step",
      steps: [
        {
          id: "identify_owner",
          label: "Identify blocker owner",
          action: "mark_step_only",
          done: completed.has("identify_owner") || Boolean(row.turnOwner),
        },
        {
          id: "remove_blocker",
          label: "Remove blocker",
          action: "resolve",
          done: completed.has("remove_blocker") || row.turnStatus !== "Blocked",
        },
        {
          id: "resume_execution",
          label: "Resume execution",
          action: "progress",
          done:
            completed.has("resume_execution") ||
            row.turnStatus === "Monitoring" ||
            row.turnStatus === "Ready",
        },
      ],
    };
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))) {
    return {
      title: "Protect ECD from appliance dependency",
      summary: "Appliance timing is the avoidable source of slippage.",
      primaryActionLabel: "Complete Step",
      steps: [
        {
          id: "confirm_eta",
          label: "Confirm appliance ETA",
          action: "mark_step_only",
          done: completed.has("confirm_eta"),
        },
        {
          id: "resequence_vendors",
          label: "Re-sequence vendors",
          action: "progress",
          done:
            completed.has("resequence_vendors") ||
            row.daysInStage <= Math.max(0, row.stageSla - 1),
        },
        {
          id: "hold_ecd",
          label: "Hold ECD",
          action: "ready",
          done: completed.has("hold_ecd") || row.turnStatus === "Ready",
        },
      ],
    };
  }

  return {
    title: "Advance execution",
    summary: "This turn is actionable with lighter coordination needs.",
    primaryActionLabel: "Complete Step",
    steps: [
      {
        id: "confirm_owner",
        label: "Confirm owner",
        action: "mark_step_only",
        done: completed.has("confirm_owner") || Boolean(row.turnOwner),
      },
      {
        id: "advance_action",
        label: "Advance next action",
        action: "progress",
        done:
          completed.has("advance_action") ||
          row.daysInStage <= Math.max(0, row.stageSla - 1),
      },
      {
        id: "ready_execution",
        label: "Ready for execution",
        action: "ready",
        done: completed.has("ready_execution") || row.turnStatus === "Ready",
      },
    ],
  };
}

function buildTopActionBuckets(rows) {
  const buckets = {
    unblock: {
      key: "unblock",
      label: "Unblock execution",
      description: "Blocked turns and failed-ready turns preventing forward progress.",
      rows: [],
      daysRecovered: 0,
      revenueRecovered: 0,
      tone: "red",
    },
    approval: {
      key: "approval",
      label: "Push approvals",
      description: "Turns waiting on owner approval before work can advance.",
      rows: [],
      daysRecovered: 0,
      revenueRecovered: 0,
      tone: "amber",
    },
    vendor: {
      key: "vendor",
      label: "Stabilize vendor path",
      description: "Vendorless turns or turns with vendor-dependent slippage.",
      rows: [],
      daysRecovered: 0,
      revenueRecovered: 0,
      tone: "blue",
    },
    compress: {
      key: "compress",
      label: "Compress stage time",
      description: "Over-SLA turns where faster execution can recover time immediately.",
      rows: [],
      daysRecovered: 0,
      revenueRecovered: 0,
      tone: "green",
    },
  };

  rows.forEach((row) => {
    let bucketKey = "compress";

    if (row.currentStage === "Failed Rent Ready" || row.turnStatus === "Blocked") {
      bucketKey = "unblock";
    } else if (row.currentStage === "Owner Approval") {
      bucketKey = "approval";
    } else if (!row.vendor || row.vendor === "TBD") {
      bucketKey = "vendor";
    } else if (
      (row.blockers || []).some((b) => String(b).toLowerCase().includes("vendor")) ||
      (row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))
    ) {
      bucketKey = "vendor";
    }

    buckets[bucketKey].rows.push(row);
    buckets[bucketKey].daysRecovered += row.actionEngine.daysRecovered || 0;
    buckets[bucketKey].revenueRecovered += row.actionEngine.revenueRecovered || 0;
  });

  return Object.values(buckets)
    .filter((bucket) => bucket.rows.length > 0)
    .sort((a, b) => b.revenueRecovered - a.revenueRecovered);
}

function StatCard({ label, value, tone = "slate", subtext }) {
  const toneClasses = {
    slate: "border-slate-200 bg-white",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
    green: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-500">{subtext}</div> : null}
    </div>
  );
}

function ActionBucketCard({ bucket }) {
  const toneClasses = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
    green: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[bucket.tone] || toneClasses.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{bucket.label}</div>
          <div className="mt-1 text-xs text-slate-600">{bucket.description}</div>
        </div>
        <Pill tone={bucket.tone}>{bucket.rows.length}</Pill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Recoverable</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {bucket.daysRecovered}d
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Protectable</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ${bucket.revenueRecovered.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ row, onOpen, onApply }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={row.actionEngine.tone}>{row.actionEngine.urgency}</Pill>
            <div className="text-xs text-slate-500">Score {row.aiPriorityScore}</div>
          </div>

          <button onClick={onOpen} className="mt-3 text-left">
            <div className="break-words text-lg font-semibold text-blue-700 hover:underline">
              {row.name}
            </div>
          </button>

          <div className="mt-1 text-sm text-slate-500">
            {row.market} • {row.currentStage} • ECD {formatShortDate(row.projectedCompletion)}
          </div>

          <div className="mt-3 text-sm font-medium text-slate-900">
            {row.actionEngine.headline}
          </div>
          <div className="mt-1 text-sm text-slate-600">{row.actionEngine.whyNow}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(row.aiRiskDrivers || []).slice(0, 4).map((driver) => (
              <span
                key={driver}
                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
              >
                {driver}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-[150px] shrink-0">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Modeled lift</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              +{row.actionEngine.daysRecovered}d
            </div>
            <div className="text-sm font-medium text-emerald-700">
              ${row.actionEngine.revenueRecovered.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {row.rentSourceLabel} • ${row.dailyRentValue}/day
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={onApply}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              Apply action
            </button>
            <button
              onClick={onOpen}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Open turn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TREND_SERIES = [
  { month: "Apr 2025", passRate: 49, failRate: 11, passGoal: 85, avgRriDays: 3.8, medianRriDays: 3.7, rriGoal: 2, turnsCompleted: 57, avgTurnDays: 19.1, avgCost: 6571 },
  { month: "May 2025", passRate: 56, failRate: 11, passGoal: 85, avgRriDays: 2.7, medianRriDays: 2.8, rriGoal: 2, turnsCompleted: 58, avgTurnDays: 15.1, avgCost: 3932 },
  { month: "Jun 2025", passRate: 37, failRate: 6, passGoal: 85, avgRriDays: 3.5, medianRriDays: 3.3, rriGoal: 2, turnsCompleted: 73, avgTurnDays: 16.9, avgCost: 4450 },
  { month: "Jul 2025", passRate: 63, failRate: 12, passGoal: 85, avgRriDays: 3.4, medianRriDays: 3.1, rriGoal: 2, turnsCompleted: 77, avgTurnDays: 16.7, avgCost: 4650 },
  { month: "Aug 2025", passRate: 69, failRate: 3, passGoal: 85, avgRriDays: 3.1, medianRriDays: 3.0, rriGoal: 2, turnsCompleted: 57, avgTurnDays: 15.0, avgCost: 4604 },
  { month: "Sep 2025", passRate: 75, failRate: 3, passGoal: 85, avgRriDays: 3.3, medianRriDays: 3.1, rriGoal: 2, turnsCompleted: 68, avgTurnDays: 16.9, avgCost: 4959 },
  { month: "Oct 2025", passRate: 76, failRate: 3, passGoal: 85, avgRriDays: 2.6, medianRriDays: 2.3, rriGoal: 2, turnsCompleted: 55, avgTurnDays: 15.9, avgCost: 4704 },
  { month: "Nov 2025", passRate: 66, failRate: 6, passGoal: 85, avgRriDays: 3.3, medianRriDays: 3.1, rriGoal: 2, turnsCompleted: 51, avgTurnDays: 20.8, avgCost: 5632 },
  { month: "Dec 2025", passRate: 68, failRate: 13, passGoal: 85, avgRriDays: 3.4, medianRriDays: 3.1, rriGoal: 2, turnsCompleted: 45, avgTurnDays: 22.7, avgCost: 5443 },
  { month: "Jan 2026", passRate: 53, failRate: 19, passGoal: 85, avgRriDays: 3.8, medianRriDays: 3.0, rriGoal: 2, turnsCompleted: 41, avgTurnDays: 27.0, avgCost: 5899 },
  { month: "Feb 2026", passRate: 58, failRate: 22, passGoal: 85, avgRriDays: 0.9, medianRriDays: 0.2, rriGoal: 2, turnsCompleted: 39, avgTurnDays: 19.8, avgCost: 4699 },
  { month: "Mar 2026", passRate: 45, failRate: 11, passGoal: 85, avgRriDays: 1.0, medianRriDays: 0.4, rriGoal: 2, turnsCompleted: 46, avgTurnDays: 18.3, avgCost: 5234 },
  { month: "Apr 2026", passRate: 25, failRate: 25, passGoal: 85, avgRriDays: 1.7, medianRriDays: 1.1, rriGoal: 2, turnsCompleted: 3, avgTurnDays: 28.0, avgCost: 3086 },
];

function TrendChartCard({ title, subtitle, children }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function ControlCenterTab({
  mode = "operator",
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
  const [localLastUpdated, setLocalLastUpdated] = useState(new Date().toISOString());
  const [drawerRow, setDrawerRow] = useState(null);

  const queueRef = useRef(null);

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

  const topActionRows = useMemo(() => {
    return [...enrichedRows]
      .filter(
        (row) =>
          row.turnStatus === "Blocked" ||
          row.currentStage === "Failed Rent Ready" ||
          row.actionEngine.score >= 28 ||
          row.actionEngine.daysRecovered > 0
      )
      .sort((a, b) => {
        return (
          b.actionEngine.revenueRecovered - a.actionEngine.revenueRecovered ||
          b.actionEngine.daysRecovered - a.actionEngine.daysRecovered ||
          b.aiPriorityScore - a.aiPriorityScore ||
          (b.risk || 0) - (a.risk || 0)
        );
      })
      .slice(0, 10)
      .map((row) => ({
        ...row,
        workflowPlan: buildWorkflowPlan(row),
      }));
  }, [enrichedRows]);

  const queueSummary = useMemo(() => {
    const blocked = workingRows.filter((row) => row.turnStatus === "Blocked").length;
    const overdue = workingRows.filter((row) => row.overdue).length;
    const stale = workingRows.filter((row) => row.stale).length;
    const critical = workingRows.filter((row) => row.actionEngine.urgency === "Critical").length;
    const failedRentReady = workingRows.filter((row) => row.currentStage === "Failed Rent Ready").length;
    const vendorless = workingRows.filter((row) => !row.vendor || row.vendor === "TBD").length;

    return { blocked, overdue, stale, critical, failedRentReady, vendorless };
  }, [workingRows]);

  const actionEngineSummary = useMemo(() => {
    return topActionRows.reduce(
      (acc, row) => {
        acc.daysRecovered += row.actionEngine.daysRecovered;
        acc.revenueRecovered += row.actionEngine.revenueRecovered;
        if (row.actionEngine.urgency === "Critical") acc.critical += 1;
        return acc;
      },
      { daysRecovered: 0, revenueRecovered: 0, critical: 0 }
    );
  }, [topActionRows]);

  const topActionBuckets = useMemo(() => {
    return buildTopActionBuckets(topActionRows);
  }, [topActionRows]);

  const trendData = useMemo(() => TREND_SERIES, []);
  const operatorTrendCards = useMemo(
    () => ["rri_pass_rate", "rri_completion_time", "avg_turn_time"],
    []
  );
  const execTrendCards = useMemo(
    () => ["turns_completed", "avg_turn_time", "rri_pass_rate", "avg_cost"],
    []
  );
  const visibleTrendCards = mode === "exec" ? execTrendCards : operatorTrendCards;

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
        avgRevenueProtected: item.uses ? Math.round(item.totalRevenueProtected / item.uses) : 0,
      }))
      .sort((a, b) => b.totalRevenueProtected - a.totalRevenueProtected)
      .slice(0, 5);
  }, [actionLearningLog]);

  const computedLastUpdated = useMemo(() => {
    const timestamps = [];

    if (localLastUpdated) timestamps.push(new Date(localLastUpdated).getTime());

    enrichedRows.forEach((row) => {
      if (row.lastAction?.timestamp) {
        timestamps.push(new Date(row.lastAction.timestamp).getTime());
      }
    });

    actionLearningLog.slice(0, 10).forEach((entry) => {
      if (entry.timestamp) timestamps.push(new Date(entry.timestamp).getTime());
    });

    const valid = timestamps.filter((value) => Number.isFinite(value));
    if (!valid.length) return new Date().toISOString();

    return new Date(Math.max(...valid)).toISOString();
  }, [actionLearningLog, enrichedRows, localLastUpdated]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalLastUpdated((prev) => prev);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  function touchUpdated() {
    setLocalLastUpdated(new Date().toISOString());
  }

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
    touchUpdated();
  }

  function appendCompletedStep(row, stepId) {
    const existing = Array.isArray(row.workflowCompletedSteps) ? row.workflowCompletedSteps : [];
    if (existing.includes(stepId)) return existing;
    return [...existing, stepId];
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
      blocker: value,
      turnStatus: value === "None" ? "Monitoring" : row.turnStatus,
    });
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
    const row = enrichedRows.find((item) => item.id === id);
    if (!row) return;

    const patch = buildPatchForResolve(row);
    patchRow(id, patch);
    recordActionOutcome(row, patch, "Resolve issue");
  }

  function handleFlagReady(id) {
    const row = enrichedRows.find((item) => item.id === id);
    if (!row) return;

    const patch = buildPatchForMarkReady(row);
    patchRow(id, patch);
    recordActionOutcome(row, patch, "Mark ready");
  }

  function handleApplySimulatedPlan({ row, selectedOptions, simulation }) {
    const daysSaved = simulation.daysRecovered;
    if (daysSaved <= 0) return;

    const existingSteps = Array.isArray(row.workflowCompletedSteps) ? row.workflowCompletedSteps : [];
    const nextSteps = [...new Set([...existingSteps, ...selectedOptions])];

    const patch = {
      daysInStage: Math.max(0, (row.daysInStage || 0) - daysSaved),
      projectedCompletion: shiftDate(row.projectedCompletion, -daysSaved),
      workflowCompletedSteps: nextSteps,
    };

    if (row.vendor) patch.vendor = row.vendor;
    if (row.nextAction) patch.nextAction = row.nextAction;

    if (selectedOptions.includes("clear_blocker")) {
      patch.turnStatus = "Monitoring";
      patch.blockers = ["No active blockers"];
      patch.blocker = "None";
    }

    if (selectedOptions.includes("accelerate_approval")) {
      patch.currentStage = "Dispatch";
      patch.turnStatus = "Monitoring";
      patch.blockers = ["No active blockers"];
      patch.blocker = "None";
      patch.nextAction = "Confirm vendor schedule";
    }

    if (selectedOptions.includes("recover_failed_ready")) {
      patch.currentStage = "Rent Ready Open";
      patch.turnStatus = "Monitoring";
      patch.blockers = ["No active blockers"];
      patch.blocker = "None";
      patch.nextAction = "Re-inspect and confirm ready state";
    }

    if (selectedOptions.includes("resequence_vendors")) {
      patch.nextAction = "Re-sequenced vendor plan";
    }

    if (selectedOptions.includes("switch_vendor") && row.vendor) {
      patch.vendor = row.vendor;
      patch.nextAction = row.nextAction || "Confirm recommended vendor schedule";
    }

    if (selectedOptions.includes("expedite_vendor")) {
      patch.nextAction = "Expedite vendor execution";
    }

    patchRow(row.id, patch);
    recordActionOutcome(row, patch, "Apply simulated plan");
  }

  function handleApplyTopAction(row) {
    const patch = buildPatchForApplyRecommendation(row, row.aiRecommendation);
    if (!patch) return;

    patchRow(row.id, patch);
    recordActionOutcome(
      row,
      patch,
      row.aiRecommendation?.title || row.actionEngine.headline || row.nextAction
    );
  }

  function handleWorkflowStep(row, step) {
    if (!step) return;

    if (
      step.action === "resolve" ||
      step.action === "resolve_rework" ||
      step.action === "reinspect" ||
      step.action === "advance_approval" ||
      step.action === "progress"
    ) {
      handleApplyTopAction(row);
      return;
    }

    if (step.action === "ready") {
      handleFlagReady(row.id);
      return;
    }

    if (step.action === "mark_step_only") {
      patchRow(row.id, {
        workflowCompletedSteps: appendCompletedStep(row, step.id),
        lastAction: {
          label: `Completed step: ${step.label}`,
          timestamp: new Date().toISOString(),
          daysRecovered: 0,
          revenueProtected: 0,
          prevECD: row.projectedCompletion,
          nextECD: row.projectedCompletion,
        },
      });
    }
  }

  function handleStageDrillDown(stage) {
    toggleStageFilter(stage);
    setQueueFilter("All Open Turns");
    touchUpdated();

    setTimeout(() => {
      queueRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
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

    touchUpdated();
  }

  function deleteSavedView(id) {
    const next = savedViews.filter((view) => view.id !== id);
    persistSavedViews(next);
    if (activeSavedViewId === id) setActiveSavedViewId(null);
  }

  function applySystemView(view) {
    const config = view.getFilters(enrichedRows);
    setQueueFilter(config.queueFilter || "All Open Turns");
    setSortBy(config.sortBy || "Priority");
    setActiveSystemView(view.id);
    setActiveSavedViewId(null);
    setCustomRowFilter(config.customFilter ? () => config.customFilter : null);
    touchUpdated();
  }

  function resetQueueViewFull() {
    resetQueueView();
    setActiveSystemView(null);
    setActiveSavedViewId(null);
    setCustomRowFilter(null);
    touchUpdated();
  }

  function renderTrendCard(cardId) {
    if (cardId === "rri_pass_rate") {
      return (
        <TrendChartCard title="First Rent Ready Inspection Pass Rate" subtitle="Pass rate vs fail rate and target">
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="passRate" name="Pass Rate" fillOpacity={0.2} />
            <Line type="monotone" dataKey="passGoal" name="Pass Goal" dot={false} />
            <Line type="monotone" dataKey="failRate" name="Fail Rate" dot={false} />
          </AreaChart>
        </TrendChartCard>
      );
    }

    if (cardId === "rri_completion_time") {
      return (
        <TrendChartCard title="Time to Complete Rent Ready Inspection" subtitle="Average and median days vs goal">
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="avgRriDays" name="Average" fillOpacity={0.18} />
            <Area type="monotone" dataKey="medianRriDays" name="Median" fillOpacity={0.12} />
            <Line type="monotone" dataKey="rriGoal" name="Goal" dot={false} />
          </AreaChart>
        </TrendChartCard>
      );
    }

    if (cardId === "turns_completed") {
      return (
        <TrendChartCard title="Turns Completed" subtitle="Monthly throughput trend">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="turnsCompleted" name="Turns Completed" />
          </BarChart>
        </TrendChartCard>
      );
    }

    if (cardId === "avg_turn_time") {
      return (
        <TrendChartCard title="Average Turn Completion Time" subtitle="Trend in total turn duration">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} days`, "Average Turn Days"]} />
            <Bar dataKey="avgTurnDays" name="Average Turn Days" />
          </BarChart>
        </TrendChartCard>
      );
    }

    if (cardId === "avg_cost") {
      return (
        <TrendChartCard title="Average Cost per Completed Turn" subtitle="Monthly cost trend">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Average Cost"]} />
            <Bar dataKey="avgCost" name="Average Cost" />
          </BarChart>
        </TrendChartCard>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-3xl font-semibold text-slate-900">Control Center</div>
            <div className="mt-1 text-sm text-slate-600">
              Here are the exact turns to fix today and why; one working surface for action, bottlenecks, and queue management.
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Live
              </span>
              <span>{formatRelativeTime(computedLastUpdated)}</span>
              <span>•</span>
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
            <button
              onClick={() => {
                setQueueFilter("Top 10 Actions");
                setSortBy("Priority");
              }}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
            >
              Show Top 10 Actions
            </button>
          </div>
        </div>
      </Card>

      {lastActionImpact ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Action applied on <span className="font-medium">{lastActionImpact.property}</span> — saved{" "}
          {lastActionImpact.daysSaved} days, moved ECD from{" "}
          <span className="font-medium">{formatShortDate(lastActionImpact.prevECD)}</span> to{" "}
          <span className="font-medium">{formatShortDate(lastActionImpact.nextECD)}</span>, and protected $
          {lastActionImpact.revenueProtected}.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Top 10 Recoverable"
          value={`${actionEngineSummary.daysRecovered}d`}
          tone="green"
          subtext={`$${actionEngineSummary.revenueRecovered.toLocaleString()} protectable`}
        />
        <StatCard
          label="Critical Actions"
          value={actionEngineSummary.critical}
          tone="red"
          subtext="Immediate intervention"
        />
        <StatCard
          label="Blocked"
          value={queueSummary.blocked}
          tone="red"
          subtext="Needs unblock"
        />
        <StatCard
          label="Over SLA"
          value={queueSummary.overdue}
          tone="amber"
          subtext="Delay pressure"
        />
        <StatCard
          label="Pending Approval"
          value={workingRows.filter((row) => row.currentStage === "Owner Approval").length}
          tone="blue"
          subtext="Owner action needed"
        />
        <StatCard
          label="Vendorless"
          value={queueSummary.vendorless}
          tone="amber"
          subtext="Coverage gap"
        />
      </div>

      {topActionBuckets.length ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {topActionBuckets.map((bucket) => (
            <ActionBucketCard key={bucket.key} bucket={bucket} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Top 10 Actions</div>
                <div className="mt-1 text-sm text-slate-500">
                  TurnIQ ranks the ten highest-leverage interventions across urgency, recoverable days, and protectable revenue.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="blue">TurnIQ Action Engine</Pill>
                <Pill tone="green">{actionEngineSummary.daysRecovered}d recoverable</Pill>
                <Pill tone="amber">${actionEngineSummary.revenueRecovered.toLocaleString()} protected</Pill>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {topActionRows.map((row, index) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-1">
                  <div className="grid gap-3 md:grid-cols-[44px_1fr]">
                    <div className="flex items-start justify-center pt-5 text-lg font-semibold text-slate-400">
                      {index + 1}
                    </div>
                    <ActionCard
                      row={row}
                      onOpen={() => {
                        setSelectedPropertyId(row.id);
                        setDrawerRow(row);
                      }}
                      onApply={() => handleApplyTopAction(row)}
                    />
                  </div>
                </div>
              ))}

              {!topActionRows.length ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No action candidates yet.
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-semibold text-slate-900">Queue Views</div>
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

            <div className="mt-4 flex flex-wrap gap-2">
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
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Stage Health</div>
            <div className="mt-1 text-sm text-slate-500">
              Click any stage to filter the queue and isolate bottlenecks.
            </div>
          </div>
          {topStageBottleneck ? <Pill tone="amber">{topStageBottleneck.stage} bottleneck</Pill> : null}
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          {visibleTrendCards.map((cardId) => (
            <div key={cardId}>{renderTrendCard(cardId)}</div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stageBuckets.map((bucket) => (
            <button key={bucket.stage} onClick={() => handleStageDrillDown(bucket.stage)} className="text-left">
              <div
                className={`min-h-[148px] rounded-2xl border p-4 transition ${
                  selectedStageFilter === bucket.stage
                    ? "border-slate-900 bg-slate-50"
                    : bucket.stage === "Failed Rent Ready"
                    ? "border-red-200 bg-red-50 hover:bg-red-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="min-h-[48px] font-semibold text-slate-900">{bucket.stage}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {bucket.count} turns • avg {bucket.avgDays}d
                    </div>
                  </div>

                  <Pill tone={bucket.stage === "Failed Rent Ready" ? "red" : bucket.tone}>
                    {bucket.stage === "Failed Rent Ready" ? `${bucket.count} failed` : `${bucket.overdueCount} overdue`}
                  </Pill>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  SLA {bucket.sla}d • {bucket.blockedCount} blocked • {bucket.blockedPercent}% blocked
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="xl:col-span-9 min-w-0">
          <div className="flex flex-col gap-6">
            <Card>
              <div ref={queueRef}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-slate-900">Live Working Queue</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Detailed queue for execution once TurnIQ has told you where to act.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm text-slate-500">Sort by</div>
                    {["Priority", "Impact", "Risk", "Days in Stage", "Open Days", "ECD", "Stage"].map((option) => (
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

                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-[1650px] w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="w-[320px] px-4 py-3 font-medium">Turn</th>
                        <th className="w-[170px] px-4 py-3 font-medium">Action Score</th>
                        <th className="w-[240px] px-4 py-3 font-medium">Why now</th>
                        <th className="w-[220px] px-4 py-3 font-medium">Stage</th>
                        <th className="w-[180px] px-4 py-3 font-medium">Modeled lift</th>
                        <th className="w-[180px] px-4 py-3 font-medium">Owner</th>
                        <th className="w-[180px] px-4 py-3 font-medium">SLA</th>
                        <th className="w-[220px] px-4 py-3 font-medium">Blocker</th>
                        <th className="w-[260px] px-4 py-3 font-medium">Notes</th>
                        <th className="w-[150px] px-4 py-3 font-medium">Action</th>
                        <th className="w-[100px] px-4 py-3 font-medium">PMS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workingRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`border-t border-slate-100 align-top transition hover:bg-slate-50 ${
                            selectedPropertyId === row.id ? "bg-slate-50" : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <button
                              onClick={() => {
                                setSelectedPropertyId(row.id);
                                setDrawerRow(row);
                              }}
                              className="text-left"
                            >
                              <div className="max-w-[240px] break-words text-base font-medium text-blue-700 hover:underline">
                                {row.name}
                              </div>
                            </button>
                            <div className="mt-2 text-sm text-slate-500">
                              {row.market} • {row.turnStatus}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {row.rentSourceLabel} • ${row.dailyRentValue}/day
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <Pill tone={row.actionEngine.tone}>{row.actionEngine.urgency}</Pill>
                            <div className="mt-2 text-xs text-slate-500">
                              Score {row.aiPriorityScore} • {row.actionEngine.daysRecovered}d • $
                              {row.actionEngine.revenueRecovered.toLocaleString()}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-slate-900">{row.actionEngine.headline}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.actionEngine.whyNow}</div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900">{row.currentStage}</div>
                            <div className="mt-1 text-sm text-slate-500">SLA {row.stageSla}d</div>
                            <div className="mt-1 text-xs text-slate-400">{getLastTouchedLabel(row)}</div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-slate-900">
                              +{row.actionEngine.daysRecovered}d
                            </div>
                            <div className="mt-1 text-sm text-emerald-700">
                              ${row.actionEngine.revenueRecovered.toLocaleString()}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <input
                              value={row.turnOwner || ""}
                              onChange={(e) => handleOwnerChange(row.id, e.target.value)}
                              className="w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <Pill tone={row.overdue ? "red" : "slate"}>{row.daysInStage || 0}d</Pill>
                            <div className="mt-2 text-sm">
                              {row.overdue ? (
                                <span className="font-medium text-red-600">
                                  {getDaysOverSla(row)}d over SLA
                                </span>
                              ) : (
                                <span className="text-slate-500">Within SLA</span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              ECD {formatShortDate(row.projectedCompletion)}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <select
                              value={row.blocker}
                              onChange={(e) => handleBlockerChange(row.id, e.target.value, row)}
                              className="w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              {BLOCKER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-4">
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

                          <td className="px-4 py-4">
                            <div className="flex w-[120px] flex-col gap-2">
                              <button
                                onClick={() => handleApplyTopAction(row)}
                                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                              >
                                Apply
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPropertyId(row.id);
                                  setDrawerRow(row);
                                }}
                                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Open
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <a
                              href={row.systemLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-blue-700 hover:underline"
                            >
                              Open →
                            </a>
                          </td>
                        </tr>
                      ))}

                      {!workingRows.length ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                            No turns match the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xl font-semibold text-slate-900">Action Learning</div>
              <div className="mt-1 text-sm text-slate-500">
                Which interventions are actually creating recovery.
              </div>

              {actionLearningSummary.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {actionLearningSummary.map((item) => (
                    <div key={item.actionLabel} className="rounded-2xl border border-slate-200 bg-white p-4">
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
                <div className="mt-4 text-sm text-slate-500">No action outcomes logged yet.</div>
              )}
            </Card>
          </div>
        </div>

        <div className="xl:col-span-3 min-w-0">
          <div className="flex flex-col gap-6">
            <Card>
              <div className="text-xl font-semibold text-slate-900">Today’s narrative</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-red-700">Top action thesis</div>
                  <div className="mt-2 text-sm font-medium text-slate-900">
                    {topActionRows[0]?.actionEngine.headline || "No major action required"}
                  </div>
                  <div className="mt-1 text-xs text-red-700">
                    {topActionRows[0]?.actionEngine.whyNow || "Portfolio is stable"}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Portfolio intervention set</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {topActionRows.length} turns
                  </div>
                  <div className="mt-1 text-xs text-amber-700">
                    Highest-leverage action set in the portfolio right now
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-blue-700">Cumulative lift</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {actionEngineSummary.daysRecovered}d
                  </div>
                  <div className="mt-1 text-xs text-blue-700">
                    ${actionEngineSummary.revenueRecovered.toLocaleString()} of modeled protection
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xl font-semibold text-slate-900">Team Load</div>
              <div className="mt-1 text-sm text-slate-500">
                Active turns and high-risk concentration by operator.
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

      <TurnDetailDrawer
        row={drawerRow}
        onClose={() => setDrawerRow(null)}
        onResolve={handleResolve}
        onMarkReady={handleFlagReady}
        onApplyAction={handleApplyTopAction}
        onApplySimulatedPlan={handleApplySimulatedPlan}
        onWorkflowStep={handleWorkflowStep}
      />
    </div>
  );
}