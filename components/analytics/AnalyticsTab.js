"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";
import { getRevenueProtected } from "../../utils/economics";

const HORIZONS = ["Current", "Next 7 Days", "Next 14 Days", "All Active"];
const TODAY = new Date("2026-05-07");

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

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

function getRiskTone(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "green";
}

function getCapacityTone(capacity) {
  if (capacity >= 80) return "red";
  if (capacity >= 65) return "amber";
  return "green";
}

function getDeltaTone(delta, goodWhenHigher = false) {
  if (delta === 0) return "slate";
  if (goodWhenHigher) {
    return delta > 0 ? "green" : "red";
  }
  return delta > 0 ? "red" : "green";
}

function getDeltaArrow(delta, goodWhenHigher = false) {
  const tone = getDeltaTone(delta, goodWhenHigher);
  if (tone === "slate") return "→";
  return delta > 0 ? "↑" : "↓";
}

function formatDelta(delta, suffix = "", goodWhenHigher = false) {
  const tone = getDeltaTone(delta, goodWhenHigher);
  const arrow = getDeltaArrow(delta, goodWhenHigher);
  const abs = Math.abs(delta);

  return {
    tone,
    label: `${arrow}${abs}${suffix}`,
  };
}

function isInHorizon(property, horizon) {
  if (horizon === "All Active" || horizon === "Current") return true;

  const ecd = new Date(property.projectedCompletion);
  if (Number.isNaN(ecd.getTime())) return false;

  const diffDays = Math.ceil((ecd - TODAY) / (1000 * 60 * 60 * 24));

  if (horizon === "Next 7 Days") return diffDays <= 7;
  if (horizon === "Next 14 Days") return diffDays <= 14;
  return true;
}

function getStageAnalytics(rows) {
  const stages = [
    "Pre-Leasing",
    "Pre-Move Out Inspection",
    "Move Out Inspection",
    "Scope Review",
    "Owner Approval",
    "Dispatch",
    "Pending RRI",
    "Rent Ready Open",
    "Failed Rent Ready",
  ];

  return stages
    .map((stage) => {
      const items = rows.filter((row) => row.currentStage === stage);
      const count = items.length;
      const avgDays = count ? average(items.map((row) => row.daysInStage || 0)) : 0;
      const blockedCount = items.filter((row) => row.turnStatus === "Blocked").length;
      const overSlaCount = items.filter(
        (row) => (row.daysInStage || 0) > getStageSla(stage)
      ).length;

      return {
        stage,
        count,
        avgDays: Number(avgDays.toFixed(1)),
        blockedPct: count ? Math.round((blockedCount / count) * 100) : 0,
        overSlaPct: count ? Math.round((overSlaCount / count) * 100) : 0,
        sla: getStageSla(stage),
      };
    })
    .filter((item) => item.count > 0);
}

function getMarketAnalytics(rows) {
  return Array.from(new Set(rows.map((row) => row.market).filter(Boolean)))
    .map((market) => {
      const items = rows.filter((row) => row.market === market);

      return {
        market,
        openTurns: items.length,
        avgRisk: Math.round(average(items.map((row) => row.risk || 0))),
        avgReadiness: Math.round(average(items.map((row) => row.readiness || 0))),
        blocked: items.filter((row) => row.turnStatus === "Blocked").length,
        overSla: items.filter(
          (row) => (row.daysInStage || 0) > getStageSla(row.currentStage)
        ).length,
      };
    })
    .sort((a, b) => b.avgRisk - a.avgRisk);
}

function getDelayDriverAnalytics(rows) {
  const map = {};

  rows.forEach((row) => {
    (row.delayDrivers || []).forEach((driver) => {
      if (!map[driver.label]) {
        map[driver.label] = {
          label: driver.label,
          totalDays: 0,
          appearances: 0,
          revenueExposure: 0,
        };
      }

      map[driver.label].totalDays += driver.days || 0;
      map[driver.label].appearances += 1;
      map[driver.label].revenueExposure += getRevenueProtected(driver.days || 0, row);
    });
  });

  return Object.values(map)
    .map((item) => ({
      ...item,
      avgDays: Number((item.totalDays / item.appearances).toFixed(1)),
    }))
    .sort((a, b) => b.revenueExposure - a.revenueExposure)
    .slice(0, 8);
}

