"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

const VENDOR_PROFILE = {
  FloorCo: {
    score: 92,
    onTimeRate: 94,
    qualityRate: 91,
    avgBidVariance: 6,
    avgCycleDays: 4.8,
    capacityUtilization: 78,
    preferredMarkets: ["Dallas"],
    strengths: ["Flooring quality", "Fast dispatch", "Low rework"],
    concerns: ["Weekend availability limited"],
    contracts: "Preferred",
  },
  "ABC Paint": {
    score: 88,
    onTimeRate: 89,
    qualityRate: 90,
    avgBidVariance: 4,
    avgCycleDays: 3.9,
    capacityUtilization: 63,
    preferredMarkets: ["Atlanta"],
    strengths: ["Paint turnaround", "Low cost rank", "Strong SLA compliance"],
    concerns: ["Appliance coordination dependency"],
    contracts: "Preferred",
  },
  Sparkle: {
    score: 91,
    onTimeRate: 96,
    qualityRate: 87,
    avgBidVariance: 3,
    avgCycleDays: 2.4,
    capacityUtilization: 71,
    preferredMarkets: ["Dallas", "Nashville"],
    strengths: ["Fast cleans", "Flexible capacity", "Low cancellation rate"],
    concerns: ["Limited heavy-turn capability"],
    contracts: "Approved",
  },
  CoolAir: {
    score: 79,
    onTimeRate: 82,
    qualityRate: 84,
    avgBidVariance: 8,
    avgCycleDays: 5.7,
    capacityUtilization: 87,
    preferredMarkets: ["Phoenix"],
    strengths: ["HVAC specialty", "Complex turn coverage"],
    concerns: ["Approval lag impact", "Higher cost variability"],
    contracts: "Approved",
  },
  "Prime Paint": {
    score: 83,
    onTimeRate: 85,
    qualityRate: 86,
    avgBidVariance: 7,
    avgCycleDays: 4.5,
    capacityUtilization: 81,
    preferredMarkets: ["Phoenix"],
    strengths: ["Trade coordination", "Paint + flooring overlap"],
    concerns: ["Moderate rework rate"],
    contracts: "Approved",
  },
};

function getToneFromScore(score) {
  if (score >= 90) return "emerald";
  if (score >= 80) return "blue";
  if (score >= 70) return "amber";
  return "red";
}

function getCapacityTone(utilization) {
  if (utilization >= 85) return "red";
  if (utilization >= 70) return "amber";
  return "emerald";
}

function getCapacityLabel(utilization) {
  if (utilization >= 85) return "Capacity Risk";
  if (utilization >= 70) return "Watch";
  return "Healthy";
}

function getVendorStatus(row) {
  if (row.capacityUtilization >= 90) return "Restricted";
  if (row.contracts === "Preferred") return "Preferred";
  if (row.capacityUtilization >= 85) return "Watchlist";
  return "Approved";
}

function getVendorStatusTone(status) {
  if (status === "Preferred") return "blue";
  if (status === "Approved") return "emerald";
  if (status === "Watchlist") return "amber";
  return "red";
}

