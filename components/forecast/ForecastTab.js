"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";
import {
  formatShortDate,
  getDailyRentValue,
  getRentSourceLabel,
  getRevenueProtected,
  shiftDate,
} from "../../utils/economics";

/* ----------------------------------
   Core helpers
----------------------------------- */

function getStageSla(stage) {
  if (stage === "Pre-Leasing") return 2;
  if (stage === "Pre-Move Out Inspection") return 2;
  if (stage === "Move Out Inspection") return 2;
  if (stage === "Scope Review") return 3;
  if (stage === "Owner Approval") return 3;
  if (stage === "Dispatch") return 2;
  if (stage === "Pending RRI") return 2;
  if (stage === "Rent Ready Open") return 1;
  if (stage === "Failed Rent Ready") return 3;
  return 3;
}

function getForecastRiskTone(riskBand) {
  if (riskBand === "High Risk") return "red";
  if (riskBand === "Watch") return "amber";
  return "green";
}

function getScenarioTone(name) {
  if (name === "Recovered Path") return "green";
  if (name === "Downside Path") return "red";
  return "amber";
}

function getDeltaTone(value) {
  if (value < 0) return "text-emerald-600";
  if (value > 0) return "text-red-600";
  return "text-slate-400";
}

function formatDelta(value, suffix = "") {
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/* ----------------------------------
   Forecast modeling
----------------------------------- */

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
    derived.push({ label: "Rent ready rework", days: 3 });
  }

  if (row.turnStatus === "Blocked") {
    derived.push({ label: "Blocked workflow", days: 2 });
  }

  if (row.currentStage === "Owner Approval") {
    derived.push({ label: "Owner approval delay", days: 2 });
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))) {
    derived.push({ label: "Appliance ETA", days: 2 });
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("trade"))) {
    derived.push({ label: "Trade coordination", days: 2 });
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("access"))) {
    derived.push({ label: "Access issue", days: 1 });
  }

  if ((row.risk || 0) >= 75) {
    derived.push({ label: "Execution risk buffer", days: 1 });
  }

  return derived.length ? derived : [{ label: "Routine variance", days: 1 }];
}

function getRecoveryActions(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  const overSlaDays = Math.max(0, (row.daysInStage || 0) - getStageSla(row.currentStage));
  const actions = [];

  if (row.turnStatus === "Blocked") {
    actions.push({
      id: "clear_blocker",
      label: "Clear blocker",
      category: "Execution",
      daysRecovered: 2,
    });
  }

  if (row.currentStage === "Owner Approval") {
    actions.push({
      id: "accelerate_approval",
      label: "Accelerate approval",
      category: "Approval",
      daysRecovered: 2,
    });
  }

  if (row.currentStage === "Failed Rent Ready") {
    actions.push({
      id: "recover_failed_ready",
      label: "Recover failed rent ready",
      category: "Quality",
      daysRecovered: 3,
    });
  }

  if (blockers.some((b) => String(b).toLowerCase().includes("vendor"))) {
    actions.push({
      id: "reassign_vendor",
      label: "Reassign vendor",
      category: "Vendor",
      daysRecovered: 2,
    });
  }

  if (blockers.some((b) => String(b).toLowerCase().includes("appliance"))) {
    actions.push({
      id: "expedite_appliance",
      label: "Expedite appliance",
      category: "Vendor",
      daysRecovered: 2,
    });
  }

  if (blockers.some((b) => String(b).toLowerCase().includes("access"))) {
    actions.push({
      id: "resolve_access",
      label: "Resolve access",
      category: "Access",
      daysRecovered: 1,
    });
  }

  if (overSlaDays > 0) {
    actions.push({
      id: "compress_stage_time",
      label: "Compress stage time",
      category: "Execution",
      daysRecovered: Math.min(2, overSlaDays),
    });
  }

  if (!actions.length) {
    actions.push({
      id: "maintain_monitoring",
      label: "Maintain monitoring",
      category: "Monitoring",
      daysRecovered: 0,
    });
  }

  return actions;
}

