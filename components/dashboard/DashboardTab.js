"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

const HORIZONS = ["Today", "Next 7 Days", "Next 14 Days", "All Active"];
const TODAY = new Date("2026-05-07T00:00:00");

function getReadinessTone(readiness) {
  if (readiness < 40) return "red";
  if (readiness < 70) return "amber";
  if (readiness < 90) return "blue";
  return "emerald";
}

function isInHorizon(property, horizon) {
  if (horizon === "All Active") return true;

  const ecd = new Date(property.projectedCompletion);
  const diffDays = Math.ceil((ecd - TODAY) / (1000 * 60 * 60 * 24));

  if (horizon === "Today") {
    return property.turnStatus === "Blocked" || diffDays <= 0 || property.risk >= 80;
  }

  if (horizon === "Next 7 Days") return diffDays <= 7;
  if (horizon === "Next 14 Days") return diffDays <= 14;

  return true;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildPriorityItems(properties) {
  return [...properties]
    .filter((p) => p.turnStatus === "Blocked" || p.risk >= 70)
    .sort((a, b) => {
      if (a.turnStatus === "Blocked" && b.turnStatus !== "Blocked") return -1;
      if (a.turnStatus !== "Blocked" && b.turnStatus === "Blocked") return 1;
      return b.risk - a.risk;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.market} • ${p.currentStage}`,
      detail:
        p.turnStatus === "Blocked"
          ? "Blocked and needs operator intervention."
          : "High-risk turn should be actively managed.",
      tone: p.turnStatus === "Blocked" ? "red" : "amber",
    }));
}

function buildMarketHealth(properties) {
  return Array.from(new Set(properties.map((p) => p.market)))
    .map((market) => {
      const rows = properties.filter((p) => p.market === market);
      const avgRisk = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + row.risk, 0) / rows.length)
        : 0;

      return {
        market,
        openTurns: rows.length,
        blocked: rows.filter((r) => r.turnStatus === "Blocked").length,
        avgRisk,
      };
    })
    .sort((a, b) => b.avgRisk - a.avgRisk);
}

function buildRecommendations(properties) {
  const recs = [];

  const blockedTurns = properties.filter((p) => p.turnStatus === "Blocked");
  if (blockedTurns.length) {
    recs.push({
      tone: "red",
      title: "Resolve blocked turns first",
      body: `${blockedTurns.length} blocked turn${blockedTurns.length > 1 ? "s are" : " is"} driving portfolio risk and likely ECD slippage.`,
      homes: blockedTurns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const approvalTurns = properties.filter((p) => p.currentStage === "Owner Approval");
  if (approvalTurns.length) {
    recs.push({
      tone: "amber",
      title: "Clear Owner Approval backlog",
      body: `${approvalTurns.length} turn${approvalTurns.length > 1 ? "s are" : " is"} waiting in Owner Approval, slowing dispatch readiness.`,
      homes: approvalTurns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const grouped = {};
  properties.forEach((p) => {
    const key = `${p.market}-${p.vendor}`;
    if (!grouped[key]) grouped[key] = { market: p.market, vendor: p.vendor, turns: [] };
    grouped[key].turns.push(p);
  });

  Object.values(grouped)
    .filter((g) => g.vendor && g.turns.length >= 2)
    .slice(0, 2)
    .forEach((g) => {
      recs.push({
        tone: "blue",
        title: `Bundle ${g.vendor} in ${g.market}`,
        body: `${g.turns.length} turns share the same vendor. Bundling dispatch could reduce labor mobilization and coordination overhead.`,
        homes: g.turns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
      });
    });

  const highReadiness = properties.filter((p) => p.readiness >= 90);
  if (highReadiness.length) {
    recs.push({
      tone: "emerald",
      title: "Fast-track high-readiness turns",
      body: `${highReadiness.length} turn${highReadiness.length > 1 ? "s are" : " is"} ready to move quickly with limited operator drag.`,
      homes: highReadiness.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  return recs.slice(0, 5);
}

function getActionButtonLabel(type) {
  if (type === "resolve-blocker") return "Resolve";
  if (type === "approve-scope") return "Approve";
  if (type === "assign-vendor") return "Assign";
  return "Review";
}

function buildActionFromProperty(p) {
  if (p.turnStatus === "Blocked") {
    const topBlocker =
      (p.blockers || []).find((b) => b !== "No active blockers") || "execution blocker";

    return {
      id: `${p.id}-blocked`,
      propertyId: p.id,
      propertyName: p.name,
      market: p.market,
      title: `Resolve ${topBlocker.toLowerCase()}`,
      message: "Current blocker is preventing forward progress through the turn workflow.",
      impact: "Reduce delay risk by ~2 days",
      priority: "High",
      tone: "red",
      type: "resolve-blocker",
      rank: 1,
      confidence: 88,
      simulation: {
        readinessDelta: 10,
        riskDelta: -8,
        ecdDeltaDays: -2,
        vacancySavings: 140,
      },
    };
  }

  if (p.currentStage === "Scope Review") {
    return {
      id: `${p.id}-scope`,
      propertyId: p.id,
      propertyName: p.name,
      market: p.market,
      title: "Approve scope review",
      message: "Scope is waiting on review by the turn manager before moving forward.",
      impact: "Move turn into approval flow",
      priority: "High",
      tone: "amber",
      type: "approve-scope",
      rank: 2,
      confidence: 84,
      simulation: {
        readinessDelta: 6,
        riskDelta: -5,
        ecdDeltaDays: -1,
        vacancySavings: 70,
      },
    };
  }

  if (p.currentStage === "Owner Approval") {
    return {
      id: `${p.id}-owner`,
      propertyId: p.id,
      propertyName: p.name,
      market: p.market,
      title: "Escalate owner approval",
      message: "Owner response is delaying dispatch and start readiness.",
      impact: "Reduce owner-driven delay",
      priority: "High",
      tone: "amber",
      type: "review-owner",
      rank: 3,
      confidence: 80,
      simulation: {
        readinessDelta: 4,
        riskDelta: -4,
        ecdDeltaDays: -2,
        vacancySavings: 140,
      },
    };
  }

  if (!p.vendor || p.vendor === "TBD") {
    return {
      id: `${p.id}-vendor`,
      propertyId: p.id,
      propertyName: p.name,
      market: p.market,
      title: "Assign execution vendor",
      message: "No clear vendor execution path is in place for the current turn scope.",
      impact: "Improve dispatch readiness",
      priority: p.risk >= 75 ? "High" : "Medium",
      tone: "blue",
      type: "assign-vendor",
      rank: 4,
      confidence: 82,
      simulation: {
        readinessDelta: 7,
        riskDelta: -6,
        ecdDeltaDays: -1,
        vacancySavings: 70,
      },
    };
  }

  const dueSoon = new Date(p.projectedCompletion) <= new Date("2026-05-14");
  if (p.risk >= 70 && dueSoon) {
    return {
      id: `${p.id}-delay`,
      propertyId: p.id,
      propertyName: p.name,
      market: p.market,
      title: "Mitigate near-term delay risk",
      message: "Turn is at risk of missing expected completion based on risk and timing.",
      impact: "Avoid +1–3 days of slippage",
      priority: "High",
      tone: "red",
      type: "review-delay",
      rank: 5,
      confidence: 78,
      simulation: {
        readinessDelta: 5,
        riskDelta: -7,
        ecdDeltaDays: -2,
        vacancySavings: 140,
      },
    };
  }

  return null;
}

function generateActions(properties) {
  const rawActions = properties.map((p) => buildActionFromProperty(p)).filter(Boolean);

  const deduped = {};
  rawActions.forEach((action) => {
    const current = deduped[action.propertyId];
    if (!current || action.rank < current.rank) {
      deduped[action.propertyId] = action;
    }
  });

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };

  return Object.values(deduped)
    .sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.rank - b.rank;
    })
    .slice(0, 6);
}

function buildPerformanceMetrics(actionLog) {
  const completed = actionLog.filter((a) => a.kind === "completed");
  const totalCompleted = completed.length;
  const totalDaysAvoided = completed.reduce((sum, a) => sum + (a.daysAvoided || 0), 0);
  const totalVacancySaved = completed.reduce((sum, a) => sum + (a.vacancySavings || 0), 0);
  const avgResponseMinutes = totalCompleted
    ? Math.round(
        completed.reduce((sum, a) => sum + (a.responseMinutes || 0), 0) / totalCompleted
      )
    : 0;

  return {
    totalCompleted,
    totalDaysAvoided,
    totalVacancySaved,
    avgResponseMinutes,
  };
}

function buildBatchPreview(actions) {
  if (!actions.length) {
    return {
      turns: 0,
      daysAvoided: 0,
      savings: 0,
      readinessLift: 0,
      avgConfidence: 0,
    };
  }

  return {
    turns: actions.length,
    daysAvoided: actions.reduce(
      (sum, action) => sum + Math.abs(action.simulation?.ecdDeltaDays || 0),
      0
    ),
    savings: actions.reduce(
      (sum, action) => sum + (action.simulation?.vacancySavings || 0),
      0
    ),
    readinessLift: actions.reduce(
      (sum, action) => sum + (action.simulation?.readinessDelta || 0),
      0
    ),
    avgConfidence: Math.round(
      actions.reduce((sum, action) => sum + (action.confidence || 0), 0) / actions.length
    ),
  };
}

function buildBottleneck(properties) {
  const stages = [
    "Pre-Leasing",
    "Pre-Move Out Inspection",
    "Move Out Inspection",
    "Scope Review",
    "Owner Approval",
    "Dispatch",
    "Pending RRI",
    "Rent Ready Open",
  ];

  const stageStats = stages.map((stage) => {
    const rows = properties.filter((p) => p.currentStage === stage);
    const avgDays = rows.length
      ? rows.reduce((sum, row) => sum + (row.daysInStage || 0), 0) / rows.length
      : 0;
    return {
      stage,
      turns: rows.length,
      avgDays: Number(avgDays.toFixed(1)),
    };
  });

  return stageStats.sort((a, b) => b.avgDays - a.avgDays)[0] || null;
}

export default function DashboardTab({
  properties,
  selectedProperty,
  setSelectedPropertyId,
  selectedMarket,
  setSelectedMarket,
  notes,
  activity,
  addNote,
  addActivity,
  addActionHistory,
  actionHistory,
  updateProperty,
  formatMoney,
  getToneFromRisk,
}) {
  const [draftNote, setDraftNote] = useState("");
  const [horizon, setHorizon] = useState("Today");
  const [previewActionId, setPreviewActionId] = useState(null);

  const horizonProperties = useMemo(
    () => properties.filter((p) => isInHorizon(p, horizon)),
    [properties, horizon]
  );

  const actions = useMemo(() => generateActions(horizonProperties), [horizonProperties]);
  const priorities = useMemo(() => buildPriorityItems(horizonProperties), [horizonProperties]);
  const marketHealth = useMemo(() => buildMarketHealth(properties), [properties]);
  const recommendations = useMemo(
    () => buildRecommendations(horizonProperties),
    [horizonProperties]
  );
  const performanceMetrics = useMemo(
    () => buildPerformanceMetrics(actionHistory),
    [actionHistory]
  );
  const bottleneck = useMemo(() => buildBottleneck(properties), [properties]);
  const batchPreview = useMemo(() => buildBatchPreview(actions), [actions]);

  const previewAction = actions.find((a) => a.id === previewActionId) || actions[0] || null;

  const activityFeed = useMemo(() => {
    const noteEvents = notes.map((note, i) => ({
      id: `note-${i}`,
      type: "note",
      text: note,
    }));

    const activityEvents = activity.map((item, i) => ({
      id: `activity-${i}`,
      type: "activity",
      text: item,
    }));

    return [...activityEvents, ...noteEvents].reverse().slice(0, 8);
  }, [notes, activity]);

  function logCompletedAction(target, action) {
    addActionHistory({
      kind: "completed",
      propertyId: target.id,
      propertyName: target.name,
      market: target.market,
      actionType: action.type,
      title: action.title,
      daysAvoided: Math.abs(action.simulation?.ecdDeltaDays || 0),
      vacancySavings: action.simulation?.vacancySavings || 0,
      responseMinutes: 11,
      beforeEcd: target.projectedCompletion,
      afterEcd: addDays(target.projectedCompletion, action.simulation?.ecdDeltaDays || 0),
      readinessDelta: action.simulation?.readinessDelta || 0,
      riskDelta: action.simulation?.riskDelta || 0,
    });
  }

  function handleAddNote() {
    if (!draftNote.trim()) return;
    addNote(selectedProperty.name, draftNote.trim());
    addActivity(selectedProperty.name, `Note added: ${draftNote.trim()}`);
    setDraftNote("");
  }

  function handleResolveBlockers() {
    const current = selectedProperty.blockers || [];
    const remaining = current.filter((b) => b !== "No active blockers").slice(1);
    const nextReadiness = Math.min(100, selectedProperty.readiness + 12);

    updateProperty(selectedProperty.id, {
      blockers: remaining.length ? remaining : ["No active blockers"],
      turnStatus: remaining.length ? "Monitoring" : "Ready",
      readiness: nextReadiness,
    });

    addActivity(selectedProperty.name, "Pending blocker resolved");
  }

  function handleApproveScope() {
    const stageOrder = [
      "Pre-Leasing",
      "Pre-Move Out Inspection",
      "Move Out Inspection",
      "Scope Review",
      "Owner Approval",
      "Dispatch",
      "Pending RRI",
      "Rent Ready Open",
    ];

    const idx = stageOrder.indexOf(selectedProperty.currentStage);
    const nextStage =
      selectedProperty.currentStage === "Scope Review"
        ? "Owner Approval"
        : idx >= 0 && idx < stageOrder.length - 1
        ? stageOrder[idx + 1]
        : selectedProperty.currentStage;

    updateProperty(selectedProperty.id, {
      currentStage: nextStage,
    });

    addActivity(selectedProperty.name, `Scope approved • moved to ${nextStage}`);
  }

  function handleAssignVendor() {
    const fallbackVendor =
      selectedProperty.vendor ||
      (selectedProperty.market === "Dallas"
        ? "FloorCo"
        : selectedProperty.market === "Atlanta"
        ? "ABC Paint"
        : selectedProperty.market === "Phoenix"
        ? "Prime Paint"
        : "Sparkle");

    updateProperty(selectedProperty.id, {
      vendor: fallbackVendor,
    });

    addActivity(selectedProperty.name, `Vendor assigned: ${fallbackVendor}`);
  }

  function handleStartTurn() {
    updateProperty(selectedProperty.id, {
      turnStatus: "Monitoring",
      readiness: Math.min(100, selectedProperty.readiness + 5),
    });

    addActivity(selectedProperty.name, "Turn started");
  }

  function handleCompleteTurn() {
    updateProperty(selectedProperty.id, {
      currentStage: "Rent Ready Open",
      turnStatus: "Ready",
      readiness: 100,
      blockers: ["No active blockers"],
    });

    addActivity(selectedProperty.name, "Turn marked complete");
  }

  function handleActionResolve(action) {
    const target = properties.find((p) => p.id === action.propertyId);
    if (!target) return;

    setSelectedPropertyId(target.id);

    if (action.type === "resolve-blocker") {
      const current = target.blockers || [];
      const remaining = current.filter((b) => b !== "No active blockers").slice(1);

      updateProperty(target.id, {
        blockers: remaining.length ? remaining : ["No active blockers"],
        turnStatus: remaining.length ? "Monitoring" : "Ready",
        readiness: Math.min(100, target.readiness + (action.simulation?.readinessDelta || 10)),
        risk: Math.max(0, target.risk + (action.simulation?.riskDelta || -8)),
        projectedCompletion: addDays(
          target.projectedCompletion,
          action.simulation?.ecdDeltaDays || -2
        ),
      });

      addActivity(target.name, `Action Center: ${action.title}`);
      logCompletedAction(target, action);
      return;
    }

    if (action.type === "approve-scope") {
      updateProperty(target.id, {
        currentStage: "Owner Approval",
        readiness: Math.min(100, target.readiness + (action.simulation?.readinessDelta || 6)),
        risk: Math.max(0, target.risk + (action.simulation?.riskDelta || -5)),
        projectedCompletion: addDays(
          target.projectedCompletion,
          action.simulation?.ecdDeltaDays || -1
        ),
      });

      addActivity(target.name, "Action Center: scope review approved");
      logCompletedAction(target, action);
      return;
    }

    if (action.type === "assign-vendor") {
      const fallbackVendor =
        target.vendor ||
        (target.market === "Dallas"
          ? "FloorCo"
          : target.market === "Atlanta"
          ? "ABC Paint"
          : target.market === "Phoenix"
          ? "Prime Paint"
          : "Sparkle");

      updateProperty(target.id, {
        vendor: fallbackVendor,
        readiness: Math.min(100, target.readiness + (action.simulation?.readinessDelta || 7)),
        risk: Math.max(0, target.risk + (action.simulation?.riskDelta || -6)),
        projectedCompletion: addDays(
          target.projectedCompletion,
          action.simulation?.ecdDeltaDays || -1
        ),
      });

      addActivity(target.name, `Action Center: vendor assigned (${fallbackVendor})`);
      logCompletedAction(target, action);
      return;
    }

    updateProperty(target.id, {
      readiness: Math.min(100, target.readiness + (action.simulation?.readinessDelta || 4)),
      risk: Math.max(0, target.risk + (action.simulation?.riskDelta || -4)),
      projectedCompletion: addDays(
        target.projectedCompletion,
        action.simulation?.ecdDeltaDays || -1
      ),
    });

    addActivity(target.name, `Action Center reviewed: ${action.title}`);
    logCompletedAction(target, action);
  }

  function handleActionView(action) {
    setSelectedPropertyId(action.propertyId);
    setPreviewActionId(action.id);
    const target = properties.find((p) => p.id === action.propertyId);
    if (target) {
      addActivity(target.name, `Opened from Action Center: ${action.title}`);
    }
  }

  function handleBatchResolveBlocked() {
    const batch = actions.filter((a) => a.type === "resolve-blocker");
    batch.forEach((action) => handleActionResolve(action));
  }

  function handleBatchApproveScope() {
    const batch = actions.filter((a) => a.type === "approve-scope");
    batch.forEach((action) => handleActionResolve(action));
  }

  function handleBatchAssignVendor() {
    const batch = actions.filter((a) => a.type === "assign-vendor");
    batch.forEach((action) => handleActionResolve(action));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Dashboard</div>
          <div className="mt-1 text-sm text-slate-500">
            Prioritize work, surface TurnIQ recommendations, and manage the portfolio from one control surface.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {HORIZONS.map((item) => (
            <button
              key={item}
              onClick={() => setHorizon(item)}
              className={`rounded-xl px-4 py-2 text-sm ${
                horizon === item
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {bottleneck && bottleneck.turns > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                TurnIQ Callout
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {bottleneck.stage} is the current bottleneck
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {bottleneck.turns} active turns are sitting here for an average of {bottleneck.avgDays} days.
              </div>
            </div>
            <Pill tone="amber">{bottleneck.stage}</Pill>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Recommended Actions</div>
            <div className="mt-1 text-sm text-slate-500">
              AI-generated operator actions to reduce delay risk and keep turns moving.
            </div>
          </div>
          <Pill tone="blue">{actions.length} actions</Pill>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleBatchResolveBlocked}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Resolve all blocked
          </button>
          <button
            onClick={handleBatchApproveScope}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Approve all scope reviews
          </button>
          <button
            onClick={handleBatchAssignVendor}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Assign all vendorless turns
          </button>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Batch Impact</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {batchPreview.turns}
            </div>
            <div className="mt-1 text-sm text-slate-500">turns addressable</div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Delay Days Avoided</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {batchPreview.daysAvoided}
            </div>
            <div className="mt-1 text-sm text-slate-500">projected across actions</div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Vacancy Savings</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              ${batchPreview.savings}
            </div>
            <div className="mt-1 text-sm text-slate-500">modeled upside</div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Readiness Lift</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              +{batchPreview.readinessLift}
            </div>
            <div className="mt-1 text-sm text-slate-500">aggregate points</div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Avg Confidence</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {batchPreview.avgConfidence}%
            </div>
            <div className="mt-1 text-sm text-slate-500">modeled recommendation confidence</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:shadow-md md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-900">{action.propertyName}</div>
                    <Pill tone={action.tone}>{action.priority}</Pill>
                    <Pill tone="blue">{action.confidence}% confidence</Pill>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">{action.title}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {action.market} • {action.message}
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-400">
                    Impact: {action.impact}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleActionResolve(action)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  >
                    {getActionButtonLabel(action.type)}
                  </button>
                  <button
                    onClick={() => handleActionView(action)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="xl:col-span-4">
            <Card className="h-full bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-slate-900">Simulation Preview</div>
                {previewAction ? <Pill tone="blue">{previewAction.confidence}%</Pill> : null}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {previewAction
                  ? `Projected impact for ${previewAction.propertyName}`
                  : "Select an action to preview operator impact"}
              </div>

              {previewAction ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">ECD Before → After</div>
                    <div className="mt-2 text-base font-medium text-slate-900">
                      {selectedProperty.projectedCompletion} →{" "}
                      {addDays(selectedProperty.projectedCompletion, previewAction.simulation?.ecdDeltaDays || 0)}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Delay Days Avoided
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {Math.abs(previewAction.simulation?.ecdDeltaDays || 0)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Vacancy Savings
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        ${previewAction.simulation?.vacancySavings || 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Readiness Lift
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        +{previewAction.simulation?.readinessDelta || 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Risk Reduction
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {previewAction.simulation?.riskDelta || 0}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                    <div className="text-sm font-medium text-slate-900">What this means</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Completing this action should improve turn velocity, reduce modeled slippage risk,
                      and bring forward expected rent-ready timing.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Open an action to preview projected outcome before execution.
                </div>
              )}
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Priorities</div>
                <div className="mt-1 text-sm text-slate-500">
                  Highest-urgency turns based on blockers, risk, and ECD pressure.
                </div>
              </div>
              <Pill tone="blue">{horizon}</Pill>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {priorities.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedPropertyId(item.id)}
                  className="text-left"
                >
                  <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.subtitle}</div>
                      </div>
                      <Pill tone={item.tone}>
                        {item.tone === "red" ? "Urgent" : "Watch"}
                      </Pill>
                    </div>

                    <div className="mt-3 text-sm text-slate-700">{item.detail}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5 self-start">
          <Card>
            <div className="text-xl font-semibold text-slate-900">Market Health Snapshot</div>
            <div className="mt-1 text-sm text-slate-500">
              Click a market to filter the dashboard.
            </div>

            <div className="mt-4 space-y-3">
              {marketHealth.map((row) => (
                <button
                  key={row.market}
                  onClick={() =>
                    setSelectedMarket(selectedMarket === row.market ? "All Markets" : row.market)
                  }
                  className="block w-full text-left"
                >
                  <div
                    className={`rounded-2xl border p-4 transition hover:border-blue-300 ${
                      selectedMarket === row.market
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{row.market}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.openTurns} open turns • {row.blocked} blocked
                        </div>
                      </div>
                      <Pill tone={getToneFromRisk(row.avgRisk)}>{row.avgRisk}</Pill>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">TurnIQ Recommendations</div>
            <div className="mt-1 text-sm text-slate-500">
              AI recommendations based on blockers, approvals, vendor overlap, and readiness.
            </div>

            <div className="mt-4 space-y-3">
              {recommendations.map((item, idx) => (
                <div
                  key={`${item.title}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    item.tone === "red"
                      ? "border-red-200 bg-red-50"
                      : item.tone === "amber"
                      ? "border-amber-200 bg-amber-50"
                      : item.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-700">{item.body}</div>

                  {!!item.homes?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.homes.map((home) => (
                        <button
                          key={home.id}
                          onClick={() => setSelectedPropertyId(home.id)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        >
                          {home.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Selected Property</div>
            <div className="mt-1 text-sm text-slate-500">
              Operator control panel for the selected home.
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {selectedProperty.name}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedProperty.market} • Turn Owner: {selectedProperty.turnOwner} • Lease End:{" "}
                  {selectedProperty.leaseEnd}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">
                  Stage: {selectedProperty.currentStage}
                </div>
              </div>

              <Pill tone={getToneFromRisk(selectedProperty.risk)}>
                {selectedProperty.turnStatus}
              </Pill>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Readiness</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {selectedProperty.readiness}/100
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Risk</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {selectedProperty.risk}/100
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Est. Cost</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {formatMoney(selectedProperty.projectedCost)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">ECD</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedProperty.projectedCompletion}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold text-slate-900">Operator Actions</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleResolveBlockers}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Resolve Pending Blockers
                </button>

                <button
                  onClick={handleApproveScope}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Approve Scope
                </button>

                <button
                  onClick={handleAssignVendor}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Assign Vendor
                </button>

                <button
                  onClick={handleStartTurn}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Start Turn
                </button>

                <button
                  onClick={handleCompleteTurn}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Complete Turn
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="font-semibold text-slate-900">AI Turn Timeline Prediction</div>
            <div className="mt-1 text-sm text-slate-500">
              Confidence: {selectedProperty.timelineConfidence}%
            </div>

            <div className="mt-4 space-y-3">
              {selectedProperty.timeline.map((step) => (
                <div
                  key={step.key}
                  className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-sm"
                >
                  <div className="text-slate-800">{step.label}</div>
                  <ProgressBar
                    value={step.progress}
                    tone={
                      step.progress >= 100
                        ? "emerald"
                        : step.progress > 0
                        ? "blue"
                        : "gray"
                    }
                  />
                  <div className="text-slate-500">{step.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card>
            <div className="font-semibold text-slate-900">Primary Blockers</div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedProperty.blockers?.map((b) => (
                <Pill key={b} tone="amber">
                  {b}
                </Pill>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-medium text-slate-900">Readiness Progress</div>
              <ProgressBar
                value={selectedProperty.readiness}
                tone={getReadinessTone(selectedProperty.readiness)}
              />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold uppercase tracking-wide text-blue-800">
              TurnIQ Insight
            </div>
            <div className="mt-3 text-base text-slate-800">{selectedProperty.insight}</div>
          </Card>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-lg font-semibold text-slate-900">Active Turn Queue</div>
              <div className="text-sm text-slate-500">Click a property to update the panel</div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Readiness</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Completion</th>
                  </tr>
                </thead>

                <tbody>
                  {horizonProperties.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 ${
                        row.id === selectedProperty.id ? "bg-slate-50" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelectedPropertyId(row.id)}
                          className="text-blue-700 hover:underline"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-3 py-3">{row.market}</td>
                      <td className="px-3 py-3">
                        <Pill tone={getToneFromRisk(row.risk)}>{row.risk}</Pill>
                      </td>
                      <td className="w-[160px] px-3 py-3">
                        <ProgressBar
                          value={row.readiness}
                          tone={getReadinessTone(row.readiness)}
                        />
                      </td>
                      <td className="px-3 py-3">{row.scope}</td>
                      <td className="px-3 py-3">{row.projectedCompletion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card>
            <div className="mb-3 text-lg font-semibold text-slate-900">Activity Feed</div>
            <div className="space-y-3">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.type === "note"
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-sm text-slate-800">{item.text}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Leave a note"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddNote}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Add
              </button>
            </div>
          </Card>

          {performanceMetrics.totalCompleted > 0 && (
            <Card className="mt-6">
              <div className="mb-3 text-lg font-semibold text-slate-900">Operator Value Created</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Actions</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {performanceMetrics.totalCompleted}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Days Avoided</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {performanceMetrics.totalDaysAvoided}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Savings</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    ${performanceMetrics.totalVacancySaved}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}