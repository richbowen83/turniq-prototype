"use client";

import { useMemo } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { getDailyRentValue, getRevenueProtected } from "../../utils/economics";

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
  if (stage === "Failed Rent Ready") return 3;
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

  const forecastDaysLate =
    getRiskDelay(property.risk) +
    getStageDelay(property.currentStage) +
    blockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);

  const forecastCompletion = addDays(property.projectedCompletion, forecastDaysLate);

  const forecastConfidence =
    typeof property.timelineConfidence === "number"
      ? property.timelineConfidence
      : Math.max(40, Math.min(95, Math.round(100 - property.risk * 0.5)));

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
    const delayDays = p.forecastDaysLate || 0;
    const riskWeight = (p.risk || 0) / 100;
    const dailyRent = getDailyRentValue(p);
    const exposure = delayDays * dailyRent;

    atRisk += exposure * Math.max(0.3, riskWeight);
    recoverable += exposure * Math.max(0, 1 - riskWeight * 0.6);
  });

  return {
    atRisk: Math.round(atRisk),
    recoverable: Math.round(recoverable),
  };
}

function getToneFromRisk(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "emerald";
}

function buildMarketSummary(properties) {
  return Array.from(new Set(properties.map((p) => p.market)))
    .map((market) => {
      const rows = properties.filter((p) => p.market === market);
      const avgRisk = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + row.risk, 0) / rows.length)
        : 0;
      const avgDelay = rows.length
        ? Number(
            (
              rows.reduce((sum, row) => sum + (row.forecastDaysLate || 0), 0) / rows.length
            ).toFixed(1)
          )
        : 0;

      return {
        market,
        turns: rows.length,
        blocked: rows.filter((row) => row.turnStatus === "Blocked").length,
        avgRisk,
        avgDelay,
      };
    })
    .sort((a, b) => b.avgDelay - a.avgDelay || b.avgRisk - a.avgRisk);
}

function buildExecutiveNarrative({ properties, revenueImpact, topStageBottleneck, planSummary }) {
  const highRisk = properties.filter((p) => p.risk >= 75).length;
  const blocked = properties.filter((p) => p.turnStatus === "Blocked").length;
  const delay = properties.reduce((sum, p) => sum + (p.forecastDaysLate || 0), 0);

  const headline =
    planSummary.daysRecovered > 0
      ? `If the current recommended plan is executed, modeled portfolio delay falls from ${delay}d to ${Math.max(
          0,
          delay - planSummary.daysRecovered
        )}d.`
      : highRisk > 0
      ? `${highRisk} high-risk turns are driving portfolio performance.`
      : "Portfolio is operating within acceptable risk thresholds.";

  const body = topStageBottleneck
    ? ` ${topStageBottleneck.stage} is the primary bottleneck, with ${topStageBottleneck.avgDaysInStage} days in stage. TurnIQ models $${revenueImpact.atRisk.toLocaleString()} of portfolio exposure.`
    : ` TurnIQ models $${revenueImpact.atRisk.toLocaleString()} of portfolio exposure.`;

  const footer =
    planSummary.daysRecovered > 0
      ? `The current simulated plan protects approximately $${planSummary.revenueProtected.toLocaleString()} and concentrates on ${planSummary.topLeverLabel}.`
      : blocked > 0
      ? `${blocked} blocked turns represent the fastest path to unlocking value.`
      : "Execution flow is largely unblocked.";

  return {
    headline,
    body: `${headline}${body}`,
    footer,
  };
}

function buildImpactSummary(properties) {
  const totalDelay = properties.reduce((sum, p) => sum + (p.forecastDaysLate || 0), 0);

  const optimizedDelay = properties.reduce((sum, p) => {
    const recoverable = Math.min(
      p.forecastDaysLate || 0,
      Math.max(0, Math.ceil(((p.risk || 0) - 50) / 20))
    );
    return sum + Math.max(0, (p.forecastDaysLate || 0) - recoverable);
  }, 0);

  const daysSaved = Math.max(0, totalDelay - optimizedDelay);

  const revenueRecovered = Math.round(
    properties.reduce((sum, p) => {
      const recoverable = Math.min(
        p.forecastDaysLate || 0,
        Math.max(0, Math.ceil(((p.risk || 0) - 50) / 20))
      );
      return sum + getRevenueProtected(recoverable, p);
    }, 0)
  );

  return {
    totalDelay,
    optimizedDelay,
    daysSaved,
    revenueRecovered,
  };
}

