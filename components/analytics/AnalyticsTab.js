"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

const HORIZONS = ["Current", "Next 7 Days", "Next 14 Days", "All Active"];

function getToneFromRisk(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "emerald";
}

function isInHorizon(property, horizon) {
  if (horizon === "All Active") return true;

  const today = new Date("2026-05-07");
  const ecd = new Date(property.projectedCompletion);
  const diffDays = Math.ceil((ecd - today) / (1000 * 60 * 60 * 24));

  if (horizon === "Current") return true;
  if (horizon === "Next 7 Days") return diffDays <= 7;
  if (horizon === "Next 14 Days") return diffDays <= 14;

  return true;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
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
  ];

  return stages.map((stage) => {
    const items = rows.filter((r) => r.currentStage === stage);
    const count = items.length;
    const avgDays = count ? average(items.map((r) => r.daysInStage || 0)) : 0;
    const blockedPct = count
      ? Math.round((items.filter((r) => r.turnStatus === "Blocked").length / count) * 100)
      : 0;

    return {
      stage,
      count,
      avgDays: Number(avgDays.toFixed(1)),
      blockedPct,
    };
  });
}

function getMarketAnalytics(rows) {
  return Array.from(new Set(rows.map((r) => r.market)))
    .map((market) => {
      const items = rows.filter((r) => r.market === market);
      return {
        market,
        openTurns: items.length,
        avgRisk: Math.round(average(items.map((r) => r.risk))),
        avgReadiness: Math.round(average(items.map((r) => r.readiness))),
        blocked: items.filter((r) => r.turnStatus === "Blocked").length,
        pastDue: items.filter(
          (r) => new Date(r.projectedCompletion) < new Date("2026-05-07")
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
        map[driver.label] = { label: driver.label, totalDays: 0, appearances: 0 };
      }
      map[driver.label].totalDays += driver.days;
      map[driver.label].appearances += 1;
    });
  });

  return Object.values(map)
    .map((item) => ({
      ...item,
      avgDays: Number((item.totalDays / item.appearances).toFixed(1)),
    }))
    .sort((a, b) => b.totalDays - a.totalDays)
    .slice(0, 6);
}

