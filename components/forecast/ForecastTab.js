"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

const TODAY = new Date("2026-05-07T00:00:00");

const HORIZONS = [
  { label: "Next 30 Days", value: 30 },
  { label: "Next 60 Days", value: 60 },
  { label: "Next 90 Days", value: 90 },
];

const MARKET_VENDOR_CAPACITY = {
  Dallas: {
    capacity: 3,
    geography: "Multi-crew / dense",
    vendors: [
      { name: "FloorCo", score: 92, specialties: ["Flooring + Paint", "Heavy Turn Review"] },
      { name: "Sparkle", score: 91, specialties: ["Deep Clean"] },
    ],
  },
  Atlanta: {
    capacity: 2,
    geography: "Single metro core",
    vendors: [{ name: "ABC Paint", score: 88, specialties: ["Paint + Patch", "Deep Clean"] }],
  },
  Phoenix: {
    capacity: 2,
    geography: "Wide drive radius",
    vendors: [
      { name: "Prime Paint", score: 83, specialties: ["Paint + Flooring", "Paint + Patch"] },
      { name: "CoolAir", score: 79, specialties: ["Heavy Turn Review", "HVAC"] },
    ],
  },
  Nashville: {
    capacity: 2,
    geography: "Moderate density",
    vendors: [{ name: "Sparkle", score: 91, specialties: ["Deep Clean", "Paint + Patch"] }],
  },
};

const FUTURE_PIPELINE = [
  {
    id: "f1",
    name: "410 Cedar Park Dr",
    market: "Dallas",
    leaseEnd: "2026-05-28",
    renewalStatus: "Unresolved",
    renewalProbability: 42,
    historicScope: "Flooring + Paint",
    propertyClass: "Standard",
  },
  {
    id: "f2",
    name: "91 Wren Ave",
    market: "Dallas",
    leaseEnd: "2026-06-14",
    renewalStatus: "Not signed",
    renewalProbability: 35,
    historicScope: "Deep Clean",
    propertyClass: "Light",
  },
  {
    id: "f3",
    name: "700 Juniper Ct",
    market: "Phoenix",
    leaseEnd: "2026-05-30",
    renewalStatus: "Unresolved",
    renewalProbability: 28,
    historicScope: "Heavy Turn Review",
    propertyClass: "Heavy",
  },
  {
    id: "f4",
    name: "18 Ash Hollow",
    market: "Phoenix",
    leaseEnd: "2026-06-24",
    renewalStatus: "Offered",
    renewalProbability: 63,
    historicScope: "Paint + Flooring",
    propertyClass: "Standard",
  },
  {
    id: "f5",
    name: "233 Belmont Way",
    market: "Atlanta",
    leaseEnd: "2026-05-26",
    renewalStatus: "Not signed",
    renewalProbability: 30,
    historicScope: "Paint + Patch",
    propertyClass: "Standard",
  },
  {
    id: "f6",
    name: "55 Riverbend Ln",
    market: "Atlanta",
    leaseEnd: "2026-07-10",
    renewalStatus: "Unresolved",
    renewalProbability: 48,
    historicScope: "Deep Clean",
    propertyClass: "Light",
  },
  {
    id: "f7",
    name: "88 Magnolia Ridge",
    market: "Nashville",
    leaseEnd: "2026-06-18",
    renewalStatus: "Offered",
    renewalProbability: 58,
    historicScope: "Deep Clean",
    propertyClass: "Light",
  },
  {
    id: "f8",
    name: "14 Orchard Run",
    market: "Nashville",
    leaseEnd: "2026-07-02",
    renewalStatus: "Not signed",
    renewalProbability: 33,
    historicScope: "Paint + Patch",
    propertyClass: "Standard",
  },
];

