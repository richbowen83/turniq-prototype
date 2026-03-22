"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

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
  const blockers = getLiveBlockers(property.blockers);
  const riskDelay = getRiskDelay(property.risk);
  const stageDelay = getStageDelay(property.currentStage);
  const blockerDelay = blockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);
  const forecastDaysLate = riskDelay + stageDelay + blockerDelay;
  const forecastCompletion = addDays(property.projectedCompletion, forecastDaysLate);
  const forecastConfidence =
    typeof property.timelineConfidence === "number"
      ? property.timelineConfidence
      : Math.max(40, Math.min(95, Math.round(100 - property.risk * 0.5 - blockers.length * 5)));

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

  const forecastInsight =
    forecastDaysLate >= 4
      ? "Material slippage risk is modeled. Removing the largest blockers should meaningfully pull forecast completion closer to ECD."
      : forecastDaysLate >= 2
      ? "Moderate delay risk is modeled. Targeted intervention on approvals, blockers, or vendor coordination should improve delivery confidence."
      : "Current forecast remains close to the stated ECD.";

  return {
    forecastCompletion,
    forecastDaysLate,
    forecastConfidence,
    forecastRiskBand,
    forecastDelayDrivers:
      forecastDelayDrivers.length > 0
        ? forecastDelayDrivers
        : [{ label: "Standard execution variability", days: 0 }],
    forecastInsight,
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

function getTotalScenarioImpact(drivers = []) {
  return drivers.reduce((sum, d) => sum + (d.days || 0), 0);
}

function getRecommendedAction(property) {
  const blockers = getLiveBlockers(property.blockers);

  if (blockers.some((b) => b.toLowerCase().includes("approval"))) {
    return { action: "Expedite owner approval", impact: 2, type: "approval" };
  }

  if (blockers.some((b) => b.toLowerCase().includes("appliance"))) {
    return { action: "Switch / expedite appliance vendor", impact: 2, type: "appliance" };
  }

  if (blockers.some((b) => b.toLowerCase().includes("inspection"))) {
    return { action: "Pre-clear inspection issues", impact: 1, type: "inspection" };
  }

  if (!property.vendor || property.vendor === "TBD") {
    return { action: "Assign execution vendor", impact: 2, type: "vendor" };
  }

  if (property.currentStage === "Dispatch") {
    return { action: "Re-sequence vendor scheduling", impact: 1, type: "dispatch" };
  }

  if (blockers.some((b) => b.toLowerCase().includes("access"))) {
    return { action: "Resolve access / lockbox issue", impact: 2, type: "access" };
  }

  return { action: "Monitor", impact: 0, type: "monitor" };
}

function buildDecisionForecast(property) {
  const forecast = buildForecast(property);
  const range = buildForecastRange(property);
  const recommendation = getRecommendedAction(property);
  const improvedDelay = Math.max(0, forecast.forecastDaysLate - recommendation.impact);
  const improvedCompletion = addDays(property.projectedCompletion, improvedDelay);
  const daysSaved = forecast.forecastDaysLate - improvedDelay;

  return {
    ...forecast,
    ...range,
    recommendation,
    improvedDelay,
    improvedCompletion,
    daysSaved,
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

function getRecommendedActions(property) {
  const blockers = getLiveBlockers(property.blockers);
  const recs = [];

  if (blockers.some((b) => String(b).toLowerCase().includes("approval"))) {
    recs.push({ label: "Expedite approval", savings: 2 });
  }
  if (!property.vendor || property.vendor === "TBD") {
    recs.push({ label: "Assign vendor immediately", savings: 2 });
  }
  if (
    blockers.some((b) =>
      ["access", "inspection", "hvac"].some((term) => String(b).toLowerCase().includes(term))
    )
  ) {
    recs.push({ label: "Resolve highest-severity blocker", savings: 2 });
  }
  if (property.risk >= 75) {
    recs.push({ label: "Apply operator intervention", savings: 1 });
  }

  if (!recs.length) recs.push({ label: "Maintain current plan", savings: 0 });

  return recs.slice(0, 3);
}

function simulateScenario(property, options) {
  const current = buildForecast(property);
  let daysSaved = 0;
  const actions = [];

  if (options.resolveBlockers) {
    const blockerSavings = Math.min(
      3,
      getLiveBlockers(property.blockers).reduce(
        (sum, blocker) => sum + getBlockerSeverity(blocker),
        0
      )
    );
    if (blockerSavings > 0) {
      daysSaved += blockerSavings;
      actions.push(`Resolve blockers (-${blockerSavings}d)`);
    }
  }

  if (options.assignVendor) {
    if (!property.vendor || property.vendor === "TBD") {
      daysSaved += 2;
      actions.push("Assign vendor (-2d)");
    } else {
      daysSaved += 1;
      actions.push("Tighten vendor coordination (-1d)");
    }
  }

  if (options.expediteApproval && property.currentStage === "Owner Approval") {
    daysSaved += 2;
    actions.push("Expedite owner approval (-2d)");
  }

  if (options.compressSchedule) {
    daysSaved += 1;
    actions.push("Compress schedule (-1d)");
  }

  const nextDelay = Math.max(0, current.forecastDaysLate - daysSaved);

  return {
    actions,
    daysSaved,
    forecastDaysLate: nextDelay,
    forecastCompletion: addDays(property.projectedCompletion, nextDelay),
    confidence: Math.min(95, current.forecastConfidence + Math.min(12, daysSaved * 3)),
    riskBand:
      nextDelay >= 4
        ? { label: "High Delay Risk", tone: "red" }
        : nextDelay >= 2
        ? { label: "Watch", tone: "amber" }
        : { label: "On Track", tone: "emerald" },
  };
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

function getAppliedPatch(property, recommendation) {
  const currentBlockers = property.blockers || [];
  const liveBlockers = getLiveBlockers(currentBlockers);

  let blockers = currentBlockers;
  let vendor = property.vendor;
  let currentStage = property.currentStage;
  let readinessDelta = 4;
  let riskDelta = -4;

  if (recommendation.type === "approval") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("approval"));
    currentStage = property.currentStage === "Owner Approval" ? "Dispatch" : property.currentStage;
    readinessDelta = 6;
    riskDelta = -6;
  } else if (recommendation.type === "appliance") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("appliance"));
    readinessDelta = 6;
    riskDelta = -5;
  } else if (recommendation.type === "inspection") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("inspection"));
    readinessDelta = 5;
    riskDelta = -4;
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
    riskDelta = -6;
  } else if (recommendation.type === "dispatch") {
    readinessDelta = 4;
    riskDelta = -3;
  } else if (recommendation.type === "access") {
    blockers = currentBlockers.filter((b) => !String(b).toLowerCase().includes("access"));
    readinessDelta = 6;
    riskDelta = -5;
  }

  if (!getLiveBlockers(blockers).length) {
    blockers = ["No active blockers"];
  }

  if (liveBlockers.length && getLiveBlockers(blockers).length < liveBlockers.length) {
    return {
      blockers,
      vendor,
      currentStage,
      readinessDelta,
      riskDelta,
    };
  }

  return {
    blockers,
    vendor,
    currentStage,
    readinessDelta,
    riskDelta,
  };
}

