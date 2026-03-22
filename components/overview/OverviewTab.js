"use client";

import { useMemo } from "react";
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

function getConfidenceMeta(score) {
  if (score >= 85) return { label: "High", tone: "emerald" };
  if (score >= 70) return { label: "Moderate", tone: "amber" };
  return { label: "Low", tone: "red" };
}

function groupByMarket(properties) {
  return Array.from(new Set(properties.map((p) => p.market))).map((market) => {
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
      turns: rows.length,
      avgRisk,
      avgForecastDelay,
      blocked: rows.filter((r) => r.turnStatus === "Blocked").length,
    };
  });
}

function buildFallbackBottleneck(properties) {
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

export default function OverviewTab({
  properties = [],
  kpis,
  selectedMarket,
  setSelectedMarket,
  setActiveTab,
  actionHistory = [],
  hasImportedData = false,
  topStageBottleneck = null,
  lastImportCount = 0,
}) {
  const enrichedProperties = useMemo(
    () => properties.map((property) => ({ ...property, ...buildForecast(property) })),
    [properties]
  );

  const forecastSummary = useMemo(() => {
    const total = enrichedProperties.length || 1;
    const totalDelay = enrichedProperties.reduce(
      (sum, property) => sum + (property.forecastDaysLate || 0),
      0
    );
    const avgDelay = Number((totalDelay / total).toFixed(1));
    const delayedTurns = enrichedProperties.filter((p) => p.forecastDaysLate >= 2).length;
    const highDelayTurns = enrichedProperties.filter((p) => p.forecastDaysLate >= 4).length;
    const avgConfidence = Math.round(
      enrichedProperties.reduce((sum, property) => sum + (property.forecastConfidence || 0), 0) /
        total
    );

    const mostDelayed =
      [...enrichedProperties].sort(
        (a, b) => (b.forecastDaysLate || 0) - (a.forecastDaysLate || 0)
      )[0] || null;

    return {
      totalDelay,
      avgDelay,
      delayedTurns,
      highDelayTurns,
      avgConfidence,
      mostDelayed,
    };
  }, [enrichedProperties]);

  const marketSummary = useMemo(
    () =>
      groupByMarket(enrichedProperties).sort(
        (a, b) => b.avgForecastDelay - a.avgForecastDelay || b.avgRisk - a.avgRisk
      ),
    [enrichedProperties]
  );

  const recentActions = useMemo(() => {
    return actionHistory.slice(0, 5);
  }, [actionHistory]);

  const bottleneck = topStageBottleneck || buildFallbackBottleneck(enrichedProperties);

  const portfolioConfidence = getConfidenceMeta(forecastSummary.avgConfidence);

  const sourceLabel = hasImportedData ? "Imported dataset" : "Demo dataset";
  const sourceTone = hasImportedData ? "blue" : "amber";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Overview</div>
          <div className="mt-1 text-sm text-slate-500">
            Portfolio narrative layer across operations, forecast pressure, and current data source.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={sourceTone}>{sourceLabel}</Pill>
          <Pill tone={portfolioConfidence.tone}>
            Confidence: {portfolioConfidence.label}
          </Pill>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Open Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis?.allOpenTurns ?? properties.length}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Current portfolio in scope
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Blocked Turns</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis?.blockedTurns ?? properties.filter((p) => p.turnStatus === "Blocked").length}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Requiring active intervention
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Forecast Delay</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {forecastSummary.avgDelay}d
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Average modeled variance to ECD
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Days At Risk</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {forecastSummary.totalDelay}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Total modeled slippage across the portfolio
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Data Source</div>
                <div className="mt-1 text-sm text-slate-500">
                  Current workspace context and imported data status.
                </div>
              </div>

              <Pill tone={sourceTone}>{sourceLabel}</Pill>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Active market filter</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedMarket || "All Markets"}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSelectedMarket?.("All Markets")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Reset market
                  </button>
                  <button
                    onClick={() => setActiveTab?.("Import")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Go to Import
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Import impact</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {hasImportedData ? "Live imported data" : "Sample dataset"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {hasImportedData
                    ? `Imported turns are currently driving portfolio analytics${
                        lastImportCount > 0 ? ` • last import added ${lastImportCount}` : ""
                      }.`
                    : "The workspace is currently using the built-in demo portfolio."}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Forecast Summary</div>
                <div className="mt-1 text-sm text-slate-500">
                  Portfolio-wide forecast pressure and confidence.
                </div>
              </div>

              <Pill tone={portfolioConfidence.tone}>
                {portfolioConfidence.label}
              </Pill>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Delayed Turns</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {forecastSummary.delayedTurns}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">High Delay Risk</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {forecastSummary.highDelayTurns}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg Confidence</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {forecastSummary.avgConfidence}%
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Most Delayed</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {forecastSummary.mostDelayed?.name || "—"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {forecastSummary.mostDelayed
                    ? `+${forecastSummary.mostDelayed.forecastDaysLate}d vs ECD`
                    : "No delay modeled"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setActiveTab?.("Forecast")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                View Forecast
              </button>
              <button
                onClick={() => setActiveTab?.("Dashboard")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Open Dashboard
              </button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Bottleneck Stage</div>
            <div className="mt-1 text-sm text-slate-500">
              Current stage creating the greatest time drag in the portfolio.
            </div>

            {bottleneck ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-900">
                  {bottleneck.stage}
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {bottleneck.avgDaysInStage} days
                </div>
                <div className="mt-1 text-sm text-amber-800">
                  Average days in stage
                </div>
                {"count" in bottleneck ? (
                  <div className="mt-2 text-sm text-slate-600">
                    {bottleneck.count} turns currently in this stage
                  </div>
                ) : null}

                <div className="mt-4">
                  <button
                    onClick={() => setActiveTab?.("Control Center")}
                    className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm text-amber-900 hover:bg-amber-100"
                  >
                    Investigate in Control Center
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No bottleneck stage available.
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Market Snapshot</div>
            <div className="mt-1 text-sm text-slate-500">
              Market-level risk and forecast pressure across the current dataset.
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">Turns</th>
                    <th className="px-3 py-2 font-medium">Blocked</th>
                    <th className="px-3 py-2 font-medium">Avg Risk</th>
                    <th className="px-3 py-2 font-medium">Avg Forecast Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {marketSummary.map((row) => (
                    <tr key={row.market} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-900">{row.market}</td>
                      <td className="px-3 py-3">{row.turns}</td>
                      <td className="px-3 py-3">{row.blocked}</td>
                      <td className="px-3 py-3">
                        <Pill
                          tone={
                            row.avgRisk >= 75
                              ? "red"
                              : row.avgRisk >= 60
                              ? "amber"
                              : "emerald"
                          }
                        >
                          {row.avgRisk}
                        </Pill>
                      </td>
                      <td className="px-3 py-3">
                        <Pill
                          tone={
                            row.avgForecastDelay >= 4
                              ? "red"
                              : row.avgForecastDelay >= 2
                              ? "amber"
                              : "emerald"
                          }
                        >
                          {row.avgForecastDelay}d
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Recent Workflow Activity</div>
            <div className="mt-1 text-sm text-slate-500">
              Most recent operator actions and turn changes captured by the workspace.
            </div>

            {recentActions.length ? (
              <div className="mt-5 space-y-3">
                {recentActions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {item.title || item.actionType || "Completed action"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {item.propertyName || "Property"} • {item.market || "Unknown market"}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleString()
                          : "Recent"}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {typeof item.daysAvoided === "number" ? (
                        <Pill tone="emerald">Days avoided: {item.daysAvoided}</Pill>
                      ) : null}
                      {typeof item.vacancySavings === "number" ? (
                        <Pill tone="blue">Vacancy saved: ${item.vacancySavings}</Pill>
                      ) : null}
                      {typeof item.responseMinutes === "number" ? (
                        <Pill tone="amber">Response: {item.responseMinutes}m</Pill>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No recent actions logged yet.
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-4">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Quick Navigation</div>
            <div className="mt-1 text-sm text-slate-500">
              Jump straight into the operating surfaces that matter.
            </div>

            <div className="mt-5 space-y-3">
              <button
                onClick={() => setActiveTab?.("Dashboard")}
                className="block w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">Dashboard</div>
                <div className="mt-1 text-sm text-slate-500">
                  Manage priorities, recommendations, and selected property controls.
                </div>
              </button>

              <button
                onClick={() => setActiveTab?.("Control Center")}
                className="block w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">Control Center</div>
                <div className="mt-1 text-sm text-slate-500">
                  Edit stage, ECD, vendor assignments, and execution queue details.
                </div>
              </button>

              <button
                onClick={() => setActiveTab?.("Forecast")}
                className="block w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">Forecast</div>
                <div className="mt-1 text-sm text-slate-500">
                  Review modeled completion, confidence, and scenario simulation.
                </div>
              </button>

              <button
                onClick={() => setActiveTab?.("Import")}
                className="block w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">Import</div>
                <div className="mt-1 text-sm text-slate-500">
                  Upload, replace, append, or revert the active turn dataset.
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}