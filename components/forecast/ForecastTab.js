"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

const DAILY_RENT_ASSUMPTION = 120;
const SCENARIOS = ["Base Case", "Optimized Case", "Worst Case"];

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

function formatVariance(days) {
  if (days === 0) return "On time";
  return `+${days}d`;
}

function varianceTone(days) {
  if (days >= 4) return "red";
  if (days >= 2) return "amber";
  return "emerald";
}

function calculateRevenueImpact(properties) {
  let atRisk = 0;
  let recoverable = 0;

  properties.forEach((p) => {
    const delayDays = typeof p.forecastDaysLate === "number" ? p.forecastDaysLate : 0;
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

function buildForecast(property) {
  const blockers = getLiveBlockers(property.blockers);
  const riskDelay = getRiskDelay(property.risk);
  const stageDelay = getStageDelay(property.currentStage);
  const blockerDelay = blockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);
  const forecastDaysLate = riskDelay + stageDelay + blockerDelay;
  const forecastCompletion = addDays(property.projectedCompletion, forecastDaysLate);
  const forecastConfidence =
    typeof property.timelineConfidence === "number"
      ? property.timelineConfidence
      : Math.max(
          40,
          Math.min(95, Math.round(100 - property.risk * 0.5 - blockers.length * 5))
        );

  const forecastRiskBand =
    forecastDaysLate >= 4
      ? { label: "High Delay Risk", tone: "red" }
      : forecastDaysLate >= 2
      ? { label: "Watch", tone: "amber" }
      : { label: "On Track", tone: "emerald" };

  const forecastDelayDrivers = [
    ...(riskDelay > 0 ? [{ label: `Risk score pressure (${property.risk})`, days: riskDelay }] : []),
    ...(stageDelay > 0 ? [{ label: `${property.currentStage} stage pressure`, days: stageDelay }] : []),
    ...blockers.map((blocker) => ({
      label: blocker,
      days: getBlockerSeverity(blocker),
    })),
  ];

  return {
    forecastCompletion,
    forecastDaysLate,
    forecastConfidence,
    forecastRiskBand,
    forecastDelayDrivers:
      forecastDelayDrivers.length > 0
        ? forecastDelayDrivers
        : [{ label: "Standard execution variability", days: 0 }],
  };
}

function buildForecastRange(property) {
  const base = toDate(property.projectedCompletion);
  if (!base) {
    return {
      bestCaseDate: "",
      expectedDate: "",
      worstCaseDate: "",
      spread: 0,
    };
  }

  const blockers = getLiveBlockers(property.blockers);
  const uncertaintyDays = Math.max(
    1,
    Math.round(property.risk / 35) + Math.min(3, blockers.length)
  );

  const best = new Date(base);
  best.setDate(best.getDate() - 1);

  const worst = new Date(base);
  worst.setDate(worst.getDate() + uncertaintyDays);

  return {
    bestCaseDate: best.toISOString().slice(0, 10),
    expectedDate: base.toISOString().slice(0, 10),
    worstCaseDate: worst.toISOString().slice(0, 10),
    spread: uncertaintyDays + 1,
  };
}

function getRecommendedAction(property) {
  const blockers = getLiveBlockers(property.blockers);

  if (blockers.some((b) => b.toLowerCase().includes("approval"))) {
    return {
      action: "Expedite owner approval",
      impact: 2,
      type: "approval",
      why: "Approval lag is stalling dispatch and extending modeled vacancy.",
    };
  }

  if (blockers.some((b) => b.toLowerCase().includes("appliance"))) {
    return {
      action: "Switch / expedite appliance vendor",
      impact: 2,
      type: "appliance",
      why: "Appliance timing is materially influencing expected completion.",
    };
  }

  if (blockers.some((b) => b.toLowerCase().includes("inspection"))) {
    return {
      action: "Pre-clear inspection issues",
      impact: 1,
      type: "inspection",
      why: "Inspection failure risk is adding avoidable delay variance.",
    };
  }

  if (!property.vendor || property.vendor === "TBD") {
    return {
      action: "Assign execution vendor",
      impact: 2,
      type: "vendor",
      why: "Clear vendor ownership improves execution certainty and dispatch timing.",
    };
  }

  if (property.currentStage === "Dispatch") {
    return {
      action: "Re-sequence vendor scheduling",
      impact: 1,
      type: "dispatch",
      why: "Dispatch-stage coordination can compress the active work window.",
    };
  }

  if (blockers.some((b) => b.toLowerCase().includes("access"))) {
    return {
      action: "Resolve access / lockbox issue",
      impact: 2,
      type: "access",
      why: "Access issues create hard stoppages and immediate lost days.",
    };
  }

  return {
    action: "Monitor",
    impact: 0,
    type: "monitor",
    why: "No high-leverage intervention is currently required.",
  };
}

function buildDecisionForecast(property) {
  const forecast = buildForecast(property);
  const range = buildForecastRange(property);
  const recommendation = getRecommendedAction(property);
  const improvedDelay = Math.max(0, forecast.forecastDaysLate - recommendation.impact);
  const improvedCompletion = addDays(property.projectedCompletion, improvedDelay);
  const daysSaved = forecast.forecastDaysLate - improvedDelay;
  const revenueProtected = daysSaved * DAILY_RENT_ASSUMPTION;

  return {
    ...forecast,
    ...range,
    recommendation,
    improvedDelay,
    improvedCompletion,
    daysSaved,
    revenueProtected,
  };
}

function buildPortfolioForecast(properties) {
  const rows = properties.map((p) => {
    const forecast = buildForecast(p);
    return { ...p, ...forecast };
  });

  const totalDelay = rows.reduce((sum, row) => sum + (row.forecastDaysLate || 0), 0);
  const avgDelay = Number((totalDelay / (rows.length || 1)).toFixed(1));
  const avgConfidence = Math.round(
    rows.reduce((sum, row) => sum + (row.forecastConfidence || 0), 0) / (rows.length || 1)
  );

  return {
    totalDelay,
    avgDelay,
    avgConfidence,
    onTrack: rows.filter((row) => row.forecastDaysLate <= 1).length,
    delayed: rows.filter((row) => row.forecastDaysLate >= 2).length,
  };
}

function buildScenarioForecast(row, scenarioName) {
  const baseDelay = row.forecastDaysLate || 0;

  if (scenarioName === "Optimized Case") {
    const nextDelay = Math.max(0, baseDelay - Math.max(1, row.recommendation?.impact || 0) - 1);
    return {
      name: scenarioName,
      forecastDaysLate: nextDelay,
      forecastCompletion: addDays(row.projectedCompletion, nextDelay),
      confidence: Math.min(95, (row.forecastConfidence || 75) + 8),
      revenueImpact: nextDelay * DAILY_RENT_ASSUMPTION,
      riskTone: varianceTone(nextDelay),
      daysDeltaVsBase: baseDelay - nextDelay,
    };
  }

  if (scenarioName === "Worst Case") {
    const blockerPenalty = Math.max(1, getLiveBlockers(row.blockers).length);
    const nextDelay = baseDelay + blockerPenalty + 2;
    return {
      name: scenarioName,
      forecastDaysLate: nextDelay,
      forecastCompletion: addDays(row.projectedCompletion, nextDelay),
      confidence: Math.max(45, (row.forecastConfidence || 75) - 12),
      revenueImpact: nextDelay * DAILY_RENT_ASSUMPTION,
      riskTone: varianceTone(nextDelay),
      daysDeltaVsBase: baseDelay - nextDelay,
    };
  }

  return {
    name: "Base Case",
    forecastDaysLate: baseDelay,
    forecastCompletion: row.forecastCompletion,
    confidence: row.forecastConfidence,
    revenueImpact: baseDelay * DAILY_RENT_ASSUMPTION,
    riskTone: varianceTone(baseDelay),
    daysDeltaVsBase: 0,
  };
}

function getAppliedPatch(property, recommendation, scenarioName) {
  const currentBlockers = property.blockers || [];
  let blockers = currentBlockers;
  let vendor = property.vendor;
  let currentStage = property.currentStage;
  let readinessDelta = 4;

  if (scenarioName === "Worst Case") {
    return {
      blockers: getLiveBlockers(currentBlockers).length
        ? currentBlockers
        : ["Access issue", "Inspection fail likelihood"],
      vendor,
      currentStage,
      readinessDelta: -6,
      scenario: "worst",
    };
  }

  if (recommendation.type === "approval") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("approval"));
    currentStage = property.currentStage === "Owner Approval" ? "Dispatch" : property.currentStage;
    readinessDelta = 6;
  } else if (recommendation.type === "appliance") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("appliance"));
    readinessDelta = 6;
  } else if (recommendation.type === "inspection") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("inspection"));
    readinessDelta = 5;
  } else if (recommendation.type === "vendor") {
    vendor =
      property.vendor && property.vendor !== "TBD"
        ? property.vendor
        : property.market === "Dallas"
        ? "FloorCo"
        : property.market === "Atlanta"
        ? "ABC Paint"
        : property.market === "Phoenix"
        ? "Prime Paint"
        : "Sparkle";
    readinessDelta = 7;
  } else if (recommendation.type === "dispatch") {
    readinessDelta = 4;
  } else if (recommendation.type === "access") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("access"));
    readinessDelta = 6;
  }

  if (!getLiveBlockers(blockers).length) {
    blockers = ["No active blockers"];
  }

  return {
    blockers,
    vendor,
    currentStage,
    readinessDelta,
    scenario: "optimized",
  };
}