function buildScenarioModel(row) {
  const delayDrivers = buildDelayDrivers(row);
  const totalDriverDays = delayDrivers.reduce((sum, driver) => sum + (driver.days || 0), 0);
  const stageSla = getStageSla(row.currentStage);
  const stageOverage = Math.max(0, (row.daysInStage || 0) - stageSla);

  const currentDelay = Math.max(
    stageOverage,
    Math.min(8, Math.round(stageOverage + totalDriverDays * 0.5))
  );

  const actions = getRecoveryActions(row);
  const possibleRecovery = actions.reduce(
    (sum, action) => sum + (action.daysRecovered || 0),
    0
  );

  const recoveredDelay = Math.max(0, currentDelay - Math.min(currentDelay, possibleRecovery));
  const downsideDelay = currentDelay + Math.max(2, Math.ceil(totalDriverDays * 0.6));

  const currentCompletion = shiftDate(row.projectedCompletion, currentDelay);
  const recoveredCompletion = shiftDate(row.projectedCompletion, recoveredDelay);
  const downsideCompletion = shiftDate(row.projectedCompletion, downsideDelay);

  const currentExposure = getRevenueProtected(currentDelay, row);
  const recoveredExposure = getRevenueProtected(recoveredDelay, row);
  const downsideExposure = getRevenueProtected(downsideDelay, row);

  const protectedRevenue = Math.max(0, currentExposure - recoveredExposure);
  const daysSaved = Math.max(0, currentDelay - recoveredDelay);

  const riskBand =
    (row.risk || 0) >= 80 ? "High Risk" : (row.risk || 0) >= 60 ? "Watch" : "Stable";

  const topRecommendation =
    actions
      .filter((action) => action.daysRecovered > 0)
      .sort((a, b) => b.daysRecovered - a.daysRecovered)[0] || actions[0];

  return {
    stageSla,
    delayDrivers,
    actions,
    riskBand,
    rentSourceLabel: getRentSourceLabel(row),
    dailyRentValue: getDailyRentValue(row),
    topRecommendation,
    current: {
      name: "Current Path",
      delayDays: currentDelay,
      completion: currentCompletion,
      confidence: Math.max(45, Math.min(95, row.timelineConfidence || 80)),
      exposure: currentExposure,
    },
    recovered: {
      name: "Recovered Path",
      delayDays: recoveredDelay,
      completion: recoveredCompletion,
      confidence: Math.max(50, Math.min(98, (row.timelineConfidence || 80) + 8)),
      exposure: recoveredExposure,
    },
    downside: {
      name: "Downside Path",
      delayDays: downsideDelay,
      completion: downsideCompletion,
      confidence: Math.max(35, Math.min(90, (row.timelineConfidence || 80) - 12)),
      exposure: downsideExposure,
    },
    protectedRevenue,
    daysSaved,
    failedReadyPenalty:
      row.currentStage === "Failed Rent Ready" ? getRevenueProtected(3, row) : 0,
  };
}

