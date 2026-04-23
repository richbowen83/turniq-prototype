"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

const VENDOR_PROFILE = {
  FloorCo: {
    quality: 92,
    speed: 88,
    reliability: 91,
    cost: 74,
    onTimeRate: 94,
    qualityRate: 91,
    avgBidVariance: 6,
    avgCycleDays: 4.8,
    capacityUtilization: 78,
    preferredMarkets: ["Dallas"],
    strengths: ["Flooring quality", "Fast dispatch", "Low rework"],
    concerns: ["Weekend availability limited"],
    contracts: "Preferred",
    recommendationCount: 7,
    selectedCount: 5,
    trades: ["Flooring", "Paint", "General", "Flooring + Paint"],
  },
  "ABC Paint": {
    quality: 90,
    speed: 89,
    reliability: 88,
    cost: 81,
    onTimeRate: 89,
    qualityRate: 90,
    avgBidVariance: 4,
    avgCycleDays: 3.9,
    capacityUtilization: 63,
    preferredMarkets: ["Atlanta"],
    strengths: ["Paint turnaround", "Low cost rank", "Strong SLA compliance"],
    concerns: ["Appliance coordination dependency"],
    contracts: "Preferred",
    recommendationCount: 6,
    selectedCount: 4,
    trades: ["Paint", "Patch", "Paint + Patch", "General"],
  },
  Sparkle: {
    quality: 87,
    speed: 95,
    reliability: 93,
    cost: 85,
    onTimeRate: 96,
    qualityRate: 87,
    avgBidVariance: 3,
    avgCycleDays: 2.4,
    capacityUtilization: 71,
    preferredMarkets: ["Dallas", "Nashville"],
    strengths: ["Fast cleans", "Flexible capacity", "Low cancellation rate"],
    concerns: ["Limited heavy-turn capability"],
    contracts: "Approved",
    recommendationCount: 8,
    selectedCount: 7,
    trades: ["Deep Clean", "Cleaning", "General"],
  },
  CoolAir: {
    quality: 84,
    speed: 76,
    reliability: 82,
    cost: 70,
    onTimeRate: 82,
    qualityRate: 84,
    avgBidVariance: 8,
    avgCycleDays: 5.7,
    capacityUtilization: 87,
    preferredMarkets: ["Phoenix"],
    strengths: ["HVAC specialty", "Complex turn coverage"],
    concerns: ["Approval lag impact", "Higher cost variability"],
    contracts: "Approved",
    recommendationCount: 3,
    selectedCount: 2,
    trades: ["HVAC", "General", "Heavy Turn Review"],
  },
  "Prime Paint": {
    quality: 86,
    speed: 84,
    reliability: 85,
    cost: 75,
    onTimeRate: 85,
    qualityRate: 86,
    avgBidVariance: 7,
    avgCycleDays: 4.5,
    capacityUtilization: 81,
    preferredMarkets: ["Phoenix"],
    strengths: ["Trade coordination", "Paint + flooring overlap"],
    concerns: ["Moderate rework rate"],
    contracts: "Approved",
    recommendationCount: 4,
    selectedCount: 3,
    trades: ["Paint", "Flooring", "Paint + Flooring", "General"],
  },
  "Desert Turn Co": {
    quality: 89,
    speed: 87,
    reliability: 88,
    cost: 73,
    onTimeRate: 91,
    qualityRate: 89,
    avgBidVariance: 5,
    avgCycleDays: 4.1,
    capacityUtilization: 69,
    preferredMarkets: ["Phoenix"],
    strengths: ["Balanced scorecard", "Strong heavy-turn coverage", "Good turnaround"],
    concerns: ["Smaller historical sample"],
    contracts: "Approved",
    recommendationCount: 5,
    selectedCount: 3,
    trades: ["General", "Paint", "Flooring", "Heavy Turn Review"],
  },
  "Lone Star Repairs": {
    quality: 88,
    speed: 86,
    reliability: 87,
    cost: 76,
    onTimeRate: 90,
    qualityRate: 88,
    avgBidVariance: 5,
    avgCycleDays: 4.2,
    capacityUtilization: 72,
    preferredMarkets: ["Dallas"],
    strengths: ["Balanced Dallas coverage", "Good trade overlap handling"],
    concerns: ["Less premium finish quality than top peer"],
    contracts: "Approved",
    recommendationCount: 4,
    selectedCount: 2,
    trades: ["General", "Flooring + Paint", "Paint", "Flooring"],
  },
  "Peach State Services": {
    quality: 85,
    speed: 83,
    reliability: 84,
    cost: 80,
    onTimeRate: 87,
    qualityRate: 85,
    avgBidVariance: 4,
    avgCycleDays: 4.0,
    capacityUtilization: 68,
    preferredMarkets: ["Atlanta"],
    strengths: ["Consistent paint work", "Low variance", "Useful overflow capacity"],
    concerns: ["Lower speed than top Atlanta option"],
    contracts: "Approved",
    recommendationCount: 3,
    selectedCount: 2,
    trades: ["General", "Paint + Patch", "Paint"],
  },
  "Music City Maintenance": {
    quality: 84,
    speed: 82,
    reliability: 85,
    cost: 79,
    onTimeRate: 86,
    qualityRate: 84,
    avgBidVariance: 5,
    avgCycleDays: 4.3,
    capacityUtilization: 66,
    preferredMarkets: ["Nashville"],
    strengths: ["Flexible Nashville coverage", "Good cleaning + cosmetic mix"],
    concerns: ["Lower premium trade specialization"],
    contracts: "Approved",
    recommendationCount: 3,
    selectedCount: 2,
    trades: ["General", "Deep Clean", "Paint"],
  },
};

