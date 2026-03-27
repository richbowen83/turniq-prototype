"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { getSeverityTone } from "../../utils/tone";
import {
  formatShortDate,
  getDailyRentValue,
  getRentSourceLabel,
  getRevenueProtected,
} from "../../utils/economics";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  date.setDate(date.getDate() + days);
  return formatDate(date.toISOString());
}

function scenarioTone(name) {
  if (name === "Optimized Case") return "green";
  if (name === "Worst Case") return "red";
  return "slate";
}

function getScenarioDelay(row, scenario) {
  const base = row.daysInStage || 0;

const isFailedRentReady = row.currentStage === "Failed Rent Ready";

  if (scenario === "Base Case") return base;

  if (scenario === "Optimized Case") {
  if (isFailedRentReady) {
    return Math.max(1, base - 2);
  }
  if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
    return Math.max(0, base - 3);
  }
  if (row.turnStatus === "Blocked") {
    return Math.max(0, base - 2);
  }
  if ((row.risk || 0) >= 75) {
    return Math.max(0, base - 2);
  }
  return Math.max(0, base - 1);
}

  if (scenario === "Worst Case") {
  if (isFailedRentReady) {
    return base + 6;
  }
  if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
    return base + 5;
  }
  if (row.turnStatus === "Blocked") {
    return base + 4;
  }
  if ((row.risk || 0) >= 75) {
    return base + 4;
  }
  return base + 3;
}

  return base;
}

function getScenarioConfidence(row, scenario) {
  const base = row.timelineConfidence || 80;

  if (scenario === "Base Case") return Math.min(99, Math.max(35, base));
  if (scenario === "Optimized Case") return Math.min(99, Math.max(35, base + 8));
  if (scenario === "Worst Case") return Math.min(99, Math.max(35, base - 12));

  return base;
}

function getScenarioExposure(row, delayDays) {
  return Math.round(getDailyRentValue(row) * delayDays);
}

function buildDelayDrivers(row) {
  const sourceDrivers =
    Array.isArray(row.delayDrivers) && row.delayDrivers.length ? row.delayDrivers : [];

  if (sourceDrivers.length) {
    return sourceDrivers.map((driver) => ({
      label: driver.label,
      days: driver.days || 0,
    }));
  }

  const derived = [];

  if (row.currentStage === "Failed Rent Ready") {
    derived.push({ label: "Rent ready failure rework", days: 3 });
  }

  if (row.turnStatus === "Blocked") derived.push({ label: "Blocked workflow", days: 2 });
  if (row.currentStage === "Owner Approval") {
    derived.push({ label: "Owner approval delay", days: 2 });
  }
  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))) {
    derived.push({ label: "Appliance ETA", days: 1 });
  }
  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("trade"))) {
    derived.push({ label: "Trade coordination", days: 1 });
  }
  if ((row.risk || 0) >= 75) derived.push({ label: "Execution risk buffer", days: 1 });

  return derived.length ? derived : [{ label: "Routine variance", days: 1 }];
}

function buildScenarioModel(row) {
  const baseDelay = getScenarioDelay(row, "Base Case");
  const optimizedDelay = getScenarioDelay(row, "Optimized Case");
  const worstDelay = getScenarioDelay(row, "Worst Case");

  const base = {
    name: "Base Case",
    delayDays: baseDelay,
    completion: addDays(row.projectedCompletion, baseDelay),
    confidence: getScenarioConfidence(row, "Base Case"),
    exposure: getScenarioExposure(row, baseDelay),
  };

  const optimized = {
    name: "Optimized Case",
    delayDays: optimizedDelay,
    completion: addDays(row.projectedCompletion, optimizedDelay),
    confidence: getScenarioConfidence(row, "Optimized Case"),
    exposure: getScenarioExposure(row, optimizedDelay),
  };

  const worst = {
    name: "Worst Case",
    delayDays: worstDelay,
    completion: addDays(row.projectedCompletion, worstDelay),
    confidence: getScenarioConfidence(row, "Worst Case"),
    exposure: getScenarioExposure(row, worstDelay),
  };

  const delayDrivers = buildDelayDrivers(row);

  return {
  base,
  optimized,
  worst,
  delayDrivers,
  protectedRevenue: Math.max(0, base.exposure - optimized.exposure),
  daysSaved: Math.max(0, base.delayDays - optimized.delayDays),
  rentSourceLabel: getRentSourceLabel(row),
  dailyRentValue: getDailyRentValue(row),
  failedReadyPenalty:
    row.currentStage === "Failed Rent Ready"
      ? getRevenueProtected(3, row)
      : 0,
};
}