function buildPortfolioSummary(properties) {
  const models = properties.map((row) => buildScenarioModel(row));

  const currentDelay = models.reduce((sum, model) => sum + model.current.delayDays, 0);
  const recoveredDelay = models.reduce((sum, model) => sum + model.recovered.delayDays, 0);
  const downsideDelay = models.reduce((sum, model) => sum + model.downside.delayDays, 0);
  const daysSaved = Math.max(0, currentDelay - recoveredDelay);

  const revenueAtRisk = models.reduce((sum, model) => sum + model.current.exposure, 0);
  const protectedRevenue = models.reduce((sum, model) => sum + model.protectedRevenue, 0);

  const avgConfidence = properties.length
    ? Math.round(average(models.map((model) => model.recovered.confidence)))
    : 0;

  const highRiskTurns = properties.filter((row) => (row.risk || 0) >= 80).length;

  return {
    currentDelay,
    recoveredDelay,
    downsideDelay,
    daysSaved,
    revenueAtRisk,
    protectedRevenue,
    avgConfidence,
    highRiskTurns,
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
    .sort((a, b) => {
      return (
        b.protectedRevenue - a.protectedRevenue ||
        b.scenario.daysSaved - a.scenario.daysSaved ||
        (b.risk || 0) - (a.risk || 0)
      );
    });
}

function getRecommendation(row, scenario) {
  if (!row) return null;

  if (row.currentStage === "Failed Rent Ready") {
    return {
      title: "Resolve rework and re-certify rent readiness",
      why: "Failed rent ready is creating direct rework delay and avoidable vacancy exposure.",
      outcome: `Protect ~$${scenario.protectedRevenue.toLocaleString()} and improve ECD by ${scenario.daysSaved}d.`,
      severity: "High",
    };
  }

  if (row.turnStatus === "Blocked" && row.currentStage === "Owner Approval") {
    return {
      title: "Escalate owner approval and remove blocker",
      why: "Approval delay is the main driver of forecast slippage.",
      outcome: `Protect ~$${scenario.protectedRevenue.toLocaleString()} and improve ECD by ${scenario.daysSaved}d.`,
      severity: "High",
    };
  }

  if ((row.blockers || []).some((b) => String(b).toLowerCase().includes("appliance"))) {
    return {
      title: "Expedite appliance path",
      why: "Appliance timing is widening the spread between current and recovered outcomes.",
      outcome: `Protect ~$${scenario.protectedRevenue.toLocaleString()} and improve ECD by ${scenario.daysSaved}d.`,
      severity: "Moderate",
    };
  }

  if ((row.risk || 0) >= 75) {
    return {
      title: "Compress stage time with operator intervention",
      why: "This turn has elevated risk and meaningful recoverable days.",
      outcome: `Protect ~$${scenario.protectedRevenue.toLocaleString()} and improve ECD by ${scenario.daysSaved}d.`,
      severity: "Moderate",
    };
  }

  return {
    title: "Maintain active monitoring",
    why: "Trajectory is manageable, with limited but still positive intervention value.",
    outcome: `Protect ~$${scenario.protectedRevenue.toLocaleString()} and improve ECD by ${scenario.daysSaved}d.`,
    severity: "Low",
  };
}

/* ----------------------------------
   TurnIQ Simulator
----------------------------------- */

function getSimulatorActionOptions() {
  return [
    {
      id: "clear_blocked",
      label: "Clear blocked turns",
      description: "Unlock blocked workflow and recover time immediately.",
      category: "Execution",
    },
    {
      id: "accelerate_approvals",
      label: "Accelerate approvals",
      description: "Remove approval lag from owner-dependent turns.",
      category: "Approval",
    },
    {
      id: "recover_failed_ready",
      label: "Recover failed rent ready",
      description: "Resolve failed-ready rework and re-certify faster.",
      category: "Quality",
    },
    {
      id: "compress_over_sla",
      label: "Compress over-SLA stage time",
      description: "Recover time where execution has drifted beyond SLA.",
      category: "Execution",
    },
    {
      id: "expedite_vendor_dependencies",
      label: "Expedite vendor dependencies",
      description: "Reduce appliance / vendor / trade coordination drag.",
      category: "Vendor",
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
    const overSlaDays = Math.max(0, (row.daysInStage || 0) - getStageSla(row.currentStage));
    recoveredDays += Math.min(2, overSlaDays);
  }

  if (
    selectedActions.includes("expedite_vendor_dependencies") &&
    (row.blockers || []).some((b) => {
      const text = String(b).toLowerCase();
      return text.includes("vendor") || text.includes("appliance") || text.includes("trade");
    })
  ) {
    recoveredDays += 2;
  }

  const scenario = buildScenarioModel(row);
  const cappedRecovery = Math.min(recoveredDays, scenario.current.delayDays);

  return {
    recoveredDays: cappedRecovery,
    revenueProtected: getRevenueProtected(cappedRecovery, row),
    nextCompletion:
      cappedRecovery > 0
        ? shiftDate(row.projectedCompletion, -cappedRecovery)
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

  const impactedCount = impactedTurns.length;

  return {
    impactedTurns,
    totalRecoveredDays,
    totalRevenueProtected,
    impactedCount,
  };
}

/* ----------------------------------
   Component
----------------------------------- */

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
  const [activeScenario, setActiveScenario] = useState("Recovered Path");
  const [selectedSimulatorActions, setSelectedSimulatorActions] = useState([]);

  const portfolio = useMemo(() => buildPortfolioSummary(properties), [properties]);
  const scenarioQueue = useMemo(() => buildScenarioQueue(properties), [properties]);
  const simulatorActionOptions = useMemo(() => getSimulatorActionOptions(), []);
  const portfolioSimulation = useMemo(
    () => buildPortfolioDelaySimulation(properties, selectedSimulatorActions),
    [properties, selectedSimulatorActions]
  );

  const isExecMode = mode === "exec";
  const forecastTarget = selectedProperty || scenarioQueue[0] || null;

  const scenarioModel = useMemo(
    () => (forecastTarget ? buildScenarioModel(forecastTarget) : null),
    [forecastTarget]
  );

  const recommendation = useMemo(
    () => (forecastTarget && scenarioModel ? getRecommendation(forecastTarget, scenarioModel) : null),
    [forecastTarget, scenarioModel]
  );

  const activeScenarioData =
    activeScenario === "Current Path"
      ? scenarioModel?.current
      : activeScenario === "Downside Path"
      ? scenarioModel?.downside
      : scenarioModel?.recovered;

  const simulatedPortfolioDelay = Math.max(
    0,
    portfolio.currentDelay - portfolioSimulation.totalRecoveredDays
  );

  const kpis = [
    {
      title: "Current Delay",
      value: `${portfolio.currentDelay}d`,
      subtitle: "Current modeled slippage",
    },
    {
      title: "Recovered Delay",
      value: `${portfolio.recoveredDelay}d`,
      subtitle: "After best interventions",
    },
    {
      title: "Downside Delay",
      value: `${portfolio.downsideDelay}d`,
      subtitle: "If friction worsens",
    },
    {
      title: "Days Recoverable",
      value: `${portfolio.daysSaved}d`,
      subtitle: "Recovered vs current",
    },
    {
      title: "Revenue at Risk",
      value: `$${portfolio.revenueAtRisk.toLocaleString()}`,
      subtitle: "Current path exposure",
    },
    {
      title: "$ Protectable",
      value: `$${portfolio.protectedRevenue.toLocaleString()}`,
      subtitle: "If action is taken",
    },
  ];

  function commitOptimizedPlan() {
    const topRows = scenarioQueue.slice(0, 8);

    const patches = topRows
      .map((row) => {
        if (row.scenario.daysSaved <= 0) return null;

        return {
          id: row.id,
          patch: {
            projectedCompletion: row.scenario.recovered.completion,
            daysInStage: Math.max(0, (row.daysInStage || 0) - row.scenario.daysSaved),
            risk: Math.max(20, (row.risk || 0) - Math.min(12, row.scenario.daysSaved * 3)),
            timelineConfidence: Math.min(98, (row.timelineConfidence || 80) + 6),
          },
        };
      })
      .filter(Boolean);

    if (!patches.length) return;
    applyForecastBatch(patches, "Apply recovered forecast plan");
  }

  function commitSingleRecovered(row) {
    applyForecastPatch(
      row.id,
      {
        projectedCompletion: row.scenario.recovered.completion,
        daysInStage: Math.max(0, (row.daysInStage || 0) - row.scenario.daysSaved),
        risk: Math.max(20, (row.risk || 0) - Math.min(10, row.scenario.daysSaved * 3)),
        timelineConfidence: Math.min(98, (row.timelineConfidence || 80) + 6),
      },
      `Apply recovered path for ${row.name}`
    );
  }

  function stressTestSingle(row) {
    applyForecastPatch(
      row.id,
      {
        projectedCompletion: row.scenario.downside.completion,
        daysInStage:
          (row.daysInStage || 0) +
          Math.max(2, row.scenario.downside.delayDays - row.scenario.current.delayDays),
        risk: Math.min(99, (row.risk || 0) + 8),
        timelineConfidence: Math.max(35, (row.timelineConfidence || 80) - 8),
      },
      `Stress test downside path for ${row.name}`
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
        projectedCompletion: row.simulatedCompletion,
        daysInStage: Math.max(0, (row.daysInStage || 0) - row.simulatedRecoveredDays),
        risk: Math.max(20, (row.risk || 0) - Math.min(10, row.simulatedRecoveredDays * 2)),
      },
    }));

    applyForecastBatch(
      patches,
      `Apply TurnIQ simulator plan (${selectedSimulatorActions.length} levers)`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            {isExecMode
              ? "Portfolio outlook, intervention opportunity, and downside exposure."
              : "Forward-looking operating forecast with TurnIQ scenario modeling and recovery simulation."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="slate">{properties.length} turns modeled</Pill>
          <Pill tone="blue">TurnIQ computed</Pill>
          {!isExecMode ? (
            <>
              <button
                onClick={commitOptimizedPlan}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply recovered plan
              </button>
              <button
                onClick={undoLastForecastAction}
                disabled={!canUndoForecastAction}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
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

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="text-2xl font-semibold text-slate-900">TurnIQ Simulator</div>
            <div className="mt-1 text-sm text-slate-600">
              Test portfolio-wide recovery moves before committing execution changes. TurnIQ models
              the effect on delay, ECDs, and protectable revenue.
            </div>
          </div>
          <Pill tone="blue">{selectedSimulatorActions.length} levers selected</Pill>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <div className="space-y-3">
              {simulatorActionOptions.map((action) => {
                const selected = selectedSimulatorActions.includes(action.id);

                return (
                  <button
                    key={action.id}
                    onClick={() => toggleSimulatorAction(action.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{action.label}</div>
                        <div className="mt-1 text-sm text-slate-500">{action.description}</div>
                      </div>
                      <Pill tone={selected ? "blue" : "slate"}>{action.category}</Pill>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">Current Delay</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {portfolio.currentDelay}d
                </div>
                <div className="mt-1 text-sm text-slate-500">Current path</div>
              </Card>

              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">Simulated Delay</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {simulatedPortfolioDelay}d
                </div>
                <div className="mt-1 text-sm text-slate-500">After selected levers</div>
              </Card>

              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">Days Recovered</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {portfolioSimulation.totalRecoveredDays}d
                </div>
                <div className="mt-1 text-sm text-slate-500">Modeled lift</div>
              </Card>

              <Card>
                <div className="text-xs uppercase tracking-wide text-slate-500">Revenue Protected</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  ${portfolioSimulation.totalRevenueProtected.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-slate-500">Modeled outcome</div>
              </Card>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-700">
                {portfolioSimulation.totalRecoveredDays > 0 ? (
                  <>
                    TurnIQ estimates that the selected plan impacts{" "}
                    <span className="font-medium">{portfolioSimulation.impactedCount}</span> turns,
                    reduces modeled delay from{" "}
                    <span className="font-medium">{portfolio.currentDelay}d</span> to{" "}
                    <span className="font-medium">{simulatedPortfolioDelay}d</span>, and protects
                    approximately{" "}
                    <span className="font-medium">
                      ${portfolioSimulation.totalRevenueProtected.toLocaleString()}
                    </span>.
                  </>
                ) : (
                  <>Select one or more levers to see TurnIQ model the portfolio impact.</>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={applyPortfolioSimulatorPlan}
                disabled={!portfolioSimulation.impactedTurns.length}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  portfolioSimulation.impactedTurns.length
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300"
                }`}
              >
                Apply simulator plan
              </button>

              {selectedSimulatorActions.length ? (
                <button
                  onClick={() => setSelectedSimulatorActions([])}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset simulator
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[920px] text-sm">
            <thead className="bg-white text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Current Delay</th>
                <th className="px-4 py-3 font-medium">Recovered Days</th>
                <th className="px-4 py-3 font-medium">Simulated ECD</th>
                <th className="px-4 py-3 font-medium">$ Protected</th>
              </tr>
            </thead>
            <tbody>
              {portfolioSimulation.impactedTurns.slice(0, 8).map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-4">
                    <button onClick={() => setSelectedPropertyId(row.id)} className="text-left">
                      <div className="font-medium text-blue-700 hover:underline">{row.name}</div>
                    </button>
                    <div className="mt-1 text-xs text-slate-400">
                      {getRentSourceLabel(row)} • ${getDailyRentValue(row)}/day
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{row.currentStage}</td>
                  <td className="px-4 py-4">
                    <Pill tone="amber">+{buildScenarioModel(row).current.delayDays}d</Pill>
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
                    No simulated impact yet. Select one or more TurnIQ levers.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {forecastTarget && scenarioModel ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className={isExecMode ? "xl:col-span-12" : "xl:col-span-8"}>
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {isExecMode
                      ? `Highest-Leverage Forecast — ${forecastTarget.name}`
                      : `Scenario Comparison — ${forecastTarget.name}`}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Imported ECD + TurnIQ delay modeling + recovery path comparison
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {scenarioModel.rentSourceLabel} • ${scenarioModel.dailyRentValue}/day
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Current Path", "Recovered Path", "Downside Path"].map((scenario) => (
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
                {[scenarioModel.current, scenarioModel.recovered, scenarioModel.downside].map(
                  (scenario) => (
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
                        <Pill tone={getScenarioTone(scenario.name)}>+{scenario.delayDays}d</Pill>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div>
                          <div className="text-sm text-slate-500">Forecast Completion</div>
                          <div className="text-lg font-semibold text-slate-900">
                            {formatShortDate(scenario.completion)}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-slate-500">Confidence</div>
                          <div className="text-lg font-semibold text-slate-900">
                            {scenario.confidence}%
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-slate-500">Revenue Exposure</div>
                          <div className="text-lg font-semibold text-slate-900">
                            ${scenario.exposure.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>

            <Card className="mt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {isExecMode ? "Top Forecast Queue" : "Forecast Intervention Queue"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Ranked by protectable revenue, recoverable days, and execution pressure.
                  </div>
                </div>
                <Pill tone="slate">{scenarioQueue.length} modeled turns</Pill>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[1120px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Property</th>
                      <th className="px-4 py-3 font-medium">Imported ECD</th>
                      <th className="px-4 py-3 font-medium">Current Path</th>
                      <th className="px-4 py-3 font-medium">Recovered Path</th>
                      <th className="px-4 py-3 font-medium">Downside Path</th>
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
                            <div className="font-medium text-blue-700 hover:underline">
                              {row.name}
                            </div>
                          </button>
                          <div className="mt-1 text-sm text-slate-500">
                            {row.market} • {row.currentStage}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Pill tone={getForecastRiskTone(row.scenario.riskBand)}>
                              {row.scenario.riskBand}
                            </Pill>
                            <Pill tone="slate">Risk {row.risk || 0}</Pill>
                          </div>
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-900">
                          {formatShortDate(row.projectedCompletion)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {formatShortDate(row.scenario.current.completion)}
                          </div>
                          <div className="mt-1">
                            <Pill tone="amber">+{row.scenario.current.delayDays}d</Pill>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {formatShortDate(row.scenario.recovered.completion)}
                          </div>
                          <div className="mt-1">
                            <Pill tone="green">+{row.scenario.recovered.delayDays}d</Pill>
                          </div>
                          <div className="mt-1 text-xs text-emerald-600">
                            saves {row.scenario.daysSaved}d
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {formatShortDate(row.scenario.downside.completion)}
                          </div>
                          <div className="mt-1">
                            <Pill tone="red">+{row.scenario.downside.delayDays}d</Pill>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-xl font-semibold text-slate-900">
                            ${row.protectedRevenue.toLocaleString()}
                          </div>
                        </td>

                        {!isExecMode ? (
                          <td className="px-4 py-4">
                            <div className="flex w-[132px] flex-col gap-2">
                              <button
                                onClick={() => commitSingleRecovered(row)}
                                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                              >
                                Apply recovered
                              </button>
                              <button
                                onClick={() => stressTestSingle(row)}
                                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
              {recommendation ? (
                <>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-3xl font-semibold text-slate-900">
                          {forecastTarget.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {forecastTarget.market} • {forecastTarget.currentStage}
                        </div>
                      </div>
                      <Pill tone={getForecastRiskTone(scenarioModel.riskBand)}>
                        {scenarioModel.riskBand}
                      </Pill>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Imported ECD
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-900">
                          {formatShortDate(forecastTarget.projectedCompletion)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Active Scenario
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-900">
                          {activeScenario}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Forecast Completion
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-900">
                          {formatShortDate(activeScenarioData?.completion)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Revenue Exposure
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-900">
                          ${activeScenarioData?.exposure.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50">
                    <div className="text-xl font-semibold text-slate-900">TurnIQ recommendation</div>
                    <div className="mt-4 space-y-3">
                      <div className="text-base font-medium text-slate-900">
                        {recommendation.title}
                      </div>
                      <div className="text-sm text-slate-700">Why: {recommendation.why}</div>
                      <div className="text-sm text-slate-700">{recommendation.outcome}</div>
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-semibold text-slate-900">Recovery levers</div>
                        <div className="mt-1 text-sm text-slate-500">
                          The fastest modeled paths to improve timing.
                        </div>
                      </div>
                      <Pill tone="green">+{scenarioModel.daysSaved}d</Pill>
                    </div>

                    <div className="mt-4 space-y-3">
                      {scenarioModel.actions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{action.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{action.category}</div>
                          </div>
                          <Pill tone={action.daysRecovered > 0 ? "green" : "slate"}>
                            +{action.daysRecovered}d
                          </Pill>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <div className="text-xl font-semibold text-slate-900">Delay driver breakdown</div>
                    <div className="mt-1 text-sm text-slate-500">
                      What is currently driving modeled slippage.
                    </div>

                    <div className="mt-4 space-y-3">
                      {scenarioModel.delayDrivers.map((driver) => (
                        <div
                          key={driver.label}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-700">{driver.label}</div>
                            <Pill tone="amber">+{driver.days}d</Pill>
                          </div>
                          <div className="mt-2">
                            <ProgressBar
                              value={Math.min(100, (driver.days / 4) * 100)}
                              tone="amber"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}