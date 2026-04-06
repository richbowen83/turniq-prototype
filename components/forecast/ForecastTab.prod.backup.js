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
  shiftDate,
} from "../../utils/economics";

const ACTION_LEARNING_STORAGE_KEY = "turniq_action_learning_v1";

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
    if (isFailedRentReady) return Math.max(1, base - 2);
    if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
      return Math.max(0, base - 3);
    }
    if (row.turnStatus === "Blocked") return Math.max(0, base - 2);
    if ((row.risk || 0) >= 75) return Math.max(0, base - 2);
    return Math.max(0, base - 1);
  }

  if (scenario === "Worst Case") {
    if (isFailedRentReady) return base + 6;
    if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
      return base + 5;
    }
    if (row.turnStatus === "Blocked") return base + 4;
    if ((row.risk || 0) >= 75) return base + 4;
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

  if ((row.risk || 0) >= 75) {
    derived.push({ label: "Execution risk buffer", days: 1 });
  }

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
      row.currentStage === "Failed Rent Ready" ? getRevenueProtected(3, row) : 0,
  };
}

function buildPortfolioSummary(properties) {
  const models = properties.map(buildScenarioModel);

  const baseDelay = models.reduce((sum, model) => sum + model.base.delayDays, 0);
  const optimizedDelay = models.reduce((sum, model) => sum + model.optimized.delayDays, 0);
  const worstDelay = models.reduce((sum, model) => sum + model.worst.delayDays, 0);
  const daysSaved = Math.max(0, baseDelay - optimizedDelay);

  const avgConfidence = properties.length
    ? Math.round(
        models.reduce((sum, model) => sum + model.optimized.confidence, 0) / properties.length
      )
    : 0;

  const revenueAtRisk = models.reduce((sum, model) => sum + model.base.exposure, 0);
  const protectedRevenue = models.reduce((sum, model) => sum + model.protectedRevenue, 0);

  return {
    baseDelay,
    optimizedDelay,
    worstDelay,
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

function getExecHeadline(portfolio, scenarioQueue) {
  const top = scenarioQueue[0];
  if (!top) {
    return "Portfolio forecast is stable with no meaningful modeled intervention currently required.";
  }

  return `The current forecast shows ${portfolio.baseDelay} modeled delay-days across the portfolio, with approximately $${portfolio.revenueAtRisk.toLocaleString()} of rent exposure. The highest-leverage intervention is ${top.name}, where the optimized scenario protects $${top.protectedRevenue.toLocaleString()}.`;
}

function getSimulatorActionOptions() {
  return [
    {
      id: "clear_blocked",
      label: "Clear blocked turns",
      description: "Recover 2 days per blocked turn",
    },
    {
      id: "accelerate_approvals",
      label: "Accelerate approvals",
      description: "Recover 2 days per Owner Approval turn",
    },
    {
      id: "recover_failed_ready",
      label: "Recover failed rent ready",
      description: "Recover 3 days per failed-ready turn",
    },
    {
      id: "compress_over_sla",
      label: "Compress over-SLA stage time",
      description: "Recover up to 2 days per over-SLA turn",
    },
  ];
}

function getSimulatedRecoveryForRow(row, selectedActions) {
  let recoveredDays = 0;

  if (selectedActions.includes("clear_blocked") && row.turnStatus === "Blocked") {
    recoveredDays += 2;
  }

  if (
    selectedActions.includes("accelerate_approvals") &&
    row.currentStage === "Owner Approval"
  ) {
    recoveredDays += 2;
  }

  if (
    selectedActions.includes("recover_failed_ready") &&
    row.currentStage === "Failed Rent Ready"
  ) {
    recoveredDays += 3;
  }

  if (selectedActions.includes("compress_over_sla")) {
    const stageSla =
      row.currentStage === "Failed Rent Ready"
        ? 0
        : row.currentStage === "Dispatch"
        ? 2
        : row.currentStage === "Owner Approval"
        ? 3
        : row.currentStage === "Move Out Inspection"
        ? 2
        : 3;

    const overSlaDays = Math.max(0, (row.daysInStage || 0) - stageSla);
    recoveredDays += Math.min(2, overSlaDays);
  }

  const scenario = buildScenarioModel(row);
  const cap = Math.max(0, scenario.base.delayDays);
  const finalRecoveredDays = Math.min(recoveredDays, cap);

  return {
    recoveredDays: finalRecoveredDays,
    revenueProtected: getRevenueProtected(finalRecoveredDays, row),
    nextCompletion:
      finalRecoveredDays > 0
        ? shiftDate(row.projectedCompletion, -finalRecoveredDays)
        : row.projectedCompletion,
  };
}

function buildPortfolioDelaySimulation(properties, selectedActions) {
  const impactedTurns = properties
    .map((row) => {
      const recovery = getSimulatedRecoveryForRow(row, selectedActions);
      return {
        ...row,
        simulatedRecoveredDays: recovery.recoveredDays,
        simulatedRevenueProtected: recovery.revenueProtected,
        simulatedCompletion: recovery.nextCompletion,
      };
    })
    .filter((row) => row.simulatedRecoveredDays > 0)
    .sort(
      (a, b) =>
        b.simulatedRevenueProtected - a.simulatedRevenueProtected ||
        b.simulatedRecoveredDays - a.simulatedRecoveredDays
    );

  const totalRecoveredDays = impactedTurns.reduce(
    (sum, row) => sum + row.simulatedRecoveredDays,
    0
  );

  const totalRevenueProtected = impactedTurns.reduce(
    (sum, row) => sum + row.simulatedRevenueProtected,
    0
  );

  return {
    impactedTurns,
    totalRecoveredDays,
    totalRevenueProtected,
  };
}

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
  const [selectedSimulatorActions, setSelectedSimulatorActions] = useState([]);

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
  const simulatorActionOptions = useMemo(() => getSimulatorActionOptions(), []);
  const portfolioSimulation = useMemo(
    () => buildPortfolioDelaySimulation(properties, selectedSimulatorActions),
    [properties, selectedSimulatorActions]
  );

  const isExecMode = mode === "exec";
  const isPresentationMode = mode === "presentation";

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

  const execHeadline = useMemo(
    () => getExecHeadline(portfolio, scenarioQueue),
    [portfolio, scenarioQueue]
  );

  const simulatedPortfolioDelay = Math.max(
    0,
    portfolio.baseDelay - portfolioSimulation.totalRecoveredDays
  );

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
      title: "Worst Delay",
      value: `${portfolio.worstDelay}d`,
      subtitle: "Stress case portfolio downside",
    },
    {
      title: "Days Saved",
      value: `${portfolio.daysSaved}d`,
      subtitle: "Optimized vs base case",
    },
    {
      title: "Revenue at Risk",
      value: `$${portfolio.revenueAtRisk.toLocaleString()}`,
      subtitle: "Imported rent when available, otherwise market fallback",
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
        projectedCompletion: row.lastAction?.nextECD || row.projectedCompletion,
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

  function toggleSimulatorAction(actionId) {
    setSelectedSimulatorActions((prev) =>
      prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId]
    );
  }

  function applyPortfolioSimulatorPlan() {
    if (!portfolioSimulation.impactedTurns.length) return;

    const patches = portfolioSimulation.impactedTurns.map((row) => ({
      id: row.id,
      patch: {
        daysInStage: Math.max(0, (row.daysInStage || 0) - row.simulatedRecoveredDays),
        projectedCompletion: row.simulatedCompletion,
        risk: Math.max(20, (row.risk || 0) - Math.min(10, row.simulatedRecoveredDays * 2)),
      },
    }));

    applyForecastBatch(
      patches,
      `Apply portfolio delay simulator plan (${selectedSimulatorActions.length} levers)`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            {isExecMode
              ? "Portfolio-level scenario intelligence for operating and executive decisions."
              : "Compare base, optimized, and downside scenarios before committing portfolio actions."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="slate">{properties.length} turns modeled</Pill>
          {!isExecMode ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      {isExecMode ? (
        <Card>
          <div className="text-xl font-semibold text-slate-900">Executive Readout</div>
          <div className="mt-3 text-sm leading-6 text-slate-700">{execHeadline}</div>
        </Card>
      ) : null}

      {!isExecMode && canUndoForecastAction && lastForecastUndoLabel ? (
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

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Portfolio Delay Simulator</div>
            <div className="mt-1 text-sm text-slate-500">
              Simulate portfolio-wide delay recovery levers before committing a forecast plan.
            </div>
          </div>
          <Pill tone="blue">{selectedSimulatorActions.length} levers selected</Pill>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <div className="space-y-3">
              {simulatorActionOptions.map((action) => (
                <label
                  key={action.id}
                  className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSimulatorActions.includes(action.id)}
                      onChange={() => toggleSimulatorAction(action.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{action.label}</div>
                      <div className="mt-1 text-sm text-slate-500">{action.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Current Delay
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {portfolio.baseDelay}d
                </div>
                <div className="mt-1 text-sm text-slate-500">Base case delay</div>
              </Card>

              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Simulated Delay
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {simulatedPortfolioDelay}d
                </div>
                <div className="mt-1 text-sm text-slate-500">After selected levers</div>
              </Card>

              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Days Recovered
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {portfolioSimulation.totalRecoveredDays}d
                </div>
                <div className="mt-1 text-sm text-slate-500">Modeled portfolio lift</div>
              </Card>

              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Revenue Protected
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  ${portfolioSimulation.totalRevenueProtected.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-slate-500">Based on current rent signals</div>
              </Card>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-700">
                {portfolioSimulation.totalRecoveredDays > 0 ? (
                  <>
                    The selected plan reduces portfolio delay from{" "}
                    <span className="font-medium">{portfolio.baseDelay}d</span> to{" "}
                    <span className="font-medium">{simulatedPortfolioDelay}d</span> and protects
                    approximately{" "}
                    <span className="font-medium">
                      ${portfolioSimulation.totalRevenueProtected.toLocaleString()}
                    </span>.
                  </>
                ) : (
                  <>
                    Select one or more recovery levers to simulate the portfolio effect before
                    applying the plan.
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={applyPortfolioSimulatorPlan}
                disabled={!portfolioSimulation.impactedTurns.length}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  portfolioSimulation.impactedTurns.length
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300"
                }`}
              >
                Apply Portfolio Plan
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Current Delay</th>
                <th className="px-4 py-3 font-medium">Recovered Days</th>
                <th className="px-4 py-3 font-medium">New ECD</th>
                <th className="px-4 py-3 font-medium">$ Protected</th>
              </tr>
            </thead>
            <tbody>
              {portfolioSimulation.impactedTurns.slice(0, 8).map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedPropertyId(row.id)}
                      className="text-left"
                    >
                      <div className="font-medium text-blue-700 hover:underline">{row.name}</div>
                    </button>
                    <div className="mt-1 text-xs text-slate-400">
                      {getRentSourceLabel(row)} • ${getDailyRentValue(row)}/day
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{row.currentStage}</td>
                  <td className="px-4 py-4">
                    <Pill tone="red">+{buildScenarioModel(row).base.delayDays}d</Pill>
                  </td>
                  <td className="px-4 py-4">
                    <Pill tone="green">-{row.simulatedRecoveredDays}d</Pill>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {formatShortDate(row.simulatedCompletion)}
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    ${row.simulatedRevenueProtected.toLocaleString()}
                  </td>
                </tr>
              ))}

              {!portfolioSimulation.impactedTurns.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No simulated impact yet. Select one or more recovery levers to model a portfolio plan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {!isExecMode && forecastTarget?.lastAction ? (
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
                {isExecMode
                  ? `Highest-Leverage Scenario — ${forecastTarget.name}`
                  : `Scenario Comparison — ${forecastTarget.name}`}
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
        <div className="text-2xl font-semibold text-slate-900">
          {isExecMode ? "Top Portfolio Scenarios" : "Portfolio Scenario Distribution"}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {isExecMode
            ? "The scenarios below show where downside can be reduced most meaningfully."
            : "Compare how much downside can be removed under optimized execution."}
        </div>

        <div className="mt-6 space-y-8">
          {scenarioQueue.slice(0, isExecMode ? 5 : 3).map((row) => {
            const maxDelay = Math.max(row.scenario.worst.delayDays, 1);
            const basePct = (row.scenario.base.delayDays / maxDelay) * 100;
            const optimizedPct = (row.scenario.optimized.delayDays / maxDelay) * 100;
            const worstPct = (row.scenario.worst.delayDays / maxDelay) * 100;

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {row.market} • {row.currentStage}
                    </div>
                  </div>
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
                      <div
                        className="h-4 rounded-full bg-emerald-500"
                        style={{ width: `${optimizedPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-slate-500">Worst Case</div>
                    <div className="h-4 rounded-full bg-slate-100">
                      <div className="h-4 rounded-full bg-red-500" style={{ width: `${worstPct}%` }} />
                    </div>
                  </div>
                </div>

                {isExecMode ? (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="text-slate-500">{row.scenario.daysSaved}d recoverable</div>
                    <div className="font-medium text-slate-900">
                      ${row.protectedRevenue.toLocaleString()}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className={isExecMode ? "xl:col-span-12" : "xl:col-span-8"}>
          <Card>
            <div className="text-2xl font-semibold text-slate-900">
              {isExecMode ? "Top Scenario Queue" : "Scenario Queue"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {isExecMode
                ? "A portfolio-ranked view of where optimized execution protects the most value."
                : "Each row shows base case plus optimized and worst-case alternatives."}
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
                    {!isExecMode ? <th className="px-4 py-3 font-medium">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {scenarioQueue.slice(0, isExecMode ? 8 : 6).map((row) => (
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

                      {!isExecMode ? (
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
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {!isExecMode ? (
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
                          Similar interventions have been used {recommendationSignal.uses} times,
                          recovering {recommendationSignal.totalDaysSaved} days and protecting $
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
                {isPresentationMode ? "Presentation Narrative" : "Forecast Notes"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {isPresentationMode
                  ? "A narrative layer for demos and stakeholder storytelling."
                  : "Operational interpretation of the current forecast position."}
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  The current base case models{" "}
                  <span className="font-medium">{portfolio.baseDelay}d</span> of portfolio
                  delay and{" "}
                  <span className="font-medium">${portfolio.revenueAtRisk.toLocaleString()}</span>{" "}
                  of rent exposure.
                </div>
                <div>
                  Executing the optimized plan reduces delay to{" "}
                  <span className="font-medium">{portfolio.optimizedDelay}d</span> and protects
                  approximately{" "}
                  <span className="font-medium">
                    ${portfolio.protectedRevenue.toLocaleString()}
                  </span>.
                </div>
                <div>
                  The largest opportunities are concentrated in blocked, approval-dependent, and
                  high-risk turns where scenario spread is widest.
                </div>
                {portfolioSimulation.totalRecoveredDays > 0 ? (
                  <div>
                    The current simulated portfolio plan recovers{" "}
                    <span className="font-medium">
                      {portfolioSimulation.totalRecoveredDays}d
                    </span>{" "}
                    and protects approximately{" "}
                    <span className="font-medium">
                      ${portfolioSimulation.totalRevenueProtected.toLocaleString()}
                    </span>.
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}