function buildPortfolioSummary(properties) {
  const models = properties.map(buildScenarioModel);

  const baseDelay = models.reduce((sum, model) => sum + model.base.delayDays, 0);
  const optimizedDelay = models.reduce((sum, model) => sum + model.optimized.delayDays, 0);
  const daysSaved = Math.max(0, baseDelay - optimizedDelay);
  const avgConfidence = properties.length
    ? Math.round(models.reduce((sum, model) => sum + model.optimized.confidence, 0) / properties.length)
    : 0;
  const revenueAtRisk = models.reduce((sum, model) => sum + model.base.exposure, 0);
  const protectedRevenue = models.reduce((sum, model) => sum + model.protectedRevenue, 0);

  return {
    baseDelay,
    optimizedDelay,
    daysSaved,
    avgConfidence,
    revenueAtRisk,
    protectedRevenue,
  };
}

function buildScenarioQueue(properties) {
  return properties
    .map((row) => {
      const scenario = buildScenarioModel(row);
      return {
        ...row,
        scenario,
        protectedRevenue: scenario.protectedRevenue,
      };
    })
    .sort((a, b) => b.protectedRevenue - a.protectedRevenue);
}

function getRecommendation(row, scenario) {
  if (!row) return null;

if (row.currentStage === "Failed Rent Ready") {
  return {
    title: "Resolve rework and re-certify rent readiness",
    why: "The home failed rent ready and now carries direct rework delay and avoidable vacancy exposure.",
    outcome: `Optimized case protects ~$${scenario.protectedRevenue.toLocaleString()} and improves ECD by ${scenario.daysSaved}d.`,
    severity: "High",
  };
}

  if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
    return {
      title: "Escalate owner approval and remove blocker",
      why: "Owner approval delay is materially extending the modeled completion timeline.",
      outcome: `Optimized case protects ~$${scenario.protectedRevenue.toLocaleString()} and improves ECD by ${scenario.daysSaved}d.`,
      severity: "High",
    };
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))) {
    return {
      title: "Switch or expedite appliance vendor",
      why: "Appliance timing is driving forecasted slippage and revenue exposure.",
      outcome: `Optimized case protects ~$${scenario.protectedRevenue.toLocaleString()} and improves ECD by ${scenario.daysSaved}d.`,
      severity: "Moderate",
    };
  }

  if ((row.risk || 0) >= 75) {
    return {
      title: "Compress stage time with operator intervention",
      why: "Risk and delay profile suggest a widening gap between base and optimized outcomes.",
      outcome: `Optimized case protects ~$${scenario.protectedRevenue.toLocaleString()} and improves ECD by ${scenario.daysSaved}d.`,
      severity: "Moderate",
    };
  }

  return {
    title: "Maintain active monitoring",
    why: "Trajectory is manageable, but light intervention still improves confidence and timing.",
    outcome: `Optimized case protects ~$${scenario.protectedRevenue.toLocaleString()} and improves ECD by ${scenario.daysSaved}d.`,
    severity: "Low",
  };
}

const ACTION_LEARNING_STORAGE_KEY = "turniq_action_learning_v1";