function getPlanLeverOptions() {
  return [
    {
      id: "clear_blocked",
      label: "Clear blocked turns",
    },
    {
      id: "accelerate_approvals",
      label: "Accelerate approvals",
    },
    {
      id: "recover_failed_ready",
      label: "Recover failed rent ready",
    },
    {
      id: "compress_over_sla",
      label: "Compress over-SLA stage time",
    },
  ];
}

function getPlanRecoveryForRow(row, leverId) {
  if (leverId === "clear_blocked" && row.turnStatus === "Blocked") return 2;
  if (leverId === "accelerate_approvals" && row.currentStage === "Owner Approval") return 2;
  if (leverId === "recover_failed_ready" && row.currentStage === "Failed Rent Ready") return 3;

  if (leverId === "compress_over_sla") {
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
    return Math.min(2, overSlaDays);
  }

  return 0;
}

function buildExecutivePlan(properties) {
  const levers = getPlanLeverOptions();

  const leverResults = levers
    .map((lever) => {
      const impactedRows = properties
        .map((row) => {
          const recoveredDays = getPlanRecoveryForRow(row, lever.id);
          return {
            ...row,
            recoveredDays,
            revenueProtected: getRevenueProtected(recoveredDays, row),
          };
        })
        .filter((row) => row.recoveredDays > 0);

      return {
        ...lever,
        impactedRows,
        impactedTurns: impactedRows.length,
        daysRecovered: impactedRows.reduce((sum, row) => sum + row.recoveredDays, 0),
        revenueProtected: impactedRows.reduce((sum, row) => sum + row.revenueProtected, 0),
      };
    })
    .sort(
      (a, b) =>
        b.revenueProtected - a.revenueProtected || b.daysRecovered - a.daysRecovered
    );

  const topLevers = leverResults.filter((lever) => lever.daysRecovered > 0).slice(0, 3);

  const rowMap = new Map();

  topLevers.forEach((lever) => {
    lever.impactedRows.forEach((row) => {
      if (!rowMap.has(row.id)) {
        rowMap.set(row.id, {
          ...row,
          totalRecoveredDays: 0,
          totalRevenueProtected: 0,
          levers: [],
        });
      }

      const existing = rowMap.get(row.id);
      existing.totalRecoveredDays += row.recoveredDays;
      existing.totalRevenueProtected += row.revenueProtected;
      existing.levers.push(lever.label);
    });
  });

  const topTurns = [...rowMap.values()]
    .sort(
      (a, b) =>
        b.totalRevenueProtected - a.totalRevenueProtected ||
        b.totalRecoveredDays - a.totalRecoveredDays
    )
    .slice(0, 3);

  return {
    topLevers,
    topTurns,
    daysRecovered: topTurns.reduce((sum, row) => sum + row.totalRecoveredDays, 0),
    revenueProtected: topTurns.reduce((sum, row) => sum + row.totalRevenueProtected, 0),
    topLeverLabel: topLevers[0]?.label || "priority interventions",
  };
}

