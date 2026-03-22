"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

const HORIZONS = ["Today", "Next 7 Days", "Next 14 Days", "All Active"];
const TODAY = new Date("2026-05-07T00:00:00");
const DAILY_RENT_ASSUMPTION = 120;

function getReadinessTone(readiness) {
  if (readiness < 40) return "red";
  if (readiness < 70) return "amber";
  if (readiness < 90) return "blue";
  return "emerald";
}

function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(dateStr, days) {
  const d = toDate(dateStr);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = toDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const b = String(blocker || "").toLowerCase();
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

function getLiveBlockers(blockers = []) {
  return blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
}

function getConfidenceLabel(score) {
  if (score >= 85) return { label: "High", tone: "emerald" };
  if (score >= 70) return { label: "Moderate", tone: "amber" };
  return { label: "Low", tone: "red" };
}

function buildForecast(property) {
  if (
    property.forecastCompletion &&
    typeof property.forecastDaysLate === "number" &&
    typeof property.forecastConfidence === "number"
  ) {
    return {
      forecastCompletion: property.forecastCompletion,
      forecastDaysLate: property.forecastDaysLate,
      forecastConfidence: property.forecastConfidence,
    };
  }

  const blockers = getLiveBlockers(property.blockers);
  const forecastDaysLate =
    getRiskDelay(property.risk) +
    getStageDelay(property.currentStage) +
    blockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);

  const forecastCompletion = addDays(property.projectedCompletion, forecastDaysLate);
  const forecastConfidence =
    typeof property.timelineConfidence === "number"
      ? property.timelineConfidence
      : Math.max(40, Math.min(95, Math.round(100 - property.risk * 0.5 - blockers.length * 5)));

  return {
    forecastCompletion,
    forecastDaysLate,
    forecastConfidence,
  };
}

function calculateRevenueImpact(properties) {
  let atRisk = 0;
  let recoverable = 0;

  properties.forEach((p) => {
    const delayDays =
      typeof p.forecastDaysLate === "number"
        ? p.forecastDaysLate
        : (p.delayDrivers || []).reduce((sum, d) => sum + (d.days || 0), 0);

    const riskWeight = (p.risk || 0) / 100;
    const exposure = delayDays * DAILY_RENT_ASSUMPTION;

    atRisk += exposure * Math.max(0.25, riskWeight);
    recoverable += exposure * Math.max(0, 1 - riskWeight * 0.5);
  });

  return {
    atRisk: Math.round(atRisk),
    recoverable: Math.round(recoverable),
  };
}

