"use client";

import { useMemo } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

const DAILY_RENT_ASSUMPTION = 120;

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

function buildExecutiveNarrative({
  properties,
  revenueImpact,
  topStageBottleneck,
  actionHistory,
}) {
  const highRiskCount = properties.filter((p) => p.risk >= 75).length;
  const blockedCount = properties.filter((p) => p.turnStatus === "Blocked").length;
  const totalDelay = properties.reduce((sum, p) => sum + (p.forecastDaysLate || 0), 0);
  const completedActions = actionHistory.filter((a) => a.kind === "completed");
  const totalDaysAvoided = completedActions.reduce((sum, a) => sum + (a.daysAvoided || 0), 0);

  return {
    headline:
      highRiskCount > 0
        ? `${highRiskCount} turns are driving the majority of portfolio risk.`
        : "Portfolio risk is relatively contained right now.",
    body: topStageBottleneck
      ? `${topStageBottleneck.stage} is the primary bottleneck, averaging ${topStageBottleneck.avgDaysInStage} days in stage. Across the active portfolio, TurnIQ is modeling ${totalDelay} total delay days and $${revenueImpact.atRisk.toLocaleString()} of revenue exposure.`
      : `TurnIQ is modeling ${totalDelay} total delay days and $${revenueImpact.atRisk.toLocaleString()} of revenue exposure across the active portfolio.`,
    footer:
      totalDaysAvoided > 0
        ? `Completed actions have already removed ${totalDaysAvoided} modeled delay days.`
        : blockedCount > 0
        ? `${blockedCount} blocked turns need immediate intervention.`
        : "No blocked turns are currently preventing execution flow.",
  };
}

function buildActionSummary(properties) {
  const blocked = properties.filter((p) => p.turnStatus === "Blocked").length;
  const approvals = properties.filter((p) => p.currentStage === "Owner Approval").length;
  const vendorless = properties.filter((p) => !p.vendor || p.vendor === "TBD").length;
  const highDelay = properties.filter((p) => (p.forecastDaysLate || 0) >= 4).length;

  const actions = [];

  if (blocked > 0) {
    actions.push({
      title: "Resolve blocked turns",
      body: `${blocked} blocked turn${blocked > 1 ? "s are" : " is"} preventing clean execution.`,
      tone: "red",
    });
  }

  if (approvals > 0) {
    actions.push({
      title: "Clear owner approvals",
      body: `${approvals} turn${approvals > 1 ? "s are" : " is"} sitting in Owner Approval.`,
      tone: "amber",
    });
  }

  if (vendorless > 0) {
    actions.push({
      title: "Assign execution vendors",
      body: `${vendorless} turn${vendorless > 1 ? "s still need" : " still needs"} vendor ownership.`,
      tone: "blue",
    });
  }

  if (highDelay > 0) {
    actions.push({
      title: "Intervene on delay-heavy turns",
      body: `${highDelay} turn${highDelay > 1 ? "s are" : " is"} modeled at 4+ days behind ECD.`,
      tone: "red",
    });
  }

  return actions.slice(0, 4);
}

function buildImpactSummary(properties, actionHistory) {
  const totalDelay = properties.reduce((sum, p) => sum + (p.forecastDaysLate || 0), 0);
  const optimizedDelay = properties.reduce((sum, p) => {
    const recoverableDays = Math.min(
      p.forecastDaysLate || 0,
      Math.max(0, Math.ceil(((p.risk || 0) - 50) / 20))
    );
    return sum + Math.max(0, (p.forecastDaysLate || 0) - recoverableDays);
  }, 0);

  const daysSaved = Math.max(0, totalDelay - optimizedDelay);
  const revenueRecovered = daysSaved * DAILY_RENT_ASSUMPTION;

  const completedActions = actionHistory.filter((a) => a.kind === "completed");
  const realizedVacancySaved = completedActions.reduce(
    (sum, a) => sum + (a.vacancySavings || 0),
    0
  );

  return {
    totalDelay,
    optimizedDelay,
    daysSaved,
    revenueRecovered,
    realizedVacancySaved,
  };
}