function safeDateString(value) {
  if (!value) return "";
  if (typeof value !== "string") return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : "";
}

function daysUntil(dateStr) {
  const normalized = safeDateString(dateStr);
  if (!normalized) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = target.getTime() - localToday.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function titleize(value) {
  if (!value) return "";
  return String(value)
    .split(/[_\s/-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferTradesFromProperties(properties) {
  const trades = new Set();

  properties.forEach((property) => {
    if (property.scope) {
      trades.add(property.scope);
    }
    if (property.scope_category) {
      trades.add(property.scope_category);
    }
    if (property.currentStage === "Owner Approval") {
      trades.add("General");
    }
  });

  return Array.from(trades).filter(Boolean);
}

function fallbackProfile(vendor, groupedRow) {
  const avgRisk =
    groupedRow.jobs > 0 ? Math.round(groupedRow.totalRisk / groupedRow.jobs) : 45;

  const blockedRate =
    groupedRow.jobs > 0 ? groupedRow.blockedJobs / groupedRow.jobs : 0;

  const quality = Math.max(76, 90 - blockedRate * 18);
  const speed = Math.max(74, 88 - blockedRate * 14 - Math.max(0, avgRisk - 60) * 0.2);
  const reliability = Math.max(75, 89 - blockedRate * 16);
  const cost = 78;
  const onTimeRate = Math.max(72, Math.round(92 - blockedRate * 18 - Math.max(0, avgRisk - 65) * 0.15));
  const qualityRate = Math.max(75, Math.round(quality));
  const avgBidVariance = 6;
  const avgCycleDays = Math.max(3.2, 4 + blockedRate * 2 + Math.max(0, avgRisk - 60) * 0.03);
  const capacityUtilization = Math.min(94, Math.max(38, 40 + groupedRow.jobs * 12 + groupedRow.highRiskJobs * 4));
  const preferredMarkets = Array.from(groupedRow.markets);
  const trades = inferTradesFromProperties(groupedRow.properties);

  return {
    quality: Math.round(quality),
    speed: Math.round(speed),
    reliability: Math.round(reliability),
    cost: Math.round(cost),
    onTimeRate,
    qualityRate,
    avgBidVariance,
    avgCycleDays: Number(avgCycleDays.toFixed(1)),
    capacityUtilization,
    preferredMarkets,
    strengths: [
      "Imported vendor assignment detected",
      groupedRow.jobs > 0 ? `${groupedRow.jobs} active job${groupedRow.jobs > 1 ? "s" : ""}` : "Available capacity",
      preferredMarkets.length ? `${preferredMarkets.join(", ")} coverage` : "Cross-market capable",
    ],
    concerns:
      groupedRow.blockedJobs > 0
        ? ["Blocked job exposure present"]
        : ["Limited historical profile data"],
    contracts: groupedRow.jobs > 0 ? "Imported" : "Approved",
    recommendationCount: groupedRow.jobs,
    selectedCount: groupedRow.jobs,
    trades: trades.length ? trades : ["General"],
  };
}

function getOverallScore(profile) {
  return Math.round(
    profile.quality * 0.35 +
      profile.speed * 0.3 +
      profile.reliability * 0.2 +
      profile.cost * 0.15
  );
}

function getToneFromScore(score) {
  if (score >= 90) return "emerald";
  if (score >= 82) return "blue";
  if (score >= 72) return "amber";
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

function getActionLabel(row) {
  if (row.jobs === 0) return "Available";
  if (row.capacityUtilization >= 85) return "Restrict";
  if (row.overall >= 90 && row.onTimeRate >= 92) return "Expand";
  if (row.overall >= 82) return "Monitor";
  return "Limit";
}

function getActionTone(action) {
  if (action === "Expand") return "emerald";
  if (action === "Available") return "blue";
  if (action === "Monitor") return "amber";
  if (action === "Restrict" || action === "Limit") return "red";
  return "slate";
}

function getVendorStatus(row) {
  if (row.capacityUtilization >= 90) return "Restricted";
  if (row.contracts === "Preferred") return "Preferred";
  if (row.capacityUtilization >= 85) return "Watchlist";
  if (row.contracts === "Imported") return "Imported";
  return "Approved";
}

function getVendorStatusTone(status) {
  if (status === "Preferred") return "blue";
  if (status === "Approved") return "emerald";
  if (status === "Imported") return "slate";
  if (status === "Watchlist") return "amber";
  return "red";
}

function createFallbackVendorProfile(vendor, groupedRow) {
  const jobs = groupedRow?.jobs || 0;
  const avgRisk =
    jobs > 0 ? Math.round((groupedRow.totalRisk || 0) / jobs) : 55;

  const capacityUtilization = Math.min(92, Math.max(18, jobs * 14));

  const quality = Math.max(72, 86 - Math.round((groupedRow?.blockedJobs || 0) * 2));
  const speed = Math.max(70, 84 - Math.round(avgRisk / 8));
  const reliability = Math.max(72, 88 - Math.round((groupedRow?.highRiskJobs || 0) * 2));
  const cost = 76;

  return {
    quality,
    speed,
    reliability,
    cost,
    onTimeRate: Math.max(74, 92 - Math.round((groupedRow?.blockedJobs || 0) * 3)),
    qualityRate: quality,
    avgBidVariance: 6,
    avgCycleDays: Math.max(3.5, 6.2 - Math.min(2, jobs * 0.2)),
    capacityUtilization,
    preferredMarkets: groupedRow?.markets ? Array.from(groupedRow.markets) : [],
    strengths: ["Imported from live turns", "Active coverage", "TurnIQ-generated profile"],
    concerns: ["Limited historical benchmark"],
    contracts: "New",
    recommendationCount: jobs,
    selectedCount: jobs,
    trades: ["General"],
  };
}

function buildVendorRows(properties) {
  const grouped = {};

  properties.forEach((property) => {
    const vendor = property.vendor || "";
    if (!vendor) return;

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
    grouped[vendor].markets.add(property.market || "Unknown");
    grouped[vendor].totalRisk += property.risk || 0;

    if ((property.risk || 0) >= 75) grouped[vendor].highRiskJobs += 1;
    if (property.turnStatus === "Blocked") grouped[vendor].blockedJobs += 1;

    if (["2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09"].includes(property.projectedCompletion)) {
      grouped[vendor].ecdThisWeek += 1;
    }
  });

  const allVendorNames = Array.from(
    new Set([...Object.keys(VENDOR_PROFILE), ...Object.keys(grouped)])
  );

  return allVendorNames
    .map((vendor) => {
      const groupedRow = grouped[vendor] || {
        vendor,
        jobs: 0,
        markets: new Set(VENDOR_PROFILE[vendor]?.preferredMarkets || []),
        totalRisk: 0,
        highRiskJobs: 0,
        blockedJobs: 0,
        ecdThisWeek: 0,
      };

      const profile =
        VENDOR_PROFILE[vendor] || createFallbackVendorProfile(vendor, groupedRow);

      const overall = getOverallScore(profile);

      const merged = {
        vendor,
        jobs: groupedRow.jobs,
        markets:
          groupedRow.jobs > 0
            ? Array.from(groupedRow.markets)
            : profile.preferredMarkets || [],
        avgRisk:
          groupedRow.jobs > 0
            ? Math.round(groupedRow.totalRisk / groupedRow.jobs)
            : null,
        highRiskJobs: groupedRow.highRiskJobs,
        blockedJobs: groupedRow.blockedJobs,
        ecdThisWeek: groupedRow.ecdThisWeek,
        overall,
        ...profile,
      };

      return {
        ...merged,
        status: getVendorStatus(merged),
        actionLabel: getActionLabel(merged),
      };
    })
    .sort((a, b) => {
      if (b.jobs !== a.jobs) return b.jobs - a.jobs;
      return b.overall - a.overall;
    });
}
function buildBestVendorByMarket(rows) {
  const bestByMarket = {};

  rows.forEach((row) => {
    row.markets.forEach((market) => {
      if (!bestByMarket[market] || row.overall > bestByMarket[market].overall) {
        bestByMarket[market] = row;
      }
    });
  });

  return Object.entries(bestByMarket)
    .map(([market, row]) => ({
      market,
      vendor: row.vendor,
      overall: row.overall,
      actionLabel: row.actionLabel,
    }))
    .sort((a, b) => b.overall - a.overall);
}

function displayJobs(value) {
  return value > 0 ? value : <span className="text-slate-400">0</span>;
}

function displayRisk(value) {
  return value != null ? value : <span className="text-slate-400">—</span>;
}

function displayCount(value) {
  return value ? value : <span className="text-slate-400">0</span>;
}

export default function VendorsTab({ properties }) {
  const vendorRows = useMemo(() => buildVendorRows(properties), [properties]);
  const bestByMarket = useMemo(() => buildBestVendorByMarket(vendorRows), [vendorRows]);

  const [selectedVendor, setSelectedVendor] = useState(vendorRows[0]?.vendor || "");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [sortBy, setSortBy] = useState("Overall");

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
    if (vendorFilter === "Expand Candidates") {
      rows = rows.filter((row) => row.actionLabel === "Expand");
    }
    if (vendorFilter === "Bench Vendors") {
      rows = rows.filter((row) => row.jobs === 0);
    }
    if (vendorFilter === "Imported Vendors") {
      rows = rows.filter((row) => row.status === "Imported");
    }

    if (sortBy === "Overall") {
      rows.sort((a, b) => b.overall - a.overall);
    } else if (sortBy === "Capacity") {
      rows.sort((a, b) => b.capacityUtilization - a.capacityUtilization);
    } else if (sortBy === "On-Time") {
      rows.sort((a, b) => b.onTimeRate - a.onTimeRate);
    } else if (sortBy === "Risk") {
      rows.sort((a, b) => (b.avgRisk ?? -1) - (a.avgRisk ?? -1));
    } else if (sortBy === "Recommendation Count") {
      rows.sort((a, b) => b.recommendationCount - a.recommendationCount);
    } else if (sortBy === "Jobs") {
      rows.sort((a, b) => b.jobs - a.jobs);
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
      ? Math.round(vendorRows.reduce((sum, row) => sum + row.overall, 0) / activeVendors)
      : 0;
    const avgOnTime = activeVendors
      ? Math.round(vendorRows.reduce((sum, row) => sum + row.onTimeRate, 0) / activeVendors)
      : 0;
    const atRiskCapacity = vendorRows.filter((row) => row.capacityUtilization >= 85).length;
    const benchVendors = vendorRows.filter((row) => row.jobs === 0).length;
    const expandCandidates = vendorRows.filter((row) => row.actionLabel === "Expand").length;
    const importedVendors = vendorRows.filter((row) => row.status === "Imported").length;

    return {
      activeVendors,
      avgScore,
      avgOnTime,
      atRiskCapacity,
      benchVendors,
      expandCandidates,
      importedVendors,
    };
  }, [vendorRows]);

  if (!selectedVendorRow) {
    return <div className="text-sm text-slate-500">No vendor data available.</div>;
  }

  const topCapacityRows = filteredVendorRows.slice(0, 4);
  const topMarketRows = bestByMarket.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-slate-900">Vendors</div>
        <div className="mt-1 text-sm text-slate-500">
          Allocation, scorecards, capacity monitoring, and sourcing decisions across the vendor network.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <button onClick={() => setVendorFilter("All Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Active Vendors</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.activeVendors}</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("All Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Avg Vendor Score</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avgScore}</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("All Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Avg On-Time %</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avgOnTime}%</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("Capacity Risk Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Capacity Risk Vendors</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.atRiskCapacity}</div>
            <div className="mt-2 text-sm text-slate-500">click to filter risk vendors</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("Bench Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Bench Vendors</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.benchVendors}</div>
            <div className="mt-2 text-sm text-slate-500">available capacity not yet in flight</div>
          </Card>
        </button>

        <button onClick={() => setVendorFilter("Imported Vendors")} className="text-left">
          <Card className="h-full hover:border-blue-300 hover:shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Imported Vendors</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.importedVendors}</div>
            <div className="mt-2 text-sm text-slate-500">new vendor names from imported data</div>
          </Card>
        </button>
      </div>

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
            <option>Overall</option>
            <option>Capacity</option>
            <option>On-Time</option>
            <option>Risk</option>
            <option>Recommendation Count</option>
            <option>Jobs</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Vendor Allocation Scorecard</div>
                <div className="mt-1 text-sm text-slate-500">
                  Compare vendor performance, recommendation frequency, and allocation action.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="slate">{filteredVendorRows.length} vendors</Pill>
                <Pill tone="blue">{summary.expandCandidates} expand</Pill>
              </div>
            </div>

            <div className="max-h-[540px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Markets</th>
                    <th className="px-3 py-2 font-medium">Jobs</th>
                    <th className="px-3 py-2 font-medium">Overall</th>
                    <th className="px-3 py-2 font-medium">On-Time</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Recommended</th>
                    <th className="px-3 py-2 font-medium">Capacity</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Open</th>
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
                        <td className="px-3 py-3">{displayJobs(row.jobs)}</td>
                        <td className="px-3 py-3">
                          <Pill tone={getToneFromScore(row.overall)}>{row.overall}</Pill>
                        </td>
                        <td className="px-3 py-3">{row.onTimeRate}%</td>
                        <td className="px-3 py-3">{displayRisk(row.avgRisk)}</td>
                        <td className="px-3 py-3">{displayCount(row.recommendationCount)}</td>
                        <td className="min-w-[200px] px-3 py-3">
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
                          <Pill tone={getActionTone(row.actionLabel)}>{row.actionLabel}</Pill>
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

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedVendorRow.vendor}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Detailed performance, allocation signal, and sourcing profile
                </div>
              </div>
              <Pill tone={getActionTone(selectedVendorRow.actionLabel)}>
                {selectedVendorRow.actionLabel}
              </Pill>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={getToneFromScore(selectedVendorRow.overall)}>
                Score {selectedVendorRow.overall}
              </Pill>
              <Pill tone={getVendorStatusTone(selectedVendorRow.status)}>
                {selectedVendorRow.status}
              </Pill>
              <Pill tone="slate">
                {selectedVendorRow.jobs > 0 ? `${selectedVendorRow.jobs} active` : "Bench vendor"}
              </Pill>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">On-Time Rate</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{selectedVendorRow.onTimeRate}%</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Quality Rate</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{selectedVendorRow.qualityRate}%</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg Cycle Days</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{selectedVendorRow.avgCycleDays}</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Bid Variance</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{selectedVendorRow.avgBidVariance}%</div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-semibold text-slate-900">Preferred Markets</div>
                <div className="flex flex-wrap gap-2">
                  {selectedVendorRow.preferredMarkets.map((market) => (
                    <Pill key={market} tone="blue">
                      {market}
                    </Pill>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-slate-900">Primary Trades</div>
                <div className="flex flex-wrap gap-2">
                  {selectedVendorRow.trades.map((trade) => (
                    <Pill key={trade} tone="slate">
                      {trade}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
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

              <div>
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
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Recommendation Fit</div>
                <div className="mt-2 text-sm text-slate-700">
                  Recommended {selectedVendorRow.recommendationCount} times and selected {selectedVendorRow.selectedCount} times.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Suggested Move</div>
                <div className="mt-2 text-sm text-slate-700">
                  {selectedVendorRow.actionLabel === "Expand"
                    ? `Increase share in ${selectedVendorRow.markets.join(", ")}.`
                    : selectedVendorRow.actionLabel === "Restrict"
                    ? "Pause new assignments until capacity clears."
                    : selectedVendorRow.actionLabel === "Available"
                    ? "Hold as bench capacity for overflow."
                    : "Keep under active watch before changing allocation."}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="h-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">Vendor Capacity Outlook</div>
              <div className="mt-1 text-sm text-slate-500">
                Upcoming workload and concentration risk by vendor.
              </div>
            </div>
            <Pill tone="slate">Top {topCapacityRows.length}</Pill>
          </div>

          <div className="mt-4 space-y-4">
            {topCapacityRows.map((row) => (
              <div key={row.vendor} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{row.vendor}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {row.jobs > 0
                        ? `${row.jobs} active turn${row.jobs > 1 ? "s" : ""} • ${row.ecdThisWeek} due this week`
                        : "No active jobs • available capacity"}
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

        <Card className="h-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">Best Vendor by Market</div>
              <div className="mt-1 text-sm text-slate-500">
                Current top-ranked vendor in each market based on weighted performance.
              </div>
            </div>
            <Pill tone="slate">Top {topMarketRows.length}</Pill>
          </div>

          <div className="mt-4 space-y-4">
            {topMarketRows.map((item) => (
              <div
                key={item.market}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.market}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.vendor}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Pill tone={getToneFromScore(item.overall)}>Score {item.overall}</Pill>
                    <Pill tone={getActionTone(item.actionLabel)}>{item.actionLabel}</Pill>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}