export default function ForecastTab({
  mode = "operator",
  selectedProperty,
  properties,
  setSelectedPropertyId,
  applyForecastPatch,
  applyForecastBatch,
  undoLastForecastAction,
  canUndoForecastAction,
  lastForecastUndoLabel,
}) {
  const [activeScenario, setActiveScenario] = useState("Optimized Case");
  const [actionLearningLog, setActionLearningLog] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTION_LEARNING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setActionLearningLog(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load action learning log", error);
    }
  }, []);

  const portfolio = useMemo(() => buildPortfolioSummary(properties), [properties]);
  const scenarioQueue = useMemo(() => buildScenarioQueue(properties), [properties]);

  const forecastTarget = selectedProperty || scenarioQueue[0] || null;
  const scenarioModel = useMemo(
    () => (forecastTarget ? buildScenarioModel(forecastTarget) : null),
    [forecastTarget]
  );
  const recommendation = useMemo(
    () => (forecastTarget && scenarioModel ? getRecommendation(forecastTarget, scenarioModel) : null),
    [forecastTarget, scenarioModel]
  );

  const recommendationSignal = useMemo(() => {
    if (!recommendation || !forecastTarget) return null;

    const matches = actionLearningLog.filter(
      (entry) =>
        entry.stage === forecastTarget.currentStage ||
        entry.actionLabel === recommendation.title
    );

    const uses = matches.length;
    const totalDaysSaved = matches.reduce((sum, entry) => sum + (entry.daysSaved || 0), 0);
    const totalRevenueProtected = matches.reduce(
      (sum, entry) => sum + (entry.revenueProtected || 0),
      0
    );

    return {
      uses,
      totalDaysSaved,
      totalRevenueProtected,
    };
  }, [actionLearningLog, recommendation, forecastTarget]);

  const activeScenarioData =
    activeScenario === "Base Case"
      ? scenarioModel?.base
      : activeScenario === "Worst Case"
      ? scenarioModel?.worst
      : scenarioModel?.optimized;

  const kpis = [
    {
      title: "Base Delay",
      value: `${portfolio.baseDelay}d`,
      subtitle: "Current modeled portfolio slippage",
    },
    {
      title: "Optimized Delay",
      value: `${portfolio.optimizedDelay}d`,
      subtitle: "If best actions are executed",
    },
    {
      title: "Days Saved",
      value: `${portfolio.daysSaved}d`,
      subtitle: "Optimized vs base case",
    },
    {
      title: "Avg Confidence",
      value: `${portfolio.avgConfidence}%`,
      subtitle: "Average timeline confidence",
    },
    {
      title: "Revenue at Risk",
      value: `$${portfolio.revenueAtRisk.toLocaleString()}`,
      subtitle: "Based on imported rent where available, otherwise market fallback",
    },
    {
      title: "$ Protected",
      value: `$${portfolio.protectedRevenue.toLocaleString()}`,
      subtitle: "If optimized plan is committed",
    },
  ];

  function commitOptimizedPlan() {
    const topRows = scenarioQueue.slice(0, 5);

    const patches = topRows.map((row) => ({
      id: row.id,
      patch: {
        daysInStage: row.scenario.optimized.delayDays,
        timelineConfidence: row.scenario.optimized.confidence,
        projectedCompletion:
          row.lastAction?.nextECD || row.projectedCompletion,
        risk: Math.max(20, (row.risk || 0) - Math.min(12, row.scenario.daysSaved * 2)),
      },
    }));

    applyForecastBatch(patches, "Commit optimized forecast plan to top 5 turns");
  }

  function commitSingleOptimized(row) {
    applyForecastPatch(
      row.id,
      {
        daysInStage: row.scenario.optimized.delayDays,
        timelineConfidence: row.scenario.optimized.confidence,
        risk: Math.max(20, (row.risk || 0) - Math.min(10, row.scenario.daysSaved * 2)),
      },
      `Commit optimized scenario for ${row.name}`
    );
  }

  function stressTestSingle(row) {
    applyForecastPatch(
      row.id,
      {
        daysInStage: row.scenario.worst.delayDays,
        timelineConfidence: row.scenario.worst.confidence,
        risk: Math.min(99, (row.risk || 0) + 8),
      },
      `Stress test worst-case scenario for ${row.name}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            Compare base, optimized, and downside scenarios before committing portfolio actions.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="slate">{properties.length} turns modeled</Pill>
          <button
            onClick={commitOptimizedPlan}
            className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
          >
            Commit optimized plan
          </button>
          <button
            onClick={undoLastForecastAction}
            disabled={!canUndoForecastAction}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              canUndoForecastAction
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300"
            }`}
          >
            Undo
          </button>
        </div>
      </div>

      {canUndoForecastAction && lastForecastUndoLabel ? (
        <Card>
          <div className="text-sm text-slate-600">
            Last forecast action:{" "}
            <span className="font-medium text-slate-900">{lastForecastUndoLabel}</span>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <div className="text-xs uppercase tracking-wide text-slate-500">{kpi.title}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value}</div>
            <div className="mt-1 text-sm text-slate-500">{kpi.subtitle}</div>
          </Card>
        ))}
      </div>

      {forecastTarget?.lastAction ? (
        <Card>
          <div className="text-xl font-semibold text-slate-900">Recent Action Impact</div>
          <div className="mt-3 text-sm text-slate-700">
            <span className="font-medium">{forecastTarget.name}</span> last moved from{" "}
            <span className="font-medium">
              {formatShortDate(forecastTarget.lastAction.prevECD)}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {formatShortDate(forecastTarget.lastAction.nextECD)}
            </span>
            , saving {forecastTarget.lastAction.daysRecovered} days and protecting $
            {forecastTarget.lastAction.revenueProtected || 0}.
          </div>
        </Card>
      ) : null}

      {forecastTarget && scenarioModel ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                Scenario Comparison — {forecastTarget.name}
              </div>
              <div className="text-xs text-slate-400">
  {scenarioModel.rentSourceLabel} • ${scenarioModel.dailyRentValue}/day
</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Base Case", "Optimized Case", "Worst Case"].map((scenario) => (
                <button
                  key={scenario}
                  onClick={() => setActiveScenario(scenario)}
                  className={`rounded-xl px-4 py-2 text-sm ${
                    activeScenario === scenario
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {scenario}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[scenarioModel.base, scenarioModel.optimized, scenarioModel.worst].map((scenario) => (
              <div
                key={scenario.name}
                className={`rounded-2xl border p-5 ${
                  scenario.name === activeScenario
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xl font-semibold text-slate-900">{scenario.name}</div>
                  <Pill tone={scenarioTone(scenario.name)}>+{scenario.delayDays}d</Pill>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="text-sm text-slate-500">Forecast Completion</div>
                    <div className="text-lg font-semibold text-slate-900">{scenario.completion}</div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500">Confidence</div>
                    <div className="text-lg font-semibold text-slate-900">{scenario.confidence}%</div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500">Revenue Exposure</div>
                    <div className="text-lg font-semibold text-slate-900">
                      ${scenario.exposure.toLocaleString()}
                    </div>

                    <div className="text-xs text-slate-400">
  {scenarioModel.rentSourceLabel} • ${scenarioModel.dailyRentValue}/day
</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="text-2xl font-semibold text-slate-900">Portfolio Scenario Distribution</div>
        <div className="mt-1 text-sm text-slate-500">
          Compare how much downside can be removed under optimized execution.
        </div>

        <div className="mt-6 space-y-8">
          {scenarioQueue.slice(0, 3).map((row) => {
            const maxDelay = Math.max(row.scenario.worst.delayDays, 1);
            const basePct = (row.scenario.base.delayDays / maxDelay) * 100;
            const optimizedPct = (row.scenario.optimized.delayDays / maxDelay) * 100;
            const worstPct = (row.scenario.worst.delayDays / maxDelay) * 100;

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="font-medium text-slate-900">{row.name}</div>
                  <div className="text-sm text-slate-500">
                    {row.scenario.rentSourceLabel} • ${row.scenario.dailyRentValue}/day
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-1 text-sm text-slate-500">Base Case</div>
                    <div className="h-4 rounded-full bg-slate-100">
                      <div className="h-4 rounded-full bg-red-500" style={{ width: `${basePct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-slate-500">Optimized Case</div>
                    <div className="h-4 rounded-full bg-slate-100">
                      <div className="h-4 rounded-full bg-emerald-500" style={{ width: `${optimizedPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-slate-500">Worst Case</div>
                    <div className="h-4 rounded-full bg-slate-100">
                      <div className="h-4 rounded-full bg-red-500" style={{ width: `${worstPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card>
            <div className="text-2xl font-semibold text-slate-900">Scenario Queue</div>
            <div className="mt-1 text-sm text-slate-500">
              Each row shows base case plus optimized and worst-case alternatives.
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1040px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Property</th>
                    <th className="px-4 py-3 font-medium">Base</th>
                    <th className="px-4 py-3 font-medium">Optimized</th>
                    <th className="px-4 py-3 font-medium">Worst</th>
                    <th className="px-4 py-3 font-medium">$ Protected</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioQueue.slice(0, 6).map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-slate-100 ${
                        forecastTarget?.id === row.id ? "bg-slate-50" : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <button onClick={() => setSelectedPropertyId(row.id)} className="text-left">
                          <div className="font-medium text-blue-700 hover:underline">{row.name}</div>
                        </button>
                        <div className="mt-1 text-sm text-slate-500">
  {row.market} • {row.currentStage}
</div>
<div className="text-xs text-slate-400">
  {row.scenario.rentSourceLabel} • ${row.scenario.dailyRentValue}/day
</div>
{row.currentStage === "Failed Rent Ready" ? (
  <div className="text-xs text-rose-600">
    Rework required • ${row.scenario.failedReadyPenalty.toLocaleString()} signal
  </div>
) : null}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{row.scenario.base.completion}</div>
                        <div className="mt-1">
                          <Pill tone="red">+{row.scenario.base.delayDays}d</Pill>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{row.scenario.optimized.completion}</div>
                        <div className="mt-1">
                          <Pill tone="green">+{row.scenario.optimized.delayDays}d</Pill>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{row.scenario.worst.completion}</div>
                        <div className="mt-1">
                          <Pill tone="red">+{row.scenario.worst.delayDays}d</Pill>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-xl font-semibold text-slate-900">
                          ${row.protectedRevenue.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex w-[130px] flex-col gap-1.5">
                          <button
                            onClick={() => commitSingleOptimized(row)}
                            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            Commit optimized
                          </button>
                          <button
                            onClick={() => stressTestSingle(row)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Stress test
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-6">
          {forecastTarget && scenarioModel && recommendation ? (
            <>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">{forecastTarget.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {forecastTarget.market} • {forecastTarget.currentStage}
                    </div>
                  </div>
                  <Pill tone={getSeverityTone(recommendation.severity)}>
                    {recommendation.severity}
                  </Pill>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Active Scenario</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">{activeScenario}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Forecast Completion</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {activeScenarioData?.completion}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Variance</div>
                    <div className="mt-2">
                      <Pill tone={scenarioTone(activeScenario)}>+{activeScenarioData?.delayDays}d</Pill>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Revenue Exposure</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      ${activeScenarioData?.exposure.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="text-xl font-semibold text-slate-900">Recommended Action</div>
                <div className="mt-4 space-y-3">
                  <div className="text-base font-medium text-slate-900">{recommendation.title}</div>
                  <div className="text-sm text-slate-600">Why: {recommendation.why}</div>
                  <div className="text-sm text-slate-600">{recommendation.outcome}</div>
{recommendationSignal && recommendationSignal.uses > 0 ? (
  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="text-xs uppercase tracking-wide text-slate-500">
      Observed Action Signal
    </div>
    <div className="mt-2 text-sm text-slate-700">
      Similar interventions have been used {recommendationSignal.uses} times, recovering{" "}
      {recommendationSignal.totalDaysSaved} days and protecting $
      {recommendationSignal.totalRevenueProtected.toLocaleString()}.
    </div>
  </div>
) : null}
                </div>
              </Card>

      {forecastTarget.currentStage === "Failed Rent Ready" ? (
  <Card>
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <div className="text-xs uppercase tracking-wide text-rose-700">
        Rework Cost Signal
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-900">
        ${scenarioModel.failedReadyPenalty.toLocaleString()}
      </div>
      <div className="mt-1 text-sm text-rose-700">
        Estimated value at risk from failed-ready rework
      </div>
    </div>
  </Card>
) : null}

              <Card>
                <div className="text-xl font-semibold text-slate-900">Delay Driver Breakdown</div>
                <div className="mt-1 text-sm text-slate-500">
                  Modeled contributors to the current forecast delay.
                </div>

                <div className="mt-4 space-y-3">
                  {scenarioModel.delayDrivers.map((driver) => (
                    <div
                      key={driver.label}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="text-sm text-slate-700">{driver.label}</div>
                      <Pill tone="amber">+{driver.days}d</Pill>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div className="text-sm text-slate-500">
                Select a property to view scenario recommendations.
              </div>
            </Card>
          )}

          <Card>
            <div className="text-xl font-semibold text-slate-900">
              {mode === "presentation" ? "Presentation Narrative" : "Forecast Notes"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {mode === "presentation"
                ? "A narrative layer for demos and stakeholder storytelling."
                : "Operational interpretation of the current forecast position."}
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                The current base case models <span className="font-medium">{portfolio.baseDelay}d</span> of portfolio
                delay and <span className="font-medium">${portfolio.revenueAtRisk.toLocaleString()}</span> of rent
                exposure.
              </div>
              <div>
                Executing the optimized plan reduces delay to{" "}
                <span className="font-medium">{portfolio.optimizedDelay}d</span> and protects approximately{" "}
                <span className="font-medium">${portfolio.protectedRevenue.toLocaleString()}</span>.
              </div>
              <div>
                The largest opportunities are concentrated in blocked, approval-dependent, and high-risk turns where
                scenario spread is widest.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}