function getTotalScenarioImpact(drivers = []) {
  return drivers.reduce((sum, d) => sum + (d.days || 0), 0);
}

export default function ForecastTab({
  selectedProperty,
  properties,
  setSelectedPropertyId,
  applyForecastPatch,
  applyForecastBatch,
  undoLastForecastAction,
  canUndoForecastAction,
  lastForecastUndoLabel,
}) {
  const [activeScenario, setActiveScenario] = useState("Base Case");
  const [fixAllMessage, setFixAllMessage] = useState("");

  const forecastRows = useMemo(
    () =>
      properties.map((property) => ({
        ...property,
        ...buildDecisionForecast(property),
      })),
    [properties]
  );

  const currentSelected =
    forecastRows.find((row) => row.id === selectedProperty?.id) || forecastRows[0];

  const scenarioComparisons = useMemo(() => {
    if (!currentSelected) return [];
    return SCENARIOS.map((name) => buildScenarioForecast(currentSelected, name));
  }, [currentSelected]);

  const activeScenarioResult = scenarioComparisons.find((s) => s.name === activeScenario);

  const summary = useMemo(() => buildPortfolioForecast(properties), [properties]);
  const portfolioRevenueImpact = useMemo(
    () => calculateRevenueImpact(forecastRows),
    [forecastRows]
  );

  const confidenceMeta = currentSelected
    ? getConfidenceLabel(currentSelected.forecastConfidence)
    : { label: "—", tone: "blue" };

  const maxDelay = Math.max(...forecastRows.map((row) => row.forecastDaysLate), 1);

  const optimizedPortfolioSummary = useMemo(() => {
    const optimizedRows = forecastRows.map((row) =>
      buildScenarioForecast(row, "Optimized Case")
    );

    const totalDelay = optimizedRows.reduce((sum, row) => sum + row.forecastDaysLate, 0);
    const revenueProtected = forecastRows.reduce(
      (sum, row) => sum + (row.revenueProtected || 0),
      0
    );

    return {
      totalDelay,
      revenueProtected,
      daysSaved:
        summary.totalDelay - totalDelay,
    };
  }, [forecastRows, summary.totalDelay]);

  function commitScenario(row, scenarioName) {
    const scenario = buildScenarioForecast(row, scenarioName);
    const patchMeta = getAppliedPatch(row, row.recommendation, scenarioName);

    const patch =
      scenarioName === "Worst Case"
        ? {
            projectedCompletion: scenario.forecastCompletion,
            risk: Math.min(100, row.risk + 8),
            readiness: Math.max(0, row.readiness + patchMeta.readinessDelta),
            blockers: patchMeta.blockers,
            vendor: patchMeta.vendor,
            currentStage: patchMeta.currentStage,
            turnStatus: "Blocked",
          }
        : {
            projectedCompletion: scenario.forecastCompletion,
            risk:
              scenario.forecastDaysLate === 0
                ? Math.max(0, row.risk - 10)
                : scenario.forecastDaysLate <= 2
                ? Math.max(0, row.risk - 6)
                : Math.max(0, row.risk - 3),
            readiness: Math.min(100, row.readiness + patchMeta.readinessDelta),
            blockers: patchMeta.blockers,
            vendor: patchMeta.vendor,
            currentStage: patchMeta.currentStage,
            turnStatus:
              scenario.forecastDaysLate === 0 && patchMeta.blockers?.[0] === "No active blockers"
                ? "Ready"
                : "Monitoring",
          };

    applyForecastPatch(
      row.id,
      patch,
      `${scenarioName} committed for ${row.name}`
    );

    setSelectedPropertyId(row.id);
  }

  function handleFixAllOptimized() {
    const beforeImpact = calculateRevenueImpact(forecastRows);

    const patches = forecastRows
      .filter((row) => row.recommendation.impact > 0)
      .map((row) => {
        const scenario = buildScenarioForecast(row, "Optimized Case");
        const patchMeta = getAppliedPatch(row, row.recommendation, "Optimized Case");

        return {
          id: row.id,
          patch: {
            projectedCompletion: scenario.forecastCompletion,
            risk:
              scenario.forecastDaysLate === 0
                ? Math.max(0, row.risk - 10)
                : scenario.forecastDaysLate <= 2
                ? Math.max(0, row.risk - 6)
                : Math.max(0, row.risk - 3),
            readiness: Math.min(100, row.readiness + patchMeta.readinessDelta),
            blockers: patchMeta.blockers,
            vendor: patchMeta.vendor,
            currentStage: patchMeta.currentStage,
            turnStatus:
              scenario.forecastDaysLate === 0 && patchMeta.blockers?.[0] === "No active blockers"
                ? "Ready"
                : "Monitoring",
          },
        };
      });

    applyForecastBatch(patches, "Fix All optimized scenario");

    const afterRows = forecastRows.map((row) => {
      const found = patches.find((p) => p.id === row.id);
      if (!found) return row;
      const optimized = buildScenarioForecast(row, "Optimized Case");
      return {
        ...row,
        ...found.patch,
        forecastDaysLate: optimized.forecastDaysLate,
      };
    });

    const afterImpact = calculateRevenueImpact(afterRows);
    const removedRisk = Math.max(0, beforeImpact.atRisk - afterImpact.atRisk);

    setFixAllMessage(
      `Optimized plan committed • ${optimizedPortfolioSummary.daysSaved} total delay days saved • ~$${optimizedPortfolioSummary.revenueProtected.toLocaleString()} vacancy impact protected • $${removedRisk.toLocaleString()} revenue risk removed`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            Compare base, optimized, and downside scenarios before committing portfolio actions.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="blue">{forecastRows.length} turns modeled</Pill>
          {canUndoForecastAction ? (
            <button
              onClick={undoLastForecastAction}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100"
            >
              Undo last action
            </button>
          ) : null}
          <button
            onClick={handleFixAllOptimized}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Commit optimized plan
          </button>
        </div>
      </div>

      {canUndoForecastAction && lastForecastUndoLabel ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Undo available: {lastForecastUndoLabel}
        </div>
      ) : null}

      {fixAllMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {fixAllMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Base Delay</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalDelay}d</div>
          <div className="mt-1 text-sm text-slate-500">Current modeled portfolio slippage</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Optimized Delay</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {optimizedPortfolioSummary.totalDelay}d
          </div>
          <div className="mt-1 text-sm text-slate-500">If best actions are executed</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Days Saved</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {optimizedPortfolioSummary.daysSaved}d
          </div>
          <div className="mt-1 text-sm text-slate-500">Optimized vs base case</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Confidence</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avgConfidence}%</div>
          <div className="mt-1 text-sm text-slate-500">Average timeline confidence</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Revenue at Risk</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            ${portfolioRevenueImpact.atRisk.toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-slate-500">Modeled base-case rent exposure</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">$ Protected</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            ${optimizedPortfolioSummary.revenueProtected.toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-slate-500">If optimized plan is committed</div>
        </Card>
      </div>

      {currentSelected ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  Scenario Comparison — {currentSelected.name}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Compare likely outcomes before applying a plan.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((scenarioName) => (
                  <button
                    key={scenarioName}
                    onClick={() => setActiveScenario(scenarioName)}
                    className={`rounded-xl px-4 py-2 text-sm ${
                      activeScenario === scenarioName
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {scenarioName}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {scenarioComparisons.map((scenario) => (
                <div
                  key={scenario.name}
                  className={`rounded-2xl border p-4 ${
                    activeScenario === scenario.name
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-900">{scenario.name}</div>
                    <Pill tone={scenario.riskTone}>
                      {formatVariance(scenario.forecastDaysLate)}
                    </Pill>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <div className="text-slate-500">Forecast Completion</div>
                      <div className="font-medium text-slate-900">
                        {formatDate(scenario.forecastCompletion)}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">Confidence</div>
                      <div className="font-medium text-slate-900">
                        {scenario.confidence}%
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">Revenue Exposure</div>
                      <div className="font-medium text-slate-900">
                        ${scenario.revenueImpact.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">Delta vs Base</div>
                      <div className="font-medium text-slate-900">
                        {scenario.daysDeltaVsBase > 0
                          ? `${scenario.daysDeltaVsBase}d better`
                          : scenario.daysDeltaVsBase < 0
                          ? `${Math.abs(scenario.daysDeltaVsBase)}d worse`
                          : "No change"}
                      </div>
                    </div>
                  </div>

                  {scenario.name !== "Base Case" ? (
                    <div className="mt-4">
                      <button
                        onClick={() => commitScenario(currentSelected, scenario.name)}
                        className={`rounded-xl px-4 py-2 text-sm ${
                          scenario.name === "Optimized Case"
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Commit {scenario.name}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <Card className="h-full">
                <div className="text-xl font-semibold text-slate-900">Scenario Queue</div>
                <div className="mt-1 text-sm text-slate-500">
                  Each row shows base case plus optimized and worst-case alternatives.
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Property</th>
                        <th className="px-3 py-2 font-medium">Base</th>
                        <th className="px-3 py-2 font-medium">Optimized</th>
                        <th className="px-3 py-2 font-medium">Worst</th>
                        <th className="px-3 py-2 font-medium">$ Protected</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastRows
                        .slice()
                        .sort((a, b) => b.forecastDaysLate - a.forecastDaysLate)
                        .map((row) => {
                          const optimized = buildScenarioForecast(row, "Optimized Case");
                          const worst = buildScenarioForecast(row, "Worst Case");

                          return (
                            <tr
                              key={row.id}
                              className={`border-t border-slate-100 ${
                                currentSelected?.id === row.id ? "bg-slate-50" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-3 py-3">
                                <button
                                  onClick={() => setSelectedPropertyId(row.id)}
                                  className="font-medium text-blue-700 hover:underline"
                                >
                                  {row.name}
                                </button>
                                <div className="mt-1 text-xs text-slate-500">
                                  {row.market} • {row.currentStage}
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <div>{formatDate(row.forecastCompletion)}</div>
                                <div className="mt-1">
                                  <Pill tone={varianceTone(row.forecastDaysLate)}>
                                    {formatVariance(row.forecastDaysLate)}
                                  </Pill>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <div>{formatDate(optimized.forecastCompletion)}</div>
                                <div className="mt-1">
                                  <Pill tone={optimized.riskTone}>
                                    {formatVariance(optimized.forecastDaysLate)}
                                  </Pill>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                <div>{formatDate(worst.forecastCompletion)}</div>
                                <div className="mt-1">
                                  <Pill tone={worst.riskTone}>
                                    {formatVariance(worst.forecastDaysLate)}
                                  </Pill>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                ${row.revenueProtected.toLocaleString()}
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => commitScenario(row, "Optimized Case")}
                                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800"
                                  >
                                    Commit optimized
                                  </button>
                                  <button
                                    onClick={() => commitScenario(row, "Worst Case")}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50"
                                  >
                                    Stress test
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="xl:col-span-4">
              <Card className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-slate-900">
                      {currentSelected.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {currentSelected.market} • {currentSelected.currentStage}
                    </div>
                  </div>

                  <Pill tone={confidenceMeta.tone}>
                    {confidenceMeta.label}
                  </Pill>
                </div>

                {activeScenarioResult ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Active Scenario
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">
                          {activeScenarioResult.name}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Forecast Completion
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">
                          {formatDate(activeScenarioResult.forecastCompletion)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Variance
                        </div>
                        <div className="mt-2">
                          <Pill tone={activeScenarioResult.riskTone}>
                            {formatVariance(activeScenarioResult.forecastDaysLate)}
                          </Pill>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Revenue Exposure
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">
                          ${activeScenarioResult.revenueImpact.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Recommended Action
                      </div>
                      <div className="mt-2 text-base text-slate-800">
                        {currentSelected.recommendation.action}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        Why: {currentSelected.recommendation.why}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Optimized scenario protects ~$
                        {currentSelected.revenueProtected.toLocaleString()} and improves ECD by{" "}
                        {currentSelected.daysSaved}d.
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-sm font-semibold text-slate-900">
                        Delay Driver Breakdown
                      </div>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-left text-slate-500">
                            <tr>
                              <th className="px-3 py-2 font-medium">Driver</th>
                              <th className="px-3 py-2 font-medium">Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentSelected.forecastDelayDrivers.map((driver) => (
                              <tr
                                key={`${driver.label}-${driver.days}`}
                                className="border-t border-slate-100"
                              >
                                <td className="px-3 py-3 text-slate-700">{driver.label}</td>
                                <td className="px-3 py-3 font-medium text-slate-900">
                                  +{driver.days}d
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-slate-100 bg-slate-50">
                              <td className="px-3 py-3 font-semibold text-slate-900">Total</td>
                              <td className="px-3 py-3 font-semibold text-slate-900">
                                +{getTotalScenarioImpact(currentSelected.forecastDelayDrivers)}d
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : null}
              </Card>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">
              Portfolio Scenario Distribution
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Compare how much downside can be removed under optimized execution.
            </div>

            <div className="mt-5 space-y-4">
              {forecastRows
                .slice()
                .sort((a, b) => b.forecastDaysLate - a.forecastDaysLate)
                .map((row) => {
                  const optimized = buildScenarioForecast(row, "Optimized Case");
                  const worst = buildScenarioForecast(row, "Worst Case");

                  return (
                    <div key={row.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-800">{row.name}</div>
                        <div className="text-xs text-slate-500">
                          Base {row.forecastDaysLate}d • Optimized {optimized.forecastDaysLate}d • Worst{" "}
                          {worst.forecastDaysLate}d
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 text-xs text-slate-500">Base Case</div>
                          <div className="h-3 rounded-full bg-slate-100">
                            <div
                              className={`h-3 rounded-full ${
                                row.forecastDaysLate >= 4
                                  ? "bg-red-500"
                                  : row.forecastDaysLate >= 2
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.max(8, (row.forecastDaysLate / maxDelay) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-slate-500">Optimized Case</div>
                          <div className="h-3 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-emerald-500"
                              style={{
                                width: `${Math.max(
                                  8,
                                  (optimized.forecastDaysLate / Math.max(maxDelay, worst.forecastDaysLate)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-slate-500">Worst Case</div>
                          <div className="h-3 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-red-500"
                              style={{
                                width: `${Math.max(
                                  8,
                                  (worst.forecastDaysLate / Math.max(maxDelay, worst.forecastDaysLate)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}