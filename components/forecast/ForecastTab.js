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

function buildForecast(property) {
  const blockers = getLiveBlockers(property.blockers);
  const riskDelay = getRiskDelay(property.risk);
  const stageDelay = getStageDelay(property.currentStage);
  const blockerDelay = blockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);
  const forecastDaysLate = riskDelay + stageDelay + blockerDelay;
  const forecastCompletion = addDays(property.projectedCompletion, forecastDaysLate);
  const forecastConfidence = Math.max(
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

  const forecastRows = useMemo(
    () =>
      properties.map((property) => ({
        ...property,
        ...buildForecast(property),
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

  const summary = useMemo(() => {
    const total = forecastRows.length || 1;
    const totalDaysAtRisk = forecastRows.reduce((sum, row) => sum + row.forecastDaysLate, 0);
    const avgDelay = Number((totalDaysAtRisk / total).toFixed(1));
    const onTime = forecastRows.filter((row) => row.forecastDaysLate === 0).length;
    const atRisk = forecastRows.filter((row) => row.forecastDaysLate >= 2).length;
    const highDelay = forecastRows.filter((row) => row.forecastDaysLate >= 4).length;

    return {
      avgDelay,
      onTimePct: Math.round((onTime / total) * 100),
      atRisk,
      highDelay,
      totalDaysAtRisk,
    };
  }, [forecastRows]);

  const maxDelay = Math.max(...forecastRows.map((row) => row.forecastDaysLate), 1);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            Project actual rent-ready outcomes, understand delay drivers, and model operator interventions before slippage happens.
          </div>
        </div>

        <Pill tone="blue">{forecastRows.length} turns modeled</Pill>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Forecast Delay</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avgDelay}d</div>
          <div className="mt-1 text-sm text-slate-500">Average modeled variance to ECD</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">On-Time Forecast</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.onTimePct}%</div>
          <div className="mt-1 text-sm text-slate-500">Turns with no modeled delay</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">At-Risk Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.atRisk}</div>
          <div className="mt-1 text-sm text-slate-500">Forecasted 2+ days late</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Days At Risk</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {summary.totalDaysAtRisk}
          </div>
          <div className="mt-1 text-sm text-slate-500">Total modeled portfolio slippage</div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Forecast Queue</div>
            <div className="mt-1 text-sm text-slate-500">
              AI-adjusted forecast versus current ECD across the active turn portfolio.
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
                    <th className="px-3 py-2 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastRows
                    .slice()
                    .sort((a, b) => b.forecastDaysLate - a.forecastDaysLate)
                    .map((row) => (
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
                        <td className="px-3 py-3">{row.forecastConfidence}%</td>
                        <td className="px-3 py-3">
                          <div className="w-[120px] rounded-full bg-slate-100">
                            <div
                              className={`h-2 rounded-full ${
                                row.forecastDaysLate >= 4
                                  ? "bg-red-500"
                                  : row.forecastDaysLate >= 2
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.max(
                                  8,
                                  (row.forecastDaysLate / maxDelay) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
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

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Delay Variance
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatVariance(currentSelected.forecastDaysLate)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Confidence
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {currentSelected.forecastConfidence}%
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900">Forecast Insight</div>
                  <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                    {currentSelected.forecastInsight}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900">
                    Primary Delay Drivers
                  </div>
                  <div className="mt-3 space-y-3">
                    {currentSelected.forecastDelayDrivers.map((driver) => (
                      <div
                        key={`${driver.label}-${driver.days}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <div className="text-sm text-slate-700">{driver.label}</div>
                        <div className="text-sm font-medium text-slate-900">+{driver.days}d</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-900">
                    Recommended Actions
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getRecommendedActions(currentSelected).map((rec) => (
                      <div
                        key={rec.label}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                      >
                        {rec.label}
                        {rec.savings > 0 ? ` • saves ~${rec.savings}d` : ""}
                      </div>
                    ))}
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
                        {row.forecastDaysLate}d variance • {row.forecastConfidence}% confidence
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