function buildVendorRows(properties) {
  const grouped = {};

  properties.forEach((property) => {
    const vendor = property.vendor || "Unassigned";

    if (!grouped[vendor]) {
      grouped[vendor] = {
        vendor,
        jobs: 0,
        markets: new Set(),
        totalRisk: 0,
        highRiskJobs: 0,
        blockedJobs: 0,
        ecdThisWeek: 0,
      };
    }

    grouped[vendor].jobs += 1;
    grouped[vendor].markets.add(property.market);
    grouped[vendor].totalRisk += property.risk || 0;

    if ((property.risk || 0) >= 75) grouped[vendor].highRiskJobs += 1;
    if (property.turnStatus === "Blocked") grouped[vendor].blockedJobs += 1;
    if (["2026-05-06", "2026-05-08"].includes(property.projectedCompletion)) {
      grouped[vendor].ecdThisWeek += 1;
    }
  });

  return Object.values(grouped)
    .map((row) => {
      const profile = VENDOR_PROFILE[row.vendor] || {
        score: 80,
        onTimeRate: 85,
        qualityRate: 85,
        avgBidVariance: 6,
        avgCycleDays: 4.5,
        capacityUtilization: 70,
        preferredMarkets: [],
        strengths: ["General coverage"],
        concerns: ["Needs more performance history"],
        contracts: "Approved",
      };

      const merged = {
        vendor: row.vendor,
        jobs: row.jobs,
        markets: Array.from(row.markets),
        avgRisk: Math.round(row.totalRisk / row.jobs),
        highRiskJobs: row.highRiskJobs,
        blockedJobs: row.blockedJobs,
        ecdThisWeek: row.ecdThisWeek,
        ...profile,
      };

      return {
        ...merged,
        status: getVendorStatus(merged),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildVendorInsights(rows) {
  const insights = [];

  rows.forEach((row) => {
    if (row.capacityUtilization >= 85) {
      insights.push({
        vendor: row.vendor,
        tone: "red",
        title: "Capacity pressure",
        text: `${row.vendor} is running at ${row.capacityUtilization}% utilization and may struggle to absorb more work without ECD risk.`,
      });
    }

    if (row.highRiskJobs >= 1) {
      insights.push({
        vendor: row.vendor,
        tone: "amber",
        title: "Risk concentration",
        text: `${row.vendor} currently has ${row.highRiskJobs} high-risk turn${row.highRiskJobs > 1 ? "s" : ""} in flight.`,
      });
    }

    if (row.score >= 90 && row.onTimeRate >= 94) {
      insights.push({
        vendor: row.vendor,
        tone: "emerald",
        title: "Expansion candidate",
        text: `${row.vendor} is outperforming peers on scorecard and on-time delivery. Consider expanding share in ${row.markets.join(", ")}.`,
      });
    }
  });

  return insights.slice(0, 6);
}

export default function VendorsTab({ properties }) {
  const vendorRows = useMemo(() => buildVendorRows(properties), [properties]);
  const insights = useMemo(() => buildVendorInsights(vendorRows), [vendorRows]);

  const [selectedVendor, setSelectedVendor] = useState(vendorRows[0]?.vendor || "");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [sortBy, setSortBy] = useState("Score");

  const filteredVendorRows = useMemo(() => {
    let rows = [...vendorRows];

    if (vendorFilter === "Capacity Risk Vendors") {
      rows = rows.filter((row) => row.capacityUtilization >= 85);
    }
    if (vendorFilter === "Preferred Vendors") {
      rows = rows.filter((row) => row.status === "Preferred");
    }
    if (vendorFilter === "High Risk Exposure") {
      rows = rows.filter((row) => row.highRiskJobs > 0);
    }
    if (vendorFilter === "Covered Markets") {
      rows = rows.filter((row) => row.markets.length > 0);
    }

    if (sortBy === "Score") {
      rows.sort((a, b) => b.score - a.score);
    } else if (sortBy === "Capacity") {
      rows.sort((a, b) => b.capacityUtilization - a.capacityUtilization);
    } else if (sortBy === "On-Time") {
      rows.sort((a, b) => b.onTimeRate - a.onTimeRate);
    } else if (sortBy === "Risk") {
      rows.sort((a, b) => b.avgRisk - a.avgRisk);
    }

    return rows;
  }, [vendorRows, vendorFilter, sortBy]);

  useEffect(() => {
    if (!filteredVendorRows.length) return;

    const stillVisible = filteredVendorRows.find((row) => row.vendor === selectedVendor);
    if (!stillVisible) {
      setSelectedVendor(filteredVendorRows[0].vendor);
    }
  }, [filteredVendorRows, selectedVendor]);

  const selectedVendorRow =
    filteredVendorRows.find((row) => row.vendor === selectedVendor) ||
    vendorRows.find((row) => row.vendor === selectedVendor) ||
    filteredVendorRows[0] ||
    vendorRows[0];

  const summary = useMemo(() => {
    const activeVendors = vendorRows.length;
    const avgScore = activeVendors
      ? Math.round(vendorRows.reduce((sum, row) => sum + row.score, 0) / activeVendors)
      : 0;
    const avgOnTime = activeVendors
      ? Math.round(vendorRows.reduce((sum, row) => sum + row.onTimeRate, 0) / activeVendors)
      : 0;
    const atRiskCapacity = vendorRows.filter((row) => row.capacityUtilization >= 85).length;
    const coveredMarkets = new Set(vendorRows.flatMap((row) => row.markets)).size;
    const preferredVendors = vendorRows.filter((row) => row.status === "Preferred").length;

    return {
      activeVendors,
      avgScore,
      avgOnTime,
      atRiskCapacity,
      coveredMarkets,
      preferredVendors,
    };
  }, [vendorRows]);

  if (!selectedVendorRow) {
    return (
      <div className="text-sm text-slate-500">
        No vendor data available for this market selection.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-slate-900">Vendors</div>
        <div className="mt-1 text-sm text-slate-500">
          Enterprise vendor scorecards, capacity monitoring, and market-level sourcing insights.
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <button onClick={() => setVendorFilter("All Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Active Vendors</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.activeVendors}
            </div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("Preferred Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Avg Scorecard</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.avgScore}
            </div>
            <div className="mt-2 text-sm text-slate-500">click to review preferred vendors</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("All Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Avg On-Time %</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.avgOnTime}%
            </div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("Capacity Risk Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Capacity Risk Vendors</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.atRiskCapacity}
            </div>
            <div className="mt-2 text-sm text-slate-500">click to filter risk vendors</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("Covered Markets")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Covered Markets</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.coveredMarkets}
            </div>
          </Card>
        </button>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium text-slate-700">Filter:</div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm">{vendorFilter}</div>

        <button
          onClick={() => setVendorFilter("All Vendors")}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          Reset
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-sm font-medium text-slate-700">Sort:</div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option>Score</option>
            <option>Capacity</option>
            <option>On-Time</option>
            <option>Risk</option>
          </select>
        </div>
      </div>

      {/* ROW 1 */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* SCORECARD TABLE */}
        <div className="xl:col-span-8">
          <Card className="h-full">
            <div className="mb-4">
              <div className="text-xl font-semibold text-slate-900">Vendor Scorecard</div>
              <div className="mt-1 text-sm text-slate-500">
                Compare performance, risk, timing, and capacity by vendor.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Markets</th>
                    <th className="px-3 py-2 font-medium">Jobs</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">On-Time</th>
                    <th className="px-3 py-2 font-medium">Avg Risk</th>
                    <th className="px-3 py-2 font-medium">Capacity</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendorRows.map((row) => {
                    const selected = row.vendor === selectedVendor;

                    return (
                      <tr
                        key={row.vendor}
                        className={`border-b border-slate-50 ${
                          selected ? "bg-slate-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-3 font-medium text-slate-900">{row.vendor}</td>
                        <td className="px-3 py-3 text-slate-600">{row.markets.join(", ")}</td>
                        <td className="px-3 py-3">{row.jobs}</td>
                        <td className="px-3 py-3">
                          <Pill tone={getToneFromScore(row.score)}>{row.score}</Pill>
                        </td>
                        <td className="px-3 py-3">{row.onTimeRate}%</td>
                        <td className="px-3 py-3">{row.avgRisk}</td>
                        <td className="min-w-[170px] px-3 py-3">
                          <div className="space-y-2">
                            <ProgressBar
                              value={row.capacityUtilization}
                              tone={getCapacityTone(row.capacityUtilization)}
                            />
                            <div className="text-xs text-slate-500">
                              {row.capacityUtilization}% • {getCapacityLabel(row.capacityUtilization)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setSelectedVendor(row.vendor)}
                            className={`rounded-xl border px-3 py-2 text-sm ${
                              selected
                                ? "border-blue-600 text-blue-700"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {selected ? "Opened" : "Open"}
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

        {/* VENDOR DETAIL */}
        <div className="space-y-6 xl:col-span-4">
          <Card>
            <div className="text-xl font-semibold text-slate-900">{selectedVendorRow.vendor}</div>
            <div className="mt-1 text-sm text-slate-500">
              Detailed performance and operating profile
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={getToneFromScore(selectedVendorRow.score)}>
                Score {selectedVendorRow.score}
              </Pill>
              <Pill tone={getVendorStatusTone(selectedVendorRow.status)}>
                {selectedVendorRow.status}
              </Pill>
              <Pill tone={getCapacityTone(selectedVendorRow.capacityUtilization)}>
                {getCapacityLabel(selectedVendorRow.capacityUtilization)}
              </Pill>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">On-Time Rate</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedVendorRow.onTimeRate}%
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Quality Rate</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedVendorRow.qualityRate}%
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg Cycle Days</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedVendorRow.avgCycleDays}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Bid Variance</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {selectedVendorRow.avgBidVariance}%
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-900">Preferred Markets</div>
              <div className="flex flex-wrap gap-2">
                {selectedVendorRow.preferredMarkets.map((market) => (
                  <Pill key={market} tone="blue">
                    {market}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-900">Strengths</div>
              <div className="space-y-2">
                {selectedVendorRow.strengths.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-900">Concerns</div>
              <div className="space-y-2">
                {selectedVendorRow.concerns.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Vendor Capacity Outlook</div>
            <div className="mt-1 text-sm text-slate-500">
              Forecasted upcoming workload and concentration risk by vendor.
            </div>

            <div className="mt-4 space-y-4">
              {filteredVendorRows.map((row) => (
                <div key={row.vendor} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{row.vendor}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {row.jobs} active turn{row.jobs > 1 ? "s" : ""} • {row.ecdThisWeek} due this week
                      </div>
                    </div>
                    <Pill tone={getCapacityTone(row.capacityUtilization)}>
                      {getCapacityLabel(row.capacityUtilization)}
                    </Pill>
                  </div>

                  <div className="mt-3">
                    <ProgressBar
                      value={row.capacityUtilization}
                      tone={getCapacityTone(row.capacityUtilization)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">TurnIQ Vendor Insights</div>
            <div className="mt-1 text-sm text-slate-500">
              AI-generated operating guidance based on vendor mix, risk, and load.
            </div>

            <div className="mt-4 space-y-3">
              {insights.map((insight, idx) => (
                <div
                  key={`${insight.vendor}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    insight.tone === "red"
                      ? "border-red-200 bg-red-50"
                      : insight.tone === "amber"
                      ? "border-amber-200 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {insight.vendor} • {insight.title}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{insight.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}