function getVendorAnalytics(rows) {
  const vendors = Array.from(new Set(rows.map((r) => r.vendor).filter(Boolean)));

  return vendors
    .map((vendor) => {
      const items = rows.filter((r) => r.vendor === vendor);
      const onTimeRate = Math.max(
        72,
        Math.min(
          98,
          Math.round(
            100 -
              average(
                items.map((r) => {
                  if (r.turnStatus === "Blocked") return 22;
                  if (r.risk >= 80) return 14;
                  if (r.risk >= 70) return 9;
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
              items.map((r) => {
                if (r.readiness >= 90) return 95;
                if (r.readiness >= 75) return 90;
                if (r.readiness >= 60) return 84;
                return 78;
              })
            )
          )
        )
      );

      const avgRisk = Math.round(average(items.map((r) => r.risk)));
      const jobs = items.length;
      const score = Math.round((onTimeRate * 0.4) + (qualityRate * 0.35) + ((100 - avgRisk) * 0.25));
      const capacity = Math.min(96, 45 + jobs * 18 + (100 - avgRisk) * 0.25);

      return {
        vendor,
        jobs,
        avgRisk,
        onTimeRate,
        qualityRate,
        score,
        capacity: Math.round(capacity),
        markets: Array.from(new Set(items.map((r) => r.market))).join(", "),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function getRiskBands(rows) {
  return {
    high: rows.filter((r) => r.risk >= 75).length,
    watch: rows.filter((r) => r.risk >= 60 && r.risk < 75).length,
    healthy: rows.filter((r) => r.risk < 60).length,
  };
}

function getInsights(rows, stageAnalytics, marketAnalytics, vendorAnalytics, delayDrivers) {
  const insights = [];

  const worstStage = [...stageAnalytics].sort((a, b) => b.avgDays - a.avgDays)[0];
  if (worstStage && worstStage.count > 0) {
    insights.push({
      tone: "amber",
      title: `Stage bottleneck: ${worstStage.stage}`,
      body: `${worstStage.count} turns are sitting in ${worstStage.stage} for an average of ${worstStage.avgDays} days.`,
    });
  }

  const worstMarket = marketAnalytics[0];
  if (worstMarket) {
    insights.push({
      tone: worstMarket.avgRisk >= 75 ? "red" : "amber",
      title: `Highest-risk market: ${worstMarket.market}`,
      body: `${worstMarket.market} is averaging risk ${worstMarket.avgRisk} across ${worstMarket.openTurns} open turns.`,
    });
  }

  const biggestDriver = delayDrivers[0];
  if (biggestDriver) {
    insights.push({
      tone: "blue",
      title: `Top delay driver: ${biggestDriver.label}`,
      body: `${biggestDriver.label} is contributing ${biggestDriver.totalDays} total modeled delay days across active turns.`,
    });
  }

  const bestVendor = vendorAnalytics[0];
  if (bestVendor) {
    insights.push({
      tone: "emerald",
      title: `Best-performing vendor: ${bestVendor.vendor}`,
      body: `${bestVendor.vendor} leads with score ${bestVendor.score}, on-time rate ${bestVendor.onTimeRate}%, and quality ${bestVendor.qualityRate}%.`,
    });
  }

  return insights.slice(0, 4);
}

export default function AnalyticsTab({ properties }) {
  const [horizon, setHorizon] = useState("Current");

  const scopedProperties = useMemo(
    () => properties.filter((p) => isInHorizon(p, horizon)),
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

  const insights = useMemo(
    () =>
      getInsights(
        scopedProperties,
        stageAnalytics,
        marketAnalytics,
        vendorAnalytics,
        delayDrivers
      ),
    [scopedProperties, stageAnalytics, marketAnalytics, vendorAnalytics, delayDrivers]
  );

  const avgRisk = Math.round(average(scopedProperties.map((p) => p.risk)));
  const avgReadiness = Math.round(average(scopedProperties.map((p) => p.readiness)));
  const avgStageAge = Number(
    average(scopedProperties.map((p) => p.daysInStage || 0)).toFixed(1)
  );
  const avgConfidence = Math.round(
    average(scopedProperties.map((p) => p.timelineConfidence || 0))
  );

  const maxStageDays = Math.max(...stageAnalytics.map((s) => s.avgDays), 1);
  const maxDelayDays = Math.max(...delayDrivers.map((d) => d.totalDays), 1);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Analytics</div>
          <div className="mt-1 text-sm text-slate-500">
            Analyze bottlenecks, market risk, vendor performance, and modeled delay drivers.
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

      {/* KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Portfolio Risk</div>
          <div className="mt-3 flex items-center gap-2">
  <div className="text-3xl font-semibold text-slate-900">
    {avgConfidence}%
  </div>
  <span className="text-sm text-emerald-500">↑4</span>
</div>

<div className="mt-1 text-xs text-slate-400">
  vs last week
</div>
          <div className="mt-2 text-sm text-slate-500">Across scoped active turns</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Readiness</div>
          <div className="mt-3 flex items-center gap-2">
  <div className="text-3xl font-semibold text-slate-900">
    {avgConfidence}%
  </div>
  <span className="text-sm text-emerald-500">↑4</span>
</div>

<div className="mt-1 text-xs text-slate-400">
  vs last week
</div>
          <div className="mt-2 text-sm text-slate-500">Portfolio execution readiness</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg Days In Stage</div>
          <div className="mt-3 flex items-center gap-2">
  <div className="text-3xl font-semibold text-slate-900">
    {avgConfidence}%
  </div>
  <span className="text-sm text-emerald-500">↑4</span>
</div>

<div className="mt-1 text-xs text-slate-400">
  vs last week
</div>
          <div className="mt-2 text-sm text-slate-500">Current stage aging</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">AI Confidence</div>
          <div className="mt-3 flex items-center gap-2">
  <div className="text-3xl font-semibold text-slate-900">
    {avgConfidence}%
  </div>
  <span className="text-sm text-emerald-500">↑4</span>
</div>

<div className="mt-1 text-xs text-slate-400">
  vs last week
</div>
          <div className="mt-2 text-sm text-slate-500">Average modeled timeline confidence</div>
        </Card>
      </div>

      {/* ROW 1 */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* STAGE BOTTLENECK */}
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Stage Bottleneck Analysis</div>
            <div className="mt-1 text-sm text-slate-500">
              Average days spent in each stage across the scoped turn set.
            </div>

            <div className="mt-5">
  <div className="mb-3 grid grid-cols-[1fr_72px] gap-3">
    <div className="flex justify-between px-1 text-[11px] uppercase tracking-wide text-slate-400">
      <span>0d</span>
      <span>{Math.ceil(maxStageDays / 4)}d</span>
      <span>{Math.ceil(maxStageDays / 2)}d</span>
      <span>{Math.ceil((maxStageDays * 3) / 4)}d</span>
      <span>{Math.ceil(maxStageDays)}d</span>
    </div>
    <div />
  </div>

  <div className="space-y-4">
    {stageAnalytics.map((item) => (
      <div key={item.stage}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-800">{item.stage}</div>
          <div className="text-xs text-slate-500">
            {item.count} turns • {item.avgDays} days
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 rounded-full bg-slate-100">
            <div
              className={`h-3 rounded-full ${
                item.avgDays === maxStageDays
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${(item.avgDays / maxStageDays) * 100}%` }}
            />
          </div>
          <div className="w-16 text-right text-xs text-slate-500">
            {item.blockedPct}% blocked
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
          </Card>
        </div>

        {/* MARKET HEATMAP */}
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Market Risk Heatmap</div>
            <div className="mt-1 text-sm text-slate-500">
              Relative market pressure based on open turns, blocked turns, and average risk.
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
                        {market.openTurns} turns • {market.blocked} blocked • {market.pastDue} past due
                      </div>
                    </div>
                    <Pill tone={getToneFromRisk(market.avgRisk)}>{market.avgRisk}</Pill>
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

      {/* ROW 2 */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* DELAY DRIVERS */}
        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Delay Driver Contribution</div>
            <div className="mt-1 text-sm text-slate-500">
              Which modeled issues are contributing the most total delay exposure.
            </div>

            <div className="mt-5 space-y-4">
              {delayDrivers.map((driver) => (
                <div key={driver.label}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{driver.label}</div>
                    <div className="text-xs text-slate-500">
                      {driver.totalDays} total days • avg {driver.avgDays}
                    </div>
                  </div>

                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-red-500"
                      style={{ width: `${(driver.totalDays / maxDelayDays) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* VENDOR PERFORMANCE */}
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Vendor Performance Leaderboard</div>
            <div className="mt-1 text-sm text-slate-500">
              Performance summary based on timing, quality, average risk, and current capacity.
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">#</th>  
<th className="px-3 py-2 font-medium">#</th>
<th className="px-3 py-2 font-medium">Vendor</th>
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

  <td className="px-3 py-3 text-slate-500 font-medium">
    {index + 1}
  </td>

  <td className="px-3 py-3 font-medium text-slate-900">
    {vendor.vendor}
  </td>
                      <td className="px-3 py-3 text-slate-600">{vendor.markets}</td>
                      <td className="px-3 py-3">{vendor.jobs}</td>
                      <td className="px-3 py-3">
                        <Pill tone={vendor.score >= 90 ? "emerald" : vendor.score >= 80 ? "blue" : "amber"}>
                          {vendor.score}
                        </Pill>
                      </td>
                      <td className="px-3 py-3">{vendor.onTimeRate}%</td>
                      <td className="px-3 py-3">{vendor.qualityRate}%</td>
                      <td className="px-3 py-3 w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="min-w-[44px] text-xs text-slate-500">{vendor.capacity}%</div>
                          <div className="flex-1">
                            <ProgressBar
                              value={vendor.capacity}
                              tone={vendor.capacity >= 80 ? "red" : vendor.capacity >= 65 ? "amber" : "emerald"}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ROW 3 */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* RISK DISTRIBUTION */}
        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Risk Distribution</div>
            <div className="mt-1 text-sm text-slate-500">
              Current portfolio mix by risk classification.
            </div>

            <div className="mt-5">
              <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-red-500"
                  style={{
                    width: `${
                      scopedProperties.length
                        ? (riskBands.high / scopedProperties.length) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-amber-400"
                  style={{
                    width: `${
                      scopedProperties.length
                        ? (riskBands.watch / scopedProperties.length) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${
                      scopedProperties.length
                        ? (riskBands.healthy / scopedProperties.length) * 100
                        : 0
                    }%`,
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

        {/* AI INSIGHTS */}
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">TurnIQ Operating Insights</div>
            <div className="mt-1 text-sm text-slate-500">
              AI-generated operating takeaways from current turn performance and predicted execution risk.
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
    </div>
  );
}