function daysFromToday(dateStr) {
  const date = new Date(dateStr);
  return Math.ceil((date - TODAY) / (1000 * 60 * 60 * 24));
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getProbabilityTone(probability) {
  if (probability >= 70) return "red";
  if (probability >= 45) return "amber";
  return "emerald";
}

function getVendorHealthTone(label) {
  if (label === "High Risk") return "red";
  if (label === "Watch") return "amber";
  return "emerald";
}

function predictScope(row) {
  if ((row.historicScope || "").includes("Heavy")) return "Heavy Turn Review";
  if ((row.historicScope || "").includes("Floor")) return "Flooring + Paint";
  if ((row.historicScope || "").includes("Paint")) return "Paint + Patch";
  return "Deep Clean";
}

function predictDuration(scope) {
  if (scope === "Heavy Turn Review") return 16;
  if (scope === "Flooring + Paint") return 11;
  if (scope === "Paint + Patch") return 7;
  return 4;
}

function chooseVendor(market, scope) {
  const marketConfig = MARKET_VENDOR_CAPACITY[market];
  if (!marketConfig) {
    return { recommended: "TBD", alternates: [], vendorScore: 75 };
  }

  const ranked = [...marketConfig.vendors].sort((a, b) => {
    const aMatch = a.specialties.includes(scope) ? 10 : 0;
    const bMatch = b.specialties.includes(scope) ? 10 : 0;
    return b.score + bMatch - (a.score + aMatch);
  });

  return {
    recommended: ranked[0]?.name || "TBD",
    alternates: ranked.slice(1).map((v) => v.name),
    vendorScore: ranked[0]?.score || 75,
  };
}

function buildForecastRows(properties) {
  const currentFutureProperties = properties
    .filter((p) => daysFromToday(p.leaseEnd) >= 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      market: p.market,
      leaseEnd: p.leaseEnd,
      renewalStatus:
        p.turnStatus === "Blocked" ? "Not signed" : p.risk >= 70 ? "Unresolved" : "Offered",
      renewalProbability:
        p.turnStatus === "Blocked"
          ? 22
          : p.risk >= 80
          ? 30
          : p.risk >= 70
          ? 42
          : p.risk >= 60
          ? 55
          : 72,
      historicScope: p.scope,
      propertyClass: p.risk >= 80 ? "Heavy" : p.risk >= 65 ? "Standard" : "Light",
      linkedPropertyId: p.id,
      linkedDelayDrivers: p.delayDrivers || [],
      linkedRisk: p.risk,
      linkedReadiness: p.readiness,
      linkedConfidence: p.timelineConfidence || 78,
    }));

  return [...currentFutureProperties, ...FUTURE_PIPELINE].map((row) => {
    const predictedTurnProbability = Math.max(8, 100 - row.renewalProbability);
    const predictedScope = predictScope(row);
    const predictedDuration = predictDuration(predictedScope);
    const predictedTurnStart = addDays(row.leaseEnd, 1);
    const predictedReadyDate = addDays(predictedTurnStart, predictedDuration);
    const vendorRecommendation = chooseVendor(row.market, predictedScope);
    const marketCapacity = MARKET_VENDOR_CAPACITY[row.market]?.capacity || 1;
    const geoRisk =
      MARKET_VENDOR_CAPACITY[row.market]?.geography === "Wide drive radius"
        ? "High"
        : MARKET_VENDOR_CAPACITY[row.market]?.geography === "Moderate density"
        ? "Medium"
        : "Low";

    const confidence = row.linkedConfidence
      ? row.linkedConfidence
      : Math.round(
          Math.max(
            62,
            Math.min(
              93,
              90 -
                Math.abs(50 - row.renewalProbability) * 0.35 -
                (predictedScope === "Heavy Turn Review"
                  ? 8
                  : predictedScope === "Flooring + Paint"
                  ? 4
                  : 0)
            )
          )
        );

    let delayDrivers;
    if (row.linkedDelayDrivers?.length) {
      delayDrivers = row.linkedDelayDrivers
        .sort((a, b) => b.days - a.days)
        .slice(0, 3)
        .map((d) => ({ label: d.label, days: d.days }));
    } else {
      delayDrivers = [
        {
          label: "Appliance vendor delay probability",
          days: geoRisk === "High" ? 2 : 1,
        },
        {
          label: "Inspection fail likelihood",
          days: predictedScope === "Heavy Turn Review" ? 2 : 1,
        },
        {
          label: "Trade overlap risk",
          days:
            predictedScope === "Flooring + Paint" || predictedScope === "Heavy Turn Review"
              ? 3
              : 1,
        },
      ];
    }

    return {
      ...row,
      predictedTurnProbability,
      predictedScope,
      predictedDuration,
      predictedTurnStart,
      predictedReadyDate,
      recommendedVendor: vendorRecommendation.recommended,
      alternateVendors: vendorRecommendation.alternates,
      vendorScore: vendorRecommendation.vendorScore,
      marketCapacity,
      geoRisk,
      confidence,
      delayDrivers,
      vacancyImpact: predictedDuration * 70,
      capacityRisk: predictedTurnProbability >= 60 && marketCapacity <= 2 ? "Elevated" : "Stable",
      rationale: [
        row.renewalStatus === "Not signed"
          ? "Lease expires soon and renewal has not been signed."
          : row.renewalStatus === "Unresolved"
          ? "Lease renewal signal is unresolved."
          : "Renewal offered but turnover probability remains meaningful.",
        `Historical scope pattern suggests ${predictedScope}.`,
        `${row.market} vendor capacity is currently ${marketCapacity} turn${marketCapacity > 1 ? "s" : ""} per cycle.`,
        geoRisk === "High"
          ? "Geography creates dispatch drag and wider travel time exposure."
          : geoRisk === "Medium"
          ? "Geography is manageable but still affects dispatch sequencing."
          : "Geography supports efficient vendor dispatch.",
      ],
    };
  });
}