export default function OverviewTab({
  mode,
  properties,
  kpis,
  selectedMarket,
  setSelectedMarket,
  setActiveTab,
  hasImportedData,
  topStageBottleneck,
  lastImportCount,
}) {
  const enriched = useMemo(
    () => properties.map((p) => ({ ...p, ...buildForecast(p) })),
    [properties]
  );

  const revenue = useMemo(() => calculateRevenueImpact(enriched), [enriched]);
  const impact = useMemo(() => buildImpactSummary(enriched), [enriched]);
  const marketSummary = useMemo(() => buildMarketSummary(enriched), [enriched]);
  const executivePlan = useMemo(() => buildExecutivePlan(enriched), [enriched]);

  const narrative = useMemo(
    () =>
      buildExecutiveNarrative({
        properties: enriched,
        revenueImpact: revenue,
        topStageBottleneck,
        planSummary: executivePlan,
      }),
    [enriched, revenue, topStageBottleneck, executivePlan]
  );

  const isExec = mode === "exec";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Overview</div>
          <div className="mt-1 text-sm text-slate-500">
            {isExec
              ? "Portfolio-level performance, bottlenecks, and value creation."
              : "Operational summary and portfolio performance signals."}
          </div>
        </div>

        <div className="flex gap-2">
          <Pill tone="blue">{selectedMarket}</Pill>
          <Pill tone={hasImportedData ? "emerald" : "amber"}>
            {hasImportedData ? "Imported" : "Demo"}
          </Pill>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          TurnIQ Executive Narrative
        </div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">
          {narrative.headline}
        </div>
        <div className="mt-3 text-sm leading-6 text-slate-700">{narrative.body}</div>
        <div className="mt-3 text-sm text-slate-500">{narrative.footer}</div>

        <div className="mt-5 flex flex-wrap gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
            {kpis?.blockedTurns ?? enriched.filter((p) => p.turnStatus === "Blocked").length} blocked turns
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
            {kpis?.highRisk ?? enriched.filter((p) => p.risk >= 75).length} high-risk turns
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
            {impact.daysSaved} modeled days recoverable
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
            ${impact.revenueRecovered.toLocaleString()} modeled upside
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Revenue at Risk</div>
          <div className="mt-2 text-3xl font-semibold text-red-600">
            ${revenue.atRisk.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">Modeled portfolio exposure</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Recoverable Revenue</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-600">
            ${revenue.recoverable.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">Potential upside from execution</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Delay Days</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{impact.totalDelay}</div>
          <div className="mt-1 text-xs text-slate-500">Total modeled portfolio slippage</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Open Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis?.allOpenTurns ?? enriched.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {hasImportedData && lastImportCount
              ? `${lastImportCount} recently imported`
              : "Active turns in current view"}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Executive Plan</div>
            <div className="mt-1 text-sm text-slate-500">
              The highest-value portfolio plan based on current modeled recovery levers
            </div>
          </div>
          <button
            onClick={() => setActiveTab("Forecast")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Open Forecast
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Current Delay</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{impact.totalDelay}d</div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Best Plan Delay</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {Math.max(0, impact.totalDelay - executivePlan.daysRecovered)}d
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Days Recoverable</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {executivePlan.daysRecovered}d
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Revenue Protected</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              ${executivePlan.revenueProtected.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <div className="text-sm font-medium text-slate-900">Top Recovery Levers</div>
            <div className="mt-3 space-y-3">
              {executivePlan.topLevers.length ? (
                executivePlan.topLevers.map((lever) => (
                  <div
                    key={lever.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{lever.label}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {lever.impactedTurns} turns impacted
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          ${lever.revenueProtected.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">{lever.daysRecovered}d recovered</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No meaningful portfolio levers identified yet.
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className="text-sm font-medium text-slate-900">Top Impacted Turns</div>
            <div className="mt-3 space-y-3">
              {executivePlan.topTurns.length ? (
                executivePlan.topTurns.map((turn) => (
                  <div
                    key={turn.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{turn.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {turn.market} • {turn.currentStage}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {turn.levers.join(" • ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          ${turn.totalRevenueProtected.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {turn.totalRecoveredDays}d recovered
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No priority turns surfaced for the current plan.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold text-slate-900">Market Snapshot</div>
                <div className="mt-1 text-sm text-slate-500">
                  Portfolio risk and delay by market
                </div>
              </div>
              <button
                onClick={() => setActiveTab("Forecast")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Open Forecast
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {marketSummary.map((row) => (
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
                          {row.turns} turns • {row.blocked} blocked • avg delay {row.avgDelay}d
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

        <div className="xl:col-span-4">
          <Card>
            <div className="text-2xl font-semibold text-slate-900">Primary Bottleneck</div>
            <div className="mt-1 text-sm text-slate-500">
              Where TurnIQ sees the most friction right now
            </div>

            {topStageBottleneck ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Stage</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {topStageBottleneck.stage}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Avg Days in Stage
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {topStageBottleneck.avgDaysInStage}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Blocked Turns
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {kpis?.blockedTurns ?? 0}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("Control Center")}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                >
                  Open Control Center
                </button>
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-500">
                No dominant bottleneck identified.
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Outcome Potential</div>
            <div className="mt-1 text-sm text-slate-500">
              What TurnIQ expects execution improvements can unlock
            </div>
          </div>
          <button
            onClick={() => setActiveTab("Control Center")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Open Control Center
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Optimized Delay</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {impact.optimizedDelay}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Days Recoverable</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {impact.daysSaved}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Revenue Recovered
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              ${impact.revenueRecovered.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Audience Mode</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {isExec ? "Exec" : "Operator"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}