function getVendorAnalytics(rows) {
  const vendors = Array.from(new Set(rows.map((row) => row.vendor).filter(Boolean)));

  return vendors
    .map((vendor) => {
      const items = rows.filter((row) => row.vendor === vendor);
      const jobs = items.length;
      const avgRisk = Math.round(average(items.map((row) => row.risk || 0)));
      const avgReadiness = Math.round(average(items.map((row) => row.readiness || 0)));

      const onTimeRate = Math.max(
        72,
        Math.min(
          98,
          Math.round(
            100 -
              average(
                items.map((row) => {
                  if (row.turnStatus === "Blocked") return 20;
                  if ((row.daysInStage || 0) > getStageSla(row.currentStage)) return 12;
                  if ((row.risk || 0) >= 80) return 10;
                  return 4;
                })
              )
          )
        )
      );

      const qualityRate = Math.max(
        75,
        Math.min(
          97,
          Math.round(
            average(
              items.map((row) => {
                if ((row.readiness || 0) >= 90) return 95;
                if ((row.readiness || 0) >= 75) return 90;
                if ((row.readiness || 0) >= 60) return 84;
                return 78;
              })
            )
          )
        )
      );

      const score = Math.round(
        onTimeRate * 0.35 +
          qualityRate * 0.3 +
          (100 - avgRisk) * 0.2 +
          avgReadiness * 0.15
      );

      const capacity = Math.min(96, Math.round(45 + jobs * 10 + (100 - avgRisk) * 0.2));

      return {
        vendor,
        jobs,
        avgRisk,
        avgReadiness,
        onTimeRate,
        qualityRate,
        score,
        capacity,
        markets: Array.from(new Set(items.map((row) => row.market))).join(", "),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function getRiskBands(rows) {
  return {
    high: rows.filter((row) => row.risk >= 75).length,
    watch: rows.filter((row) => row.risk >= 60 && row.risk < 75).length,
    healthy: rows.filter((row) => row.risk < 60).length,
  };
}

function getActionAnalytics(actionHistory) {
  const completed = actionHistory.filter((item) => item.kind === "completed");

  const totalActions = completed.length;
  const totalDaysAvoided = completed.reduce((sum, item) => sum + (item.daysAvoided || 0), 0);
  const totalVacancySavings = completed.reduce(
    (sum, item) => sum + (item.vacancySavings || 0),
    0
  );

  const avgResponseMinutes = totalActions
    ? Math.round(
        completed.reduce((sum, item) => sum + (item.responseMinutes || 0), 0) / totalActions
      )
    : 0;

  const operatorLeaderboard = [
    {
      operator: "Ashley M.",
      actions: Math.ceil(totalActions * 0.4),
      daysAvoided: Math.round(totalDaysAvoided * 0.4),
      savings: Math.round(totalVacancySavings * 0.4),
    },
    {
      operator: "Justin R.",
      actions: Math.ceil(totalActions * 0.35),
      daysAvoided: Math.round(totalDaysAvoided * 0.35),
      savings: Math.round(totalVacancySavings * 0.35),
    },
    {
      operator: "Megan T.",
      actions: Math.max(
        0,
        totalActions - Math.ceil(totalActions * 0.4) - Math.ceil(totalActions * 0.35)
      ),
      daysAvoided: Math.max(
        0,
        totalDaysAvoided -
          Math.round(totalDaysAvoided * 0.4) -
          Math.round(totalDaysAvoided * 0.35)
      ),
      savings: Math.max(
        0,
        totalVacancySavings -
          Math.round(totalVacancySavings * 0.4) -
          Math.round(totalVacancySavings * 0.35)
      ),
    },
  ].filter((item) => item.actions > 0);

  return {
    totalActions,
    totalDaysAvoided,
    totalVacancySavings,
    avgResponseMinutes,
    operatorLeaderboard,
  };
}

function getInsights(stageAnalytics, marketAnalytics, vendorAnalytics, delayDrivers, actionAnalytics) {
  const insights = [];

  const worstStage = [...stageAnalytics].sort((a, b) => b.overSlaPct - a.overSlaPct)[0];
  if (worstStage) {
    insights.push({
      tone: "amber",
      title: `Stage pressure: ${worstStage.stage}`,
      body: `${worstStage.overSlaPct}% of turns in ${worstStage.stage} are over SLA, with average stage time at ${worstStage.avgDays} days.`,
    });
  }

  const worstMarket = marketAnalytics[0];
  if (worstMarket) {
    insights.push({
      tone: worstMarket.avgRisk >= 75 ? "red" : "amber",
      title: `Market to watch: ${worstMarket.market}`,
      body: `${worstMarket.market} has ${worstMarket.openTurns} active turns, average TurnIQ-computed risk ${worstMarket.avgRisk}, and ${worstMarket.overSla} turns over SLA.`,
    });
  }

  const biggestDriver = delayDrivers[0];
  if (biggestDriver) {
    insights.push({
      tone: "blue",
      title: `Top delay driver: ${biggestDriver.label}`,
      body: `${biggestDriver.label} represents ${biggestDriver.totalDays} modeled delay days and ~$${biggestDriver.revenueExposure.toLocaleString()} of exposure.`,
    });
  }

  const bestVendor = vendorAnalytics[0];
  if (bestVendor) {
    insights.push({
      tone: "emerald",
      title: `Strongest vendor signal: ${bestVendor.vendor}`,
      body: `${bestVendor.vendor} leads with score ${bestVendor.score}, on-time rate ${bestVendor.onTimeRate}%, and quality ${bestVendor.qualityRate}%.`,
    });
  }

  if (actionAnalytics.totalActions > 0) {
    insights.push({
      tone: "blue",
      title: "Operator actions are reducing delay exposure",
      body: `${actionAnalytics.totalActions} completed actions have avoided ${actionAnalytics.totalDaysAvoided} delay days and saved $${actionAnalytics.totalVacancySavings.toLocaleString()} in projected vacancy.`,
    });
  }

  return insights.slice(0, 5);
}

function buildSummary(rows) {
  return {
    avgRisk: Math.round(average(rows.map((property) => property.risk || 0))),
    avgReadiness: Math.round(average(rows.map((property) => property.readiness || 0))),
    avgStageAge: Number(average(rows.map((property) => property.daysInStage || 0)).toFixed(1)),
    avgConfidence: Math.round(average(rows.map((property) => property.timelineConfidence || 0))),
    blockedTurns: rows.filter((property) => property.turnStatus === "Blocked").length,
    overSlaTurns: rows.filter(
      (property) => (property.daysInStage || 0) > getStageSla(property.currentStage)
    ).length,
  };
}

function renderKpiDelta(currentValue, baselineValue, suffix = "", goodWhenHigher = false) {
  const delta = Math.round((currentValue - baselineValue) * 10) / 10;
  const { tone, label } = formatDelta(delta, suffix, goodWhenHigher);

  return (
    <div
      className={`mt-2 text-xs font-medium ${
        tone === "green"
          ? "text-emerald-600"
          : tone === "red"
          ? "text-red-600"
          : "text-slate-400"
      }`}
    >
      {label} vs Current
    </div>
  );
}

function CapacityBar({ value }) {
  const tone = getCapacityTone(value);
  const barClass =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-[44px] text-xs text-slate-500">{value}%</div>
      <div className="h-3 w-full min-w-[160px] rounded-full bg-slate-100">
        <div
          className={`h-3 rounded-full ${barClass}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsTab({ properties, actionHistory = [] }) {
  const [horizon, setHorizon] = useState("Current");

  const currentProperties = useMemo(
    () => properties.filter((property) => isInHorizon(property, "Current")),
    [properties]
  );

  const scopedProperties = useMemo(
    () => properties.filter((property) => isInHorizon(property, horizon)),
    [properties, horizon]
  );

  const stageAnalytics = useMemo(
    () => getStageAnalytics(scopedProperties),
    [scopedProperties]
  );

  const marketAnalytics = useMemo(
    () => getMarketAnalytics(scopedProperties),
    [scopedProperties]
  );

  const delayDrivers = useMemo(
    () => getDelayDriverAnalytics(scopedProperties),
    [scopedProperties]
  );

  const vendorAnalytics = useMemo(
    () => getVendorAnalytics(scopedProperties),
    [scopedProperties]
  );

  const riskBands = useMemo(
    () => getRiskBands(scopedProperties),
    [scopedProperties]
  );

  const actionAnalytics = useMemo(
    () => getActionAnalytics(actionHistory),
    [actionHistory]
  );

  const insights = useMemo(
    () => getInsights(stageAnalytics, marketAnalytics, vendorAnalytics, delayDrivers, actionAnalytics),
    [stageAnalytics, marketAnalytics, vendorAnalytics, delayDrivers, actionAnalytics]
  );

  const summary = useMemo(() => buildSummary(scopedProperties), [scopedProperties]);
  const baselineSummary = useMemo(() => buildSummary(currentProperties), [currentProperties]);

  const maxStageDays = Math.max(...stageAnalytics.map((item) => item.avgDays), 1);
  const maxDelayExposure = Math.max(...delayDrivers.map((item) => item.revenueExposure), 1);
  const hasOperatorData = actionAnalytics.totalActions > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Analytics</div>
          <div className="mt-1 text-sm text-slate-500">
            Performance, bottlenecks, vendor outcomes, TurnIQ-computed risk/readiness, delay drivers, and operator learning.
          </div>
        </div>

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
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Risk</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.avgRisk}</div>
          <div className="mt-1 text-sm text-slate-500">TurnIQ-computed portfolio risk</div>
          {renderKpiDelta(summary.avgRisk, baselineSummary.avgRisk)}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Readiness</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.avgReadiness}</div>
          <div className="mt-1 text-sm text-slate-500">TurnIQ-computed readiness</div>
          {renderKpiDelta(summary.avgReadiness, baselineSummary.avgReadiness, "", true)}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Days In Stage</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.avgStageAge}</div>
          <div className="mt-1 text-sm text-slate-500">Stage aging signal</div>
          {renderKpiDelta(summary.avgStageAge, baselineSummary.avgStageAge)}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">AI Confidence</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.avgConfidence}%</div>
          <div className="mt-1 text-sm text-slate-500">Modeled timeline confidence</div>
          {renderKpiDelta(summary.avgConfidence, baselineSummary.avgConfidence, "%", true)}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Blocked Turns</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.blockedTurns}</div>
          <div className="mt-1 text-sm text-slate-500">Current execution blockers</div>
          {renderKpiDelta(summary.blockedTurns, baselineSummary.blockedTurns)}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Over-SLA Turns</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.overSlaTurns}</div>
          <div className="mt-1 text-sm text-slate-500">Stage pressure above target</div>
          {renderKpiDelta(summary.overSlaTurns, baselineSummary.overSlaTurns)}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Stage performance</div>
            <div className="mt-1 text-sm text-slate-500">
              Average time in stage plus blocked and over-SLA pressure.
            </div>

            <div className="mt-5 space-y-4">
              {stageAnalytics.map((item) => (
                <div key={item.stage}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{item.stage}</div>
                    <div className="text-xs text-slate-500">
                      {item.count} turns • avg {item.avgDays}d • SLA {item.sla}d
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-3 flex-1 rounded-full bg-slate-100">
                      <div
                        className={`h-3 rounded-full ${
                          item.avgDays > item.sla ? "bg-amber-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${(item.avgDays / maxStageDays) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-xs text-slate-500">
                      {item.overSlaPct}% over SLA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Market pressure</div>
            <div className="mt-1 text-sm text-slate-500">
              Relative market load based on TurnIQ-computed risk, blocked turns, and stage pressure.
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {marketAnalytics.map((market) => (
                <div
                  key={market.market}
                  className={`rounded-2xl border p-4 ${
                    market.avgRisk >= 75
                      ? "border-red-200 bg-red-50"
                      : market.avgRisk >= 60
                      ? "border-amber-200 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{market.market}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {market.openTurns} turns • {market.blocked} blocked • {market.overSla} over SLA
                      </div>
                    </div>
                    <Pill tone={getRiskTone(market.avgRisk)}>{market.avgRisk}</Pill>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      Avg Readiness
                    </div>
                    <ProgressBar value={market.avgReadiness} tone="blue" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Delay driver contribution</div>
            <div className="mt-1 text-sm text-slate-500">
              Which modeled issues are contributing the most exposure.
            </div>

            <div className="mt-5 space-y-4">
              {delayDrivers.map((driver) => (
                <div key={driver.label}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{driver.label}</div>
                    <div className="text-xs text-slate-500">
                      ${driver.revenueExposure.toLocaleString()} • avg {driver.avgDays}d
                    </div>
                  </div>

                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-red-500"
                      style={{ width: `${(driver.revenueExposure / maxDelayExposure) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Vendor performance</div>
            <div className="mt-1 text-sm text-slate-500">
              Performance summary based on timing, quality, TurnIQ-computed risk/readiness, and current capacity.
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Markets</th>
                    <th className="px-3 py-2 font-medium">Jobs</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">On-Time</th>
                    <th className="px-3 py-2 font-medium">Quality</th>
                    <th className="px-3 py-2 font-medium">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorAnalytics.map((vendor, index) => (
                    <tr key={vendor.vendor} className="border-b border-slate-50">
                      <td className="px-3 py-3 font-medium text-slate-500">{index + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{vendor.vendor}</td>
                      <td className="px-3 py-3 text-slate-600">{vendor.markets}</td>
                      <td className="px-3 py-3">{vendor.jobs}</td>
                      <td className="px-3 py-3">
                        <Pill tone={vendor.score >= 90 ? "green" : vendor.score >= 80 ? "blue" : "amber"}>
                          {vendor.score}
                        </Pill>
                      </td>
                      <td className="px-3 py-3">{vendor.onTimeRate}%</td>
                      <td className="px-3 py-3">{vendor.qualityRate}%</td>
                      <td className="px-3 py-3">
                        <CapacityBar value={vendor.capacity} />
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
        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Risk distribution</div>
            <div className="mt-1 text-sm text-slate-500">
              Current portfolio mix by TurnIQ-computed risk band.
            </div>

            <div className="mt-5">
              <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-red-500"
                  style={{
                    width: `${scopedProperties.length ? (riskBands.high / scopedProperties.length) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-amber-400"
                  style={{
                    width: `${scopedProperties.length ? (riskBands.watch / scopedProperties.length) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${scopedProperties.length ? (riskBands.healthy / scopedProperties.length) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-red-700">High Risk</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{riskBands.high}</div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Watch</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{riskBands.watch}</div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">Healthy</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{riskBands.healthy}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">TurnIQ operating insights</div>
            <div className="mt-1 text-sm text-slate-500">
              Synthesized takeaways from performance, vendor outcomes, delay drivers, and actions.
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {insights.map((insight, idx) => (
                <div
                  key={`${insight.title}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    insight.tone === "red"
                      ? "border-red-200 bg-red-50"
                      : insight.tone === "amber"
                      ? "border-amber-200 bg-amber-50"
                      : insight.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{insight.title}</div>
                  <div className="mt-2 text-sm text-slate-700">{insight.body}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {hasOperatorData ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <Card className="h-full">
              <div className="text-xl font-semibold text-slate-900">Operator performance loop</div>
              <div className="mt-1 text-sm text-slate-500">
                Impact generated from action center execution.
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Actions Completed</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {actionAnalytics.totalActions}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Avg Response Time</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {actionAnalytics.avgResponseMinutes}m
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Delay Days Avoided</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {actionAnalytics.totalDaysAvoided}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Vacancy Savings</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    ${actionAnalytics.totalVacancySavings.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-6">
            <Card className="h-full">
              <div className="text-xl font-semibold text-slate-900">Operator leaderboard</div>
              <div className="mt-1 text-sm text-slate-500">
                Ranked by execution impact and modeled savings.
              </div>

              <div className="mt-5 space-y-3">
                {actionAnalytics.operatorLeaderboard.map((operator, index) => (
                  <div
                    key={operator.operator}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{operator.operator}</div>
                        <div className="text-sm text-slate-500">
                          {operator.actions} actions • {operator.daysAvoided} days avoided
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      ${operator.savings.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <div className="text-xl font-semibold text-slate-900">Operator performance</div>
          <div className="mt-1 text-sm text-slate-500">No operator activity yet.</div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <div className="text-sm text-slate-600">
              Complete actions from the control center to start tracking performance impact.
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Metrics will include delay days avoided, response time, and vacancy savings.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}