function bucketRows(rows) {
  return {
    next30: rows.filter((r) => {
      const days = daysFromToday(r.leaseEnd);
      return days >= 0 && days <= 30;
    }),
    next60: rows.filter((r) => {
      const days = daysFromToday(r.leaseEnd);
      return days >= 31 && days <= 60;
    }),
    next90: rows.filter((r) => {
      const days = daysFromToday(r.leaseEnd);
      return days >= 61 && days <= 90;
    }),
  };
}

function formatTimeStamp(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ForecastTab({
  selectedProperty,
  properties,
  updateProperty,
}) {
  const [horizon, setHorizon] = useState(90);
  const [approvedVendorMap, setApprovedVendorMap] = useState({});
  const [recommendedVendorMap, setRecommendedVendorMap] = useState({});
  const [selectedForecastId, setSelectedForecastId] = useState(null);
  const [analysisRunMap, setAnalysisRunMap] = useState({});

  const forecastRows = useMemo(() => buildForecastRows(properties), [properties]);

  const scopedRows = useMemo(() => {
    return forecastRows.filter((row) => {
      const days = daysFromToday(row.leaseEnd);
      return days >= 0 && days <= horizon;
    });
  }, [forecastRows, horizon]);

  const selectedForecast = useMemo(() => {
    if (selectedForecastId) {
      return scopedRows.find((r) => r.id === selectedForecastId) || scopedRows[0];
    }
    const linked = scopedRows.find((r) => r.name === selectedProperty?.name);
    return linked || scopedRows[0];
  }, [scopedRows, selectedForecastId, selectedProperty]);

  useEffect(() => {
    if (selectedForecast) {
      setSelectedForecastId(selectedForecast.id);
    }
  }, [selectedForecast?.id]);

  const rowsWithVendorChoice = useMemo(() => {
    return scopedRows.map((row) => ({
      ...row,
      activeVendor: recommendedVendorMap[row.id] || row.recommendedVendor,
      approved: approvedVendorMap[row.id] || false,
    }));
  }, [scopedRows, approvedVendorMap, recommendedVendorMap]);

  const buckets = useMemo(() => bucketRows(forecastRows), [forecastRows]);

  const expectedTurns = rowsWithVendorChoice.filter((r) => r.predictedTurnProbability >= 50).length;
  const heavyTurns = rowsWithVendorChoice.filter((r) => r.predictedScope === "Heavy Turn Review").length;
  const constrainedMarkets = Array.from(
    new Set(
      rowsWithVendorChoice
        .filter((r) => r.capacityRisk === "Elevated")
        .map((r) => r.market)
    )
  ).length;

  const bundlingGroups = Array.from(
    new Set(
      rowsWithVendorChoice.map((r) => `${r.market}::${r.activeVendor}::${r.predictedScope}`)
    )
  ).filter(
    (groupKey) =>
      rowsWithVendorChoice.filter(
        (r) => `${r.market}::${r.activeVendor}::${r.predictedScope}` === groupKey
      ).length >= 2
  ).length;

  const demandVsCapacity = useMemo(() => {
    return Array.from(new Set(rowsWithVendorChoice.map((r) => r.market))).map((market) => {
      const marketRows = rowsWithVendorChoice.filter(
        (r) => r.market === market && r.predictedTurnProbability >= 50
      );
      const demand = marketRows.length;
      const capacity = MARKET_VENDOR_CAPACITY[market]?.capacity || 1;

      return {
        market,
        demand,
        capacity,
        overload: Math.max(0, demand - capacity),
      };
    });
  }, [rowsWithVendorChoice]);

  const bundlingOpportunities = useMemo(() => {
    const grouped = {};
    rowsWithVendorChoice.forEach((row) => {
      const key = `${row.market}::${row.activeVendor}::${row.predictedScope}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    return Object.entries(grouped)
      .map(([key, rows]) => ({ key, rows }))
      .filter((group) => group.rows.length >= 2)
      .slice(0, 4);
  }, [rowsWithVendorChoice]);

  const vendorForecasting = useMemo(() => {
    const grouped = {};
    rowsWithVendorChoice
      .filter((r) => r.predictedTurnProbability >= 50)
      .forEach((row) => {
        const vendor = row.activeVendor;
        if (!grouped[vendor]) {
          grouped[vendor] = {
            vendor,
            jobs: 0,
            markets: new Set(),
            highRiskJobs: 0,
          };
        }
        grouped[vendor].jobs += 1;
        grouped[vendor].markets.add(row.market);
        if (row.capacityRisk === "Elevated" || row.predictedScope === "Heavy Turn Review") {
          grouped[vendor].highRiskJobs += 1;
        }
      });

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        markets: Array.from(row.markets),
        status:
          row.highRiskJobs >= 2
            ? "High Risk"
            : row.highRiskJobs === 1
            ? "Watch"
            : "Stable",
      }))
      .sort((a, b) => b.jobs - a.jobs);
  }, [rowsWithVendorChoice]);

  function handleApproveVendor() {
    if (!selectedForecast) return;

    setApprovedVendorMap((prev) => ({
      ...prev,
      [selectedForecast.id]: true,
    }));

    if (selectedForecast.linkedPropertyId) {
      updateProperty(selectedForecast.linkedPropertyId, {
        vendor: recommendedVendorMap[selectedForecast.id] || selectedForecast.recommendedVendor,
      });
    }
  }

  function handleReviseVendor() {
    if (!selectedForecast) return;

    const options = [
      selectedForecast.recommendedVendor,
      ...(selectedForecast.alternateVendors || []),
    ].filter(Boolean);

    if (!options.length) return;

    const current =
      recommendedVendorMap[selectedForecast.id] || selectedForecast.recommendedVendor;
    const currentIndex = options.indexOf(current);
    const next = options[(currentIndex + 1) % options.length];

    setRecommendedVendorMap((prev) => ({
      ...prev,
      [selectedForecast.id]: next,
    }));

    setApprovedVendorMap((prev) => ({
      ...prev,
      [selectedForecast.id]: false,
    }));
  }

  function handleAnalyzeTurn(row) {
    setSelectedForecastId(row.id);
    setAnalysisRunMap((prev) => ({
      ...prev,
      [row.id]: new Date(),
    }));
  }

  const selectedActiveVendor =
    (selectedForecast && recommendedVendorMap[selectedForecast.id]) ||
    selectedForecast?.recommendedVendor;

  const totalDelayDays = selectedForecast
    ? selectedForecast.delayDrivers.reduce((sum, item) => sum + item.days, 0)
    : 0;

  const maxDelayDays = selectedForecast
    ? Math.max(...selectedForecast.delayDrivers.map((item) => item.days), 1)
    : 1;

  const analysisRunTime =
    selectedForecast && analysisRunMap[selectedForecast.id]
      ? formatTimeStamp(analysisRunMap[selectedForecast.id])
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Forecast</div>
          <div className="mt-1 text-sm text-slate-500">
            Predict turns 30–90 days out based on lease timing, renewal probability, vendor capacity, and geography.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {HORIZONS.map((item) => (
            <button
              key={item.value}
              onClick={() => setHorizon(item.value)}
              className={`rounded-xl px-4 py-2 text-sm ${
                horizon === item.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Expected Turns</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{expectedTurns}</div>
          <div className="mt-2 text-sm text-slate-500">Forecasted non-renewal events in scope</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Heavy Turn Exposure</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{heavyTurns}</div>
          <div className="mt-2 text-sm text-slate-500">Predicted heavy-scope homes</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Capacity-Constrained Markets</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{constrainedMarkets}</div>
          <div className="mt-2 text-sm text-slate-500">
            Markets where demand exceeds current modeled capacity
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Bundling Opportunities</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{bundlingGroups}</div>
          <div className="mt-2 text-sm text-slate-500">
            Grouped turns with shared trade / vendor patterns
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-stretch">
        <Card>
          <div className="text-xl font-semibold text-slate-900">Forecasted Turn Demand</div>
          <div className="mt-1 text-sm text-slate-500">
            Expected turn volume by lease timing bucket.
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "0–30 Days", rows: buckets.next30 },
              { label: "31–60 Days", rows: buckets.next60 },
              { label: "61–90 Days", rows: buckets.next90 },
            ].map((bucket) => {
              const likely = bucket.rows.filter((r) => r.predictedTurnProbability >= 50).length;
              const maxCount = Math.max(
                buckets.next30.length,
                buckets.next60.length,
                buckets.next90.length,
                1
              );

              return (
                <div key={bucket.label} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">{bucket.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {bucket.rows.length}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{likely} likely turns</div>
                  <div className="mt-4 h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-blue-500"
                      style={{ width: `${(bucket.rows.length / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 max-h-[520px] overflow-y-auto overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Property</th>
                  <th className="px-3 py-2 font-medium">Market</th>
                  <th className="px-3 py-2 font-medium">Lease End</th>
                  <th className="px-3 py-2 font-medium">Renewal</th>
                  <th className="px-3 py-2 font-medium">Turn Prob.</th>
                  <th className="px-3 py-2 font-medium">Predicted Scope</th>
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Geo / Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithVendorChoice.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 ${
                      row.id === selectedForecast?.id ? "bg-slate-50" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleAnalyzeTurn(row)}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-3 py-3">{row.market}</td>
                    <td className="px-3 py-3">{row.leaseEnd}</td>
                    <td className="px-3 py-3">{row.renewalStatus}</td>
                    <td className="px-3 py-3">
                      <Pill tone={getProbabilityTone(row.predictedTurnProbability)}>
                        {row.predictedTurnProbability}%
                      </Pill>
                    </td>
                    <td className="px-3 py-3">{row.predictedScope}</td>
                    <td className="px-3 py-3">{row.activeVendor}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-700">{row.geoRisk} geo risk</span>
                        <span className="text-xs text-slate-500">{row.capacityRisk}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex h-full flex-col gap-6">
          <Card>
            <div className="text-xl font-semibold text-slate-900">Vendor Recommendation</div>
            <div className="mt-1 text-sm text-slate-500">
              Suggested vendor for {selectedForecast?.name || "selected turn"}
            </div>

            {selectedForecast && (
              <>
                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Suggested Vendor</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {selectedActiveVendor}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Scorecard
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {selectedForecast.vendorScore}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Predicted Ready
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatDateShort(selectedForecast.predictedReadyDate)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Geo Risk
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {selectedForecast.geoRisk}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-slate-600">
                    Best fit for {selectedForecast.market}{" "}
                    {selectedForecast.predictedScope.toLowerCase()} turns with current forecasted
                    availability.
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleApproveVendor}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Approve AI Vendor
                  </button>

                  <button
                    onClick={handleReviseVendor}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Revise Vendor
                  </button>
                </div>

                <div className="mt-3">
                  <Pill tone={approvedVendorMap[selectedForecast.id] ? "emerald" : "blue"}>
                    {approvedVendorMap[selectedForecast.id]
                      ? "Approved by Operator"
                      : "Recommended by TurnIQ"}
                  </Pill>
                </div>
              </>
            )}
          </Card>

          <Card className="flex-1">
            <div className="text-xl font-semibold text-slate-900">AI Turn Delay Predictor</div>
            <div className="mt-1 text-sm text-slate-500">
              Simulated delay drivers for {selectedForecast?.name || "selected turn"}
            </div>

            {selectedForecast && (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Predicted ECD
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {selectedForecast.predictedReadyDate}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Vacancy Impact
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      ${selectedForecast.vacancyImpact}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedForecast.delayDrivers.map((driver) => (
                    <div key={driver.label}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-800">{driver.label}</div>
                        <div className="text-sm font-medium text-red-600">
                          +{driver.days} days
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-red-500"
                          style={{ width: `${(driver.days / maxDelayDays) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Total modeled delay exposure
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    +{totalDelayDays} days
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => handleAnalyzeTurn(selectedForecast)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Analyze Turn
                  </button>

                  {analysisRunTime && (
                    <span className="text-sm text-slate-500">
                      Analysis refreshed at {analysisRunTime}
                    </span>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

     <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <div className="text-xl font-semibold text-slate-900">Demand vs Vendor Capacity</div>
          <div className="mt-1 text-sm text-slate-500">
            Compare expected turn demand against currently modeled market capacity.
          </div>

          <div className="mt-5 space-y-5">
            {demandVsCapacity.map((row) => {
              const ratio = row.capacity ? Math.min(100, (row.demand / row.capacity) * 100) : 0;
              return (
                <div key={row.market}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{row.market}</div>
                    <div className="text-xs text-slate-500">
                      demand {row.demand} • capacity {row.capacity}
                      {row.overload > 0 ? ` • overload ${row.overload}` : ""}
                    </div>
                  </div>

                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${
                        row.overload > 0
                          ? "bg-red-500"
                          : ratio >= 80
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="text-xl font-semibold text-slate-900">Vendor Forecasting</div>
          <div className="mt-1 text-sm text-slate-500">
            Upcoming vendor workload across forecasted turns.
          </div>

          <div className="mt-5 space-y-3">
            {vendorForecasting.map((row) => (
              <div key={row.vendor} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{row.vendor}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {row.jobs} upcoming job{row.jobs > 1 ? "s" : ""} • {row.markets.join(", ")}
                    </div>
                  </div>
                  <Pill tone={getVendorHealthTone(row.status)}>{row.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-xl font-semibold text-slate-900">Bundling Opportunities</div>
          <div className="mt-1 text-sm text-slate-500">
            Turn groups that could reduce labor mobilization through shared vendor dispatch.
          </div>

          <div className="mt-5 space-y-3">
            {bundlingOpportunities.length === 0 && (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                No material bundling opportunities found in the selected horizon.
              </div>
            )}

            {bundlingOpportunities.map((group) => {
              const [market, vendor, scope] = group.key.split("::");
              return (
                <div
                  key={group.key}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {market} • {vendor}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{scope}</div>
                    </div>
                    <Pill tone="blue">{group.rows.length} turns</Pill>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.rows.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => setSelectedForecastId(row.id)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      >
                        {row.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
<Card>
  <div className="text-xl font-semibold text-slate-900">Forecast AI Rationale</div>
  <div className="mt-1 text-sm text-slate-500">
    Why TurnIQ expects this turn pattern and recommended plan.
  </div>

  {selectedForecast && (
    <div className="mt-5 space-y-2">
      {selectedForecast.rationale.map((item, idx) => (
        <div
          key={`${item}-${idx}`}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
        >
          {item}
        </div>
      ))}
    </div>
  )}
</Card>
      </div>
    </div>
  );
}