function buildStageBottleneck(properties) {
  const stageMap = new Map();

  properties.forEach((property) => {
    const stage = property.currentStage || "Unknown";
    if (!stageMap.has(stage)) {
      stageMap.set(stage, { stage, count: 0, totalDays: 0 });
    }
    const current = stageMap.get(stage);
    current.count += 1;
    current.totalDays += property.daysInStage || 0;
  });

  const rows = Array.from(stageMap.values()).map((row) => ({
    stage: row.stage,
    count: row.count,
    avgDaysInStage: row.count ? Number((row.totalDays / row.count).toFixed(1)) : 0,
  }));

  if (!rows.length) return null;
  return rows.sort((a, b) => b.avgDaysInStage - a.avgDaysInStage)[0];
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

function buildPriorityItems(properties) {
  return [...properties]
    .filter((p) => p.turnStatus === "Blocked" || p.risk >= 70 || p.forecastDaysLate >= 2)
    .sort((a, b) => {
      if (a.turnStatus === "Blocked" && b.turnStatus !== "Blocked") return -1;
      if (a.turnStatus !== "Blocked" && b.turnStatus === "Blocked") return 1;
      if (b.forecastDaysLate !== a.forecastDaysLate) return b.forecastDaysLate - a.forecastDaysLate;
      return b.risk - a.risk;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.market} • ${p.currentStage}`,
      detail:
        p.forecastDaysLate >= 2
          ? `Forecast is ${p.forecastDaysLate}d behind ECD (${formatDate(
              p.forecastCompletion
            )}).`
          : p.turnStatus === "Blocked"
          ? "Blocked and needs operator intervention."
          : "High-risk turn should be actively managed.",
      tone:
        p.forecastDaysLate >= 4 || p.turnStatus === "Blocked"
          ? "red"
          : p.forecastDaysLate >= 2 || p.risk >= 70
          ? "amber"
          : "blue",
    }));
}

function buildMarketHealth(properties) {
  return Array.from(new Set(properties.map((p) => p.market)))
    .map((market) => {
      const rows = properties.filter((p) => p.market === market);
      const avgRisk = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + row.risk, 0) / rows.length)
        : 0;
      const avgForecastDelay = rows.length
        ? Number(
            (
              rows.reduce((sum, row) => sum + (row.forecastDaysLate || 0), 0) / rows.length
            ).toFixed(1)
          )
        : 0;

      return {
        market,
        openTurns: rows.length,
        blocked: rows.filter((r) => r.turnStatus === "Blocked").length,
        avgRisk,
        avgForecastDelay,
      };
    })
    .sort((a, b) => b.avgForecastDelay - a.avgForecastDelay || b.avgRisk - a.avgRisk);
}

function buildRecommendations(properties) {
  const recs = [];

  const forecastLate = properties.filter((p) => p.forecastDaysLate >= 4);
  if (forecastLate.length) {
    recs.push({
      tone: "red",
      title: "Intervene on forecast-late turns",
      body: `${forecastLate.length} turn${
        forecastLate.length > 1 ? "s are" : " is"
      } modeled at 4+ days behind ECD.`,
      homes: forecastLate.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const blockedTurns = properties.filter((p) => p.turnStatus === "Blocked");
  if (blockedTurns.length) {
    recs.push({
      tone: "red",
      title: "Resolve blocked turns first",
      body: `${blockedTurns.length} blocked turn${
        blockedTurns.length > 1 ? "s are" : " is"
      } driving portfolio risk and likely ECD slippage.`,
      homes: blockedTurns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const approvalTurns = properties.filter((p) => p.currentStage === "Owner Approval");
  if (approvalTurns.length) {
    recs.push({
      tone: "amber",
      title: "Clear Owner Approval backlog",
      body: `${approvalTurns.length} turn${
        approvalTurns.length > 1 ? "s are" : " is"
      } waiting in Owner Approval, with modeled downstream forecast pressure.`,
      homes: approvalTurns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const highReadiness = properties.filter((p) => p.readiness >= 90 && p.forecastDaysLate <= 1);
  if (highReadiness.length) {
    recs.push({
      tone: "emerald",
      title: "Fast-track high-readiness turns",
      body: `${highReadiness.length} turn${
        highReadiness.length > 1 ? "s are" : " is"
      } ready to move quickly with limited modeled delay exposure.`,
      homes: highReadiness.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  return recs.slice(0, 4);
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
      why: "This blocker is directly contributing to forecast slippage and readiness drag.",
      priority: "High",
      tone: "red",
      type: "resolve-blocker",
      rank: 1,
      simulation: {
        readinessDelta: 10,
        riskDelta: -8,
        ecdDeltaDays: -2,
        vacancySavings: 240,
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
      why: "Reducing review lag improves downstream handoff speed and expected completion confidence.",
      priority: "High",
      tone: "amber",
      type: "approve-scope",
      rank: 2,
      simulation: {
        readinessDelta: 6,
        riskDelta: -5,
        ecdDeltaDays: -1,
        vacancySavings: 120,
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
      why: "Owner Approval is one of the highest-friction stages in the modeled workflow.",
      priority: "High",
      tone: "amber",
      type: "review-owner",
      rank: 3,
      simulation: {
        readinessDelta: 4,
        riskDelta: -4,
        ecdDeltaDays: -2,
        vacancySavings: 240,
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
      why: "Removing vendor ambiguity improves scheduling certainty and reduces idle days.",
      priority: p.risk >= 75 ? "High" : "Medium",
      tone: "blue",
      type: "assign-vendor",
      rank: 4,
      simulation: {
        readinessDelta: 7,
        riskDelta: -6,
        ecdDeltaDays: -1,
        vacancySavings: 120,
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
      why: "Near-term high-risk turns have the highest probability of converting into real vacancy exposure.",
      priority: "High",
      tone: "red",
      type: "review-delay",
      rank: 5,
      simulation: {
        readinessDelta: 5,
        riskDelta: -7,
        ecdDeltaDays: -2,
        vacancySavings: 240,
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

function buildTurnIQCalloutV2({ properties, topStageBottleneck, actionHistory, revenueImpact }) {
  if (!properties?.length) return null;

  const blockedCount = properties.filter((p) => p.turnStatus === "Blocked").length;
  const delayedCount = properties.filter((p) => (p.forecastDaysLate || 0) >= 2).length;
  const highDelayCount = properties.filter((p) => (p.forecastDaysLate || 0) >= 4).length;
  const totalDelay = properties.reduce((sum, p) => sum + (p.forecastDaysLate || 0), 0);
  const avgReadiness = Math.round(
    properties.reduce((sum, p) => sum + (p.readiness || 0), 0) / (properties.length || 1)
  );
  const totalDaysAvoided = actionHistory
    .filter((a) => a.kind === "completed")
    .reduce((sum, a) => sum + (a.daysAvoided || 0), 0);

  const approvalTurns = properties.filter((p) => p.currentStage === "Owner Approval").length;
  const vendorlessTurns = properties.filter((p) => !p.vendor || p.vendor === "TBD").length;
  const highestRisk = [...properties].sort((a, b) => b.risk - a.risk)[0];

  if (totalDaysAvoided >= 10 && blockedCount === 0 && highDelayCount === 0) {
    return {
      tone: "emerald",
      eyebrow: "TURNIQ IMPACT",
      title: "Critical bottlenecks have been materially reduced",
      body: `Completed operator actions have already removed ${totalDaysAvoided} modeled delay days. Portfolio revenue exposure is now estimated at $${revenueImpact.atRisk.toLocaleString()}, with average readiness at ${avgReadiness}.`,
      bullets: [
        `${totalDaysAvoided} delay days avoided`,
        `$${revenueImpact.atRisk.toLocaleString()} revenue still at risk`,
        `Avg readiness now ${avgReadiness}`,
      ],
    };
  }

  if (topStageBottleneck?.stage === "Owner Approval" || approvalTurns >= 2) {
    return {
      tone: "amber",
      eyebrow: "TURNIQ CALLOUT",
      title: "Owner Approval is the current bottleneck",
      body: `${approvalTurns} turn${approvalTurns === 1 ? "" : "s"} are sitting in Owner Approval${
        topStageBottleneck?.avgDaysInStage
          ? ` for an average of ${topStageBottleneck.avgDaysInStage} days`
          : ""
      }. Clearing approvals is the fastest path to reducing downstream forecast slippage and protecting modeled revenue.`,
      bullets: [
        `${approvalTurns} approvals waiting`,
        `${totalDelay} total forecast days at risk`,
        `$${revenueImpact.atRisk.toLocaleString()} revenue exposure`,
      ],
    };
  }

  if (blockedCount >= 2) {
    return {
      tone: "red",
      eyebrow: "TURNIQ CALLOUT",
      title: "Blocked turns are driving current delay pressure",
      body: `${blockedCount} blocked turns are contributing materially to portfolio slippage. Removing the highest-severity blockers should unlock the fastest near-term improvement and reduce vacancy exposure.`,
      bullets: [
        `${blockedCount} blocked turns`,
        `${highDelayCount} turns at 4+ forecast delay days`,
        `$${revenueImpact.atRisk.toLocaleString()} revenue at risk`,
      ],
    };
  }

  if (highDelayCount >= 2) {
    return {
      tone: "red",
      eyebrow: "TURNIQ CALLOUT",
      title: "Forecast delay concentration is building",
      body: `${highDelayCount} turns are modeled at 4+ days behind ECD, creating ${totalDelay} total days of portfolio delay. Immediate intervention should focus on the highest-risk homes first.`,
      bullets: [
        `${highDelayCount} turns heavily delayed`,
        `${totalDelay} modeled days at risk`,
        `${highestRisk?.name || "Top-risk turn"} is the biggest exposure`,
      ],
    };
  }

  if (vendorlessTurns >= 2) {
    return {
      tone: "blue",
      eyebrow: "TURNIQ CALLOUT",
      title: "Vendor assignment is the next unlock point",
      body: `${vendorlessTurns} turns still do not have a clear execution vendor. Tightening vendor assignment now should reduce forecast drift before it compounds.`,
      bullets: [
        `${vendorlessTurns} turns missing vendor path`,
        `$${revenueImpact.recoverable.toLocaleString()} recoverable revenue opportunity`,
        `Low-effort action with near-term impact`,
      ],
    };
  }

  return {
    tone: "emerald",
    eyebrow: "TURNIQ CALLOUT",
    title: "Execution is stable and under control",
    body: `No major portfolio bottleneck is dominating the workflow right now. Focus should stay on maintaining readiness, pushing high-confidence turns to completion, and preventing new blockers from forming.`,
    bullets: [
      `${blockedCount} blocked turns`,
      `${delayedCount} turns forecast late`,
      `Avg readiness at ${avgReadiness}`,
    ],
  };
}

function buildImpactBanner(properties, actionHistory) {
  const completed = actionHistory.filter((a) => a.kind === "completed");
  if (!completed.length) return null;

  const totalDaysAvoided = completed.reduce((sum, a) => sum + (a.daysAvoided || 0), 0);
  const totalVacancySaved = completed.reduce((sum, a) => sum + (a.vacancySavings || 0), 0);
  const impactedTurns = new Set(completed.map((a) => a.propertyId)).size;
  const readinessLift = completed.reduce((sum, a) => sum + Math.max(0, a.readinessDelta || 0), 0);

  return {
    totalDaysAvoided,
    totalVacancySaved,
    impactedTurns,
    readinessLift,
  };
}

function buildPresentationNarrative({
  properties,
  forecastSummary,
  revenueImpact,
  topStageBottleneck,
}) {
  const highRiskCount = properties.filter((p) => p.risk >= 75).length;
  const blockedCount = properties.filter((p) => p.turnStatus === "Blocked").length;

  return [
    `${highRiskCount} turns are currently driving the majority of portfolio risk.`,
    topStageBottleneck
      ? `${topStageBottleneck.stage} is the primary bottleneck, averaging ${topStageBottleneck.avgDaysInStage} days in stage.`
      : "No single bottleneck is dominating the workflow.",
    `The portfolio is carrying ${forecastSummary.totalDelay} modeled delay days and $${revenueImpact.atRisk.toLocaleString()} of revenue exposure.`,
    `Executing the recommended actions should recover a meaningful portion of that exposure and improve readiness across the queue.`,
    blockedCount > 0
      ? `${blockedCount} blocked turns need immediate intervention.`
      : "There are no blocked turns currently preventing execution flow.",
  ];
}

export default function DashboardTab({
  mode,
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
  getToneFromRisk,
  topStageBottleneck,
}) {
  const [draftNote, setDraftNote] = useState("");
  const [horizon, setHorizon] = useState("Today");
  const [previewActionId, setPreviewActionId] = useState(null);
  const [pulse, setPulse] = useState(false);

  const horizonProperties = useMemo(
    () =>
      properties
        .filter((p) => isInHorizon(p, horizon))
        .map((p) => ({ ...p, ...buildForecast(p) })),
    [properties, horizon]
  );

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(t);
  }, [horizonProperties]);

  const revenueImpact = useMemo(
    () => calculateRevenueImpact(horizonProperties),
    [horizonProperties]
  );

  const derivedBottleneck = useMemo(
    () => topStageBottleneck || buildStageBottleneck(properties),
    [topStageBottleneck, properties]
  );

  const forecastSummary = useMemo(() => {
    const total = horizonProperties.length || 1;
    const totalDelay = horizonProperties.reduce(
      (sum, property) => sum + (property.forecastDaysLate || 0),
      0
    );
    const avgForecastDelay = Number((totalDelay / total).toFixed(1));
    const forecastLateCount = horizonProperties.filter((p) => p.forecastDaysLate >= 2).length;
    const highDelayCount = horizonProperties.filter((p) => p.forecastDaysLate >= 4).length;
    return {
      avgForecastDelay,
      forecastLateCount,
      highDelayCount,
      totalDelay,
    };
  }, [horizonProperties]);

  const callout = useMemo(
    () =>
      buildTurnIQCalloutV2({
        properties: horizonProperties,
        topStageBottleneck: derivedBottleneck,
        actionHistory,
        revenueImpact,
      }),
    [horizonProperties, derivedBottleneck, actionHistory, revenueImpact]
  );

  const impactBanner = useMemo(
    () => buildImpactBanner(horizonProperties, actionHistory),
    [horizonProperties, actionHistory]
  );

  const selectedForecast = selectedProperty ? buildForecast(selectedProperty) : null;
  const selectedConfidenceMeta = selectedForecast
    ? getConfidenceLabel(selectedForecast.forecastConfidence)
    : { label: "—", tone: "blue" };

  const actions = useMemo(() => generateActions(horizonProperties), [horizonProperties]);
  const priorities = useMemo(() => buildPriorityItems(horizonProperties), [horizonProperties]);
  const marketHealth = useMemo(
    () => buildMarketHealth(properties.map((p) => ({ ...p, ...buildForecast(p) }))),
    [properties]
  );
  const recommendations = useMemo(
    () => buildRecommendations(horizonProperties),
    [horizonProperties]
  );
  const performanceMetrics = useMemo(
    () => buildPerformanceMetrics(actionHistory),
    [actionHistory]
  );

  const presentationNarrative = useMemo(
    () =>
      buildPresentationNarrative({
        properties: horizonProperties,
        forecastSummary,
        revenueImpact,
        topStageBottleneck: derivedBottleneck,
      }),
    [horizonProperties, forecastSummary, revenueImpact, derivedBottleneck]
  );

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
            {mode === "presentation"
              ? "Executive view of portfolio risk, revenue exposure, and recommended interventions."
              : "Prioritize work, surface TurnIQ recommendations, and manage the portfolio from one control surface."}
          </div>
        </div>

        {mode === "operator" ? (
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
        ) : (
          <Pill tone="blue">{selectedMarket === "All Markets" ? "Portfolio View" : selectedMarket}</Pill>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-4 md:grid-cols-2 transition-all duration-500 ${
          pulse ? "scale-[1.01]" : "scale-100"
        }`}
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-xs uppercase tracking-wide text-red-600">
            Revenue at Risk
          </div>
          <div className="mt-2 text-3xl font-semibold text-red-700 transition-all duration-500">
            ${revenueImpact.atRisk.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-red-600">
            Driven by forecast delay, blockers, and high-risk turns
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-600">
            Recoverable Revenue
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700 transition-all duration-500">
            ${revenueImpact.recoverable.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-emerald-600">
            If recommendations are executed successfully
          </div>
        </div>
      </div>

      {callout ? (
        <div
          className={`rounded-3xl border p-5 shadow-sm transition-all duration-500 ${
            callout.tone === "red"
              ? "border-red-200 bg-red-50"
              : callout.tone === "amber"
              ? "border-amber-200 bg-amber-50"
              : callout.tone === "blue"
              ? "border-blue-200 bg-blue-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {callout.eyebrow}
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{callout.title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-700">{callout.body}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            {callout.bullets.map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Estimates based on modeled delay, risk weighting, and assumed daily rent impact.
          </div>
        </div>
      ) : null}

      {mode === "presentation" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            TurnIQ Narrative
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            Where TurnIQ sees the opportunity
          </div>
          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {presentationNarrative.map((line) => (
              <div key={line}>• {line}</div>
            ))}
          </div>
        </div>
      ) : null}

      {impactBanner ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Portfolio Impact
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/80 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Delay Days Saved</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {impactBanner.totalDaysAvoided}
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Turns Impacted</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {impactBanner.impactedTurns}
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Readiness Lift</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                +{impactBanner.readinessLift}
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Vacancy Protected</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                ${impactBanner.totalVacancySaved}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Forecast Delay</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {forecastSummary.avgForecastDelay}d
          </div>
          <div className="mt-1 text-sm text-slate-500">Average modeled variance to ECD</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Forecast-Late Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {forecastSummary.forecastLateCount}
          </div>
          <div className="mt-1 text-sm text-slate-500">Turns forecasted 2+ days late</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">High Delay Risk</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {forecastSummary.highDelayCount}
          </div>
          <div className="mt-1 text-sm text-slate-500">Turns forecasted 4+ days behind</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Days At Risk</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {forecastSummary.totalDelay}
          </div>
          <div className="mt-1 text-sm text-slate-500">Total modeled portfolio slippage</div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">
              {mode === "presentation" ? "TurnIQ Recommended Interventions" : "Recommended Actions"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {mode === "presentation"
                ? "The highest-leverage actions to reduce delay and revenue exposure."
                : "AI-generated operator actions to reduce delay risk and keep turns moving."}
            </div>
          </div>
          <Pill tone="blue">{actions.length} actions</Pill>
        </div>

        {mode === "operator" ? (
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
        ) : null}

        <div className="grid gap-6 xl:grid-cols-12">
          <div className={mode === "presentation" ? "xl:col-span-12 space-y-3" : "xl:col-span-8 space-y-3"}>
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:shadow-md md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-900">{action.propertyName}</div>
                    <Pill tone={action.tone}>{action.priority}</Pill>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">{action.title}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {action.market} • {action.message}
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-400">
                    Impact: {action.impact}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Why: {action.why}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Modeled outcome: {Math.abs(action.simulation?.ecdDeltaDays || 0)} day(s) faster •
                    +{action.simulation?.readinessDelta || 0} readiness • $
                    {action.simulation?.vacancySavings || 0} vacancy protected
                  </div>
                </div>

                <div className="flex gap-2">
                  {mode === "operator" ? (
                    <>
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
                    </>
                  ) : (
                    <button
                      onClick={() => handleActionView(action)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      View driver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {mode === "operator" ? (
            <div className="xl:col-span-4">
              <Card className="h-full bg-slate-50">
                <div className="text-lg font-semibold text-slate-900">Simulation Preview</div>
                <div className="mt-1 text-sm text-slate-500">
                  {previewAction
                    ? `Projected impact for ${previewAction.propertyName}`
                    : "Select an action to preview operator impact"}
                </div>

                {previewAction ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Expected ECD Change
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {previewAction.simulation?.ecdDeltaDays < 0
                          ? `${Math.abs(previewAction.simulation.ecdDeltaDays)} days faster`
                          : `${previewAction.simulation?.ecdDeltaDays || 0} days`}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Readiness Lift
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        +{previewAction.simulation?.readinessDelta || 0} pts
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Risk Reduction
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {previewAction.simulation?.riskDelta || 0} pts
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
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Open an action to preview projected outcome before execution.
                  </div>
                )}
              </Card>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  {mode === "presentation" ? "Priority Homes" : "Priorities"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Highest-urgency turns based on blockers, risk, and forecast pressure.
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
                        {item.tone === "red"
                          ? "Urgent"
                          : item.tone === "amber"
                          ? "Watch"
                          : "Monitor"}
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
                          {row.openTurns} open turns • {row.blocked} blocked • avg delay{" "}
                          {row.avgForecastDelay}d
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

      {mode === "operator" ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <Card className="h-full">
              <div className="text-xl font-semibold text-slate-900">TurnIQ Recommendations</div>
              <div className="mt-1 text-sm text-slate-500">
                AI recommendations based on blockers, approvals, readiness, and forecast variance.
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
                  <div className="text-xs uppercase tracking-wide text-slate-500">ECD</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {selectedProperty.projectedCompletion}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Forecast</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {selectedForecast ? formatDate(selectedForecast.forecastCompletion) : "—"}
                  </div>
                </div>
              </div>

              {selectedForecast ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Forecast variance</div>
                    <div className="flex items-center gap-2">
                      <Pill
                        tone={
                          selectedForecast.forecastDaysLate >= 4
                            ? "red"
                            : selectedForecast.forecastDaysLate >= 2
                            ? "amber"
                            : "emerald"
                        }
                      >
                        {selectedForecast.forecastDaysLate === 0
                          ? "On time"
                          : `+${selectedForecast.forecastDaysLate}d`}
                      </Pill>
                      <Pill tone={selectedConfidenceMeta.tone}>
                        {selectedConfidenceMeta.label}
                      </Pill>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Confidence {selectedForecast.forecastConfidence}% • Forecasted completion{" "}
                    {formatDate(selectedForecast.forecastCompletion)}
                  </div>
                </div>
              ) : null}

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

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Performance Snapshot</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Completed</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">
                      {performanceMetrics.totalCompleted}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Days Avoided</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">
                      {performanceMetrics.totalDaysAvoided}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Vacancy Saved</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">
                      ${performanceMetrics.totalVacancySaved}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Avg Response</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">
                      {performanceMetrics.avgResponseMinutes}m
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {mode === "operator" ? (
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

          <div className="xl:col-span-5 space-y-6">
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
      ) : null}

      {mode === "operator" ? (
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
                      <th className="px-3 py-2 font-medium">Forecast</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2 font-medium">Readiness</th>
                      <th className="px-3 py-2 font-medium">Completion</th>
                    </tr>
                  </thead>

                  <tbody>
                    {horizonProperties.map((row) => {
                      const meta = getConfidenceLabel(row.forecastConfidence);
                      return (
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
                          <td className="px-3 py-3">
                            <Pill
                              tone={
                                row.forecastDaysLate >= 4
                                  ? "red"
                                  : row.forecastDaysLate >= 2
                                  ? "amber"
                                  : "emerald"
                              }
                            >
                              {row.forecastDaysLate === 0 ? "On time" : `+${row.forecastDaysLate}d`}
                            </Pill>
                          </td>
                          <td className="px-3 py-3">
                            <Pill tone={meta.tone}>{meta.label}</Pill>
                          </td>
                          <td className="w-[160px] px-3 py-3">
                            <ProgressBar
                              value={row.readiness}
                              tone={getReadinessTone(row.readiness)}
                            />
                          </td>
                          <td className="px-3 py-3">{row.projectedCompletion}</td>
                        </tr>
                      );
                    })}
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
          </div>
        </div>
      ) : null}
    </div>
  );
}