export default function OverviewTab({
  mode,
  properties,
  kpis,
  selectedMarket,
  setSelectedMarket,
  setActiveTab,
  actionHistory,
  hasImportedData,
  topStageBottleneck,
  lastImportCount,
}) {
  const enrichedProperties = useMemo(
    () => properties.map((property) => ({ ...property, ...buildForecast(property) })),
    [properties]
  );

  const revenueImpact = useMemo(
    () => calculateRevenueImpact(enrichedProperties),
    [enrichedProperties]
  );

  const marketSummary = useMemo(
    () => buildMarketSummary(enrichedProperties),
    [enrichedProperties]
  );

  const executiveNarrative = useMemo(
    () =>
      buildExecutiveNarrative({
        properties: enrichedProperties,
        revenueImpact,
        topStageBottleneck,
        actionHistory,
      }),
    [enrichedProperties, revenueImpact, topStageBottleneck, actionHistory]
  );

  const actionSummary = useMemo(
    () => buildActionSummary(enrichedProperties),
    [enrichedProperties]
  );

  const impactSummary = useMemo(
    () => buildImpactSummary(enrichedProperties, actionHistory),
    [enrichedProperties, actionHistory]
  );

  const recentActions = useMemo(
    () => actionHistory.slice(0, 5),
    [actionHistory]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Overview</div>
          <div className="mt-1 text-sm text-slate-500">
            {mode === "presentation"
              ? "Executive summary of portfolio risk, bottlenecks, and outcome potential."
              : "Executive summary of portfolio risk, bottlenecks, and outcome potential."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="blue">
            {selectedMarket === "All Markets" ? "Portfolio View" : selectedMarket}
          </Pill>
          <Pill tone={hasImportedData ? "emerald" : "amber"}>
            {hasImportedData ? "Imported Dataset" : "Demo Dataset"}
          </Pill>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-xs uppercase tracking-wide text-red-600">Revenue at Risk</div>
          <div className="mt-2 text-3xl font-semibold text-red-700">
            ${revenueImpact.atRisk.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-red-600">
            Modeled exposure from delays + risk concentration
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-600">
            Recoverable Revenue
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">
            ${revenueImpact.recoverable.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-emerald-600">
            Potential upside from executing recommendations
          </div>
        </div>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Delay Days</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {impactSummary.totalDelay}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Total modeled portfolio slippage
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Open Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis?.allOpenTurns ?? enrichedProperties.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {hasImportedData && lastImportCount
              ? `${lastImportCount} recently imported`
              : "Active turns in current view"}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              TurnIQ Executive Narrative
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {executiveNarrative.headline}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              {executiveNarrative.body}
            </div>
            <div className="mt-3 text-sm text-slate-500">
              {executiveNarrative.footer}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                {kpis?.blockedTurns ?? enrichedProperties.filter((p) => p.turnStatus === "Blocked").length} blocked turns
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                {kpis?.highRisk ?? enrichedProperties.filter((p) => p.risk >= 75).length} high-risk turns
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                {impactSummary.daysSaved} modeled days recoverable
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                ${impactSummary.revenueRecovered.toLocaleString()} modeled upside
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Primary Bottleneck</div>
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

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Recommended Actions</div>
                <div className="mt-1 text-sm text-slate-500">
                  Highest-leverage interventions to reduce delay and exposure
                </div>
              </div>
              <button
                onClick={() => setActiveTab("Dashboard")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Open Dashboard
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {actionSummary.length ? (
                actionSummary.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border p-4 ${
                      item.tone === "red"
                        ? "border-red-200 bg-red-50"
                        : item.tone === "amber"
                        ? "border-amber-200 bg-amber-50"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-2 text-sm text-slate-700">{item.body}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No urgent action recommendations at the moment.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Outcome Summary</div>
                <div className="mt-1 text-sm text-slate-500">
                  What Forecast suggests TurnIQ can unlock
                </div>
              </div>
              <button
                onClick={() => setActiveTab("Forecast")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Open Forecast
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Delay Days Recoverable
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {impactSummary.daysSaved}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Modeled Revenue Recovered
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  ${impactSummary.revenueRecovered.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Optimized Delay
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {impactSummary.optimizedDelay}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Realized Vacancy Saved
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  ${impactSummary.realizedVacancySaved.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Market Snapshot</div>
            <div className="mt-1 text-sm text-slate-500">
              Portfolio risk and delay by market
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

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Recent Action Log</div>
            <div className="mt-1 text-sm text-slate-500">
              Latest changes and completed interventions
            </div>

            <div className="mt-4 space-y-3">
              {recentActions.length ? (
                recentActions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title || item.actionType || "Action"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.propertyName
                        ? `${item.propertyName}${item.market ? ` • ${item.market}` : ""}`
                        : "Portfolio activity"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {item.daysAvoided ? `${item.daysAvoided} day(s) avoided • ` : ""}
                      {item.vacancySavings
                        ? `$${item.vacancySavings.toLocaleString()} protected`
                        : "Tracked activity"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No recent action history yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}