export default function ForecastTab({
  selectedProperty,
  properties,
  updateProperty,
  setSelectedPropertyId,
}) {
  const [resolveBlockers, setResolveBlockers] = useState(true);
  const [assignVendor, setAssignVendor] = useState(true);
  const [expediteApproval, setExpediteApproval] = useState(true);
  const [compressSchedule, setCompressSchedule] = useState(false);
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

  const scenario = useMemo(() => {
    if (!currentSelected) return null;
    return simulateScenario(currentSelected, {
      resolveBlockers,
      assignVendor,
      expediteApproval,
      compressSchedule,
    });
  }, [
    currentSelected,
    resolveBlockers,
    assignVendor,
    expediteApproval,
    compressSchedule,
  ]);

  const summary = useMemo(() => buildPortfolioForecast(properties), [properties]);
  const confidenceMeta = currentSelected
    ? getConfidenceLabel(currentSelected.forecastConfidence)
    : { label: "—", tone: "blue" };

  const maxDelay = Math.max(...forecastRows.map((row) => row.forecastDaysLate), 1);

  const fixAllSummary = useMemo(() => {
    const actionable = forecastRows.filter((row) => row.recommendation.impact > 0);
    const totalDaysSaved = actionable.reduce((sum, row) => sum + row.daysSaved, 0);
    const totalVacancySaved = totalDaysSaved * 70;

    return {
      actionableCount: actionable.length,
      totalDaysSaved,
      totalVacancySaved,
    };
  }, [forecastRows]);

  function applyScenario() {
    if (!currentSelected || !scenario) return;

    updateProperty(currentSelected.id, {
      projectedCompletion: scenario.forecastCompletion,
      risk:
        scenario.forecastDaysLate === 0
          ? Math.max(0, currentSelected.risk - 10)
          : scenario.forecastDaysLate <= 2
          ? Math.max(0, currentSelected.risk - 6)
          : Math.max(0, currentSelected.risk - 3),
      readiness: Math.min(
        100,
        currentSelected.readiness + Math.max(3, scenario.daysSaved * 4)
      ),
      blockers:
        resolveBlockers && getLiveBlockers(currentSelected.blockers).length
          ? ["No active blockers"]
          : currentSelected.blockers,
      vendor:
        assignVendor && (!currentSelected.vendor || currentSelected.vendor === "TBD")
          ? currentSelected.market === "Dallas"
            ? "FloorCo"
            : currentSelected.market === "Atlanta"
            ? "ABC Paint"
            : currentSelected.market === "Phoenix"
            ? "Prime Paint"
            : "Sparkle"
          : currentSelected.vendor,
    });
  }

  function applySingleRecommendation(row) {
    const patchMeta = getAppliedPatch(row, row.recommendation);

    updateProperty(row.id, {
      projectedCompletion: row.improvedCompletion,
      risk:
        row.improvedDelay === 0
          ? Math.max(0, row.risk - 10)
          : row.improvedDelay <= 2
          ? Math.max(0, row.risk - 6)
          : Math.max(0, row.risk - 3),
      readiness: Math.min(100, row.readiness + patchMeta.readinessDelta),
      blockers: patchMeta.blockers,
      vendor: patchMeta.vendor,
      currentStage: patchMeta.currentStage,
      turnStatus:
        row.improvedDelay === 0 && patchMeta.blockers?.[0] === "No active blockers"
          ? "Ready"
          : "Monitoring",
    });

    setSelectedPropertyId(row.id);
  }

  function handleFixAll() {
    const actionable = forecastRows.filter((row) => row.recommendation.impact > 0);

    actionable.forEach((row) => {
      const patchMeta = getAppliedPatch(row, row.recommendation);

      updateProperty(row.id, {
        projectedCompletion: row.improvedCompletion,
        risk:
          row.improvedDelay === 0
            ? Math.max(0, row.risk - 10)
            : row.improvedDelay <= 2
            ? Math.max(0, row.risk - 6)
            : Math.max(0, row.risk - 3),
        readiness: Math.min(100, row.readiness + patchMeta.readinessDelta),
        blockers: patchMeta.blockers,
        vendor: patchMeta.vendor,
        currentStage: patchMeta.currentStage,
        turnStatus:
          row.improvedDelay === 0 && patchMeta.blockers?.[0] === "No active blockers"
            ? "Ready"
            : "Monitoring",
      });
    });

    setFixAllMessage(
      `Applied ${actionable.length} recommendations • ${fixAllSummary.totalDaysSaved} total forecast days saved • ~$${fixAllSummary.totalVacancySaved} vacancy impact avoided`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            Project actual rent-ready outcomes, understand delay drivers, and model operator interventions before slippage happens.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="blue">{forecastRows.length} turns modeled</Pill>
          <button
            onClick={handleFixAll}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Fix All
          </button>
        </div>
      </div>

      {fixAllMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {fixAllMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Forecast Delay</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avgDelay}d</div>
          <div className="mt-1 text-sm text-slate-500">Average modeled variance to ECD</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Days At Risk</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalDelay}</div>
          <div className="mt-1 text-sm text-slate-500">Total modeled portfolio slippage</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Delayed Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.delayed}</div>
          <div className="mt-1 text-sm text-slate-500">Forecasted 2+ days late</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Confidence</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avgConfidence}%</div>
          <div className="mt-1 text-sm text-slate-500">Average timeline confidence</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">If All Executed</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {fixAllSummary.totalDaysSaved}d
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Modeled days saved across {fixAllSummary.actionableCount} turns
          </div>
        </Card>
      </div>

      {currentSelected ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">Forecast Summary</div>
              <div className="mt-1 text-sm text-slate-500">
                Modeled delivery range and confidence for {currentSelected.name}.
              </div>
            </div>

            <Pill tone={confidenceMeta.tone}>
              Confidence: {confidenceMeta.label}
            </Pill>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Expected Completion</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatDate(currentSelected.forecastCompletion)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Range</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {formatDate(currentSelected.bestCaseDate)} → {formatDate(currentSelected.worstCaseDate)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Risk Exposure</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatVariance(currentSelected.forecastDaysLate)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Spread</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {currentSelected.spread}d
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Forecast Queue</div>
            <div className="mt-1 text-sm text-slate-500">
              Forecast v1.2 adds recommended action, quantified impact, improved ECD, and one-click application.
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 font-medium">ECD</th>
                    <th className="px-3 py-2 font-medium">Forecast</th>
                    <th className="px-3 py-2 font-medium">Variance</th>
                    <th className="px-3 py-2 font-medium">Confidence</th>
                    <th className="px-3 py-2 font-medium">Recommendation</th>
                    <th className="px-3 py-2 font-medium">Impact</th>
                    <th className="px-3 py-2 font-medium">Improved ECD</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastRows
                    .slice()
                    .sort((a, b) => b.forecastDaysLate - a.forecastDaysLate)
                    .map((row) => {
                      const meta = getConfidenceLabel(row.forecastConfidence);

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
                            <div className="mt-1 text-xs text-slate-500">{row.market}</div>
                          </td>
                          <td className="px-3 py-3">{row.currentStage}</td>
                          <td className="px-3 py-3">{formatDate(row.projectedCompletion)}</td>
                          <td className="px-3 py-3">{formatDate(row.forecastCompletion)}</td>
                          <td className="px-3 py-3">
                            <Pill tone={varianceTone(row.forecastDaysLate)}>
                              {formatVariance(row.forecastDaysLate)}
                            </Pill>
                          </td>
                          <td className="px-3 py-3">
                            <Pill tone={meta.tone}>{meta.label}</Pill>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{row.recommendation.action}</td>
                          <td className="px-3 py-3">
                            {row.recommendation.impact > 0 ? (
                              <span className="font-medium text-emerald-600">
                                -{row.recommendation.impact}d
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {row.recommendation.impact > 0
                              ? formatDate(row.improvedCompletion)
                              : formatDate(row.projectedCompletion)}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => applySingleRecommendation(row)}
                              disabled={row.recommendation.impact === 0}
                              className={`rounded-xl px-3 py-2 text-xs ${
                                row.recommendation.impact > 0
                                  ? "bg-slate-900 text-white hover:bg-slate-800"
                                  : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                              }`}
                            >
                              Apply
                            </button>
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
            {currentSelected ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-slate-900">
                      {currentSelected.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {currentSelected.market} • {currentSelected.currentStage}
                    </div>
                  </div>

                  <Pill tone={currentSelected.forecastRiskBand.tone}>
                    {currentSelected.forecastRiskBand.label}
                  </Pill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">ECD</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatDate(currentSelected.projectedCompletion)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Forecast Completion
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatDate(currentSelected.forecastCompletion)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-emerald-700">
                      Improved ECD
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatDate(currentSelected.improvedCompletion)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Confidence
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-2xl font-semibold text-slate-900">
                        {currentSelected.forecastConfidence}%
                      </div>
                      <Pill tone={confidenceMeta.tone}>{confidenceMeta.label}</Pill>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Best Next Action</div>
                  <div className="mt-2 text-base text-slate-800">
                    {currentSelected.recommendation.action}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Expected impact:{" "}
                    <span className="font-medium text-emerald-700">
                      -{currentSelected.recommendation.impact}d
                    </span>{" "}
                    to modeled delay
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => applySingleRecommendation(currentSelected)}
                      disabled={currentSelected.recommendation.impact === 0}
                      className={`rounded-xl px-4 py-2 text-sm ${
                        currentSelected.recommendation.impact > 0
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                      }`}
                    >
                      Apply recommendation
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900">Forecast Insight</div>
                  <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                    {currentSelected.forecastInsight}
                  </div>
                </div>
              </>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Scenario Simulator</div>
            <div className="mt-1 text-sm text-slate-500">
              Toggle interventions to see how operator action changes the forecast.
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-700">Resolve blockers</span>
                <input
                  type="checkbox"
                  checked={resolveBlockers}
                  onChange={(e) => setResolveBlockers(e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-700">Assign / tighten vendor path</span>
                <input
                  type="checkbox"
                  checked={assignVendor}
                  onChange={(e) => setAssignVendor(e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-700">Expedite approval</span>
                <input
                  type="checkbox"
                  checked={expediteApproval}
                  onChange={(e) => setExpediteApproval(e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-700">Compress schedule</span>
                <input
                  type="checkbox"
                  checked={compressSchedule}
                  onChange={(e) => setCompressSchedule(e.target.checked)}
                />
              </label>
            </div>

            {scenario ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Simulated Outcome</div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      New Forecast
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatDate(scenario.forecastCompletion)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Days Saved
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {scenario.daysSaved}d
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  New variance:{" "}
                  <span className="font-medium text-slate-900">
                    {formatVariance(scenario.forecastDaysLate)}
                  </span>{" "}
                  • Confidence{" "}
                  <span className="font-medium text-slate-900">
                    {scenario.confidence}%
                  </span>
                </div>

                {!!scenario.actions.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {scenario.actions.map((action) => (
                      <div
                        key={action}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                      >
                        {action}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5">
                  <button
                    onClick={applyScenario}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  >
                    Apply scenario to turn
                  </button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">
              Portfolio Delay Distribution
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Forecasted slippage by turn, ranked from highest to lowest exposure.
            </div>

            <div className="mt-5 space-y-4">
              {forecastRows
                .slice()
                .sort((a, b) => b.forecastDaysLate - a.forecastDaysLate)
                .map((row) => (
                  <div key={row.id}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.forecastDaysLate}d variance • {row.forecastConfidence}% confidence • recommendation saves {row.daysSaved}d
                      </div>
                    </div>

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
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}