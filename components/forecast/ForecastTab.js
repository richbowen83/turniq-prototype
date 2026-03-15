"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

const VENDOR_OPTIONS = ["FloorCo", "ABC Paint", "Sparkle", "CoolAir", "Prime Paint"];

function getToneFromRisk(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "emerald";
}

function getSuggestedVendor(property) {
  const recommendations = {
    "123 Main St": {
      vendor: "FloorCo",
      scorecard: 92,
      availability: "May 2",
      costRank: "#2",
      reason: "Best Dallas flooring scorecard and available capacity this week.",
    },
    "456 Oak Ave": {
      vendor: "ABC Paint",
      scorecard: 88,
      availability: "May 13",
      costRank: "#1",
      reason: "Strong Atlanta paint performance and best cost position.",
    },
    "789 Pine Rd": {
      vendor: "Sparkle",
      scorecard: 91,
      availability: "May 19",
      costRank: "#1",
      reason: "Best fit for Nashville clean turns with immediate availability.",
    },
    "22 Cedar Ln": {
      vendor: "CoolAir",
      scorecard: 79,
      availability: "Apr 24",
      costRank: "#2",
      reason: "Required for HVAC dependency and already active in market.",
    },
    "88 Willow Dr": {
      vendor: "Sparkle",
      scorecard: 90,
      availability: "May 8",
      costRank: "#1",
      reason: "Fast-turn cleaner with consistent Dallas completion times.",
    },
    "17 Maple Ct": {
      vendor: "Prime Paint",
      scorecard: 83,
      availability: "Mar 11",
      costRank: "#2",
      reason: "Good Phoenix trade coordination and paint/flooring overlap experience.",
    },
  };

  return recommendations[property.name] || {
    vendor: property.vendor || "Recommended Vendor",
    scorecard: 85,
    availability: "TBD",
    costRank: "#2",
    reason: "Recommended based on market fit, timing, and prior performance.",
  };
}

function getVacancyImpact(property) {
  const totalDelay = (property.delayDrivers || []).reduce((sum, d) => sum + d.days, 0);
  return totalDelay * 420;
}

function buildVendorForecast(properties) {
  const grouped = {};

  properties.forEach((property) => {
    const vendor = property.vendor || "Unassigned";
    if (!grouped[vendor]) {
      grouped[vendor] = {
        vendor,
        jobs: 0,
        markets: new Set(),
        highRisk: 0,
      };
    }

    grouped[vendor].jobs += 1;
    grouped[vendor].markets.add(property.market);
    if (property.risk >= 75) grouped[vendor].highRisk += 1;
  });

  return Object.values(grouped)
    .map((row) => ({
      vendor: row.vendor,
      jobs: row.jobs,
      markets: Array.from(row.markets),
      highRisk: row.highRisk,
    }))
    .sort((a, b) => b.jobs - a.jobs);
}

function addDays(dateString, daysToAdd) {
  const d = new Date(dateString);
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

function getNextVendor(currentVendor) {
  const idx = VENDOR_OPTIONS.indexOf(currentVendor);
  if (idx === -1) return VENDOR_OPTIONS[0];
  return VENDOR_OPTIONS[(idx + 1) % VENDOR_OPTIONS.length];
}

export default function ForecastTab({
  selectedProperty,
  properties,
  updateProperty,
  setSelectedPropertyId,
}) {
  const [lastAction, setLastAction] = useState("");

  const suggestion = useMemo(
    () => getSuggestedVendor(selectedProperty),
    [selectedProperty]
  );

  const vacancyImpact = useMemo(
    () => getVacancyImpact(selectedProperty),
    [selectedProperty]
  );

  const vendorForecast = useMemo(
    () => buildVendorForecast(properties),
    [properties]
  );

  function handleApproveVendor() {
    updateProperty(selectedProperty.id, {
      vendor: suggestion.vendor,
      activityStamp: Date.now(),
    });
    setLastAction(`Approved ${suggestion.vendor} for ${selectedProperty.name}.`);
  }

  function handleReviseVendor() {
    const nextVendor = getNextVendor(selectedProperty.vendor || suggestion.vendor);
    updateProperty(selectedProperty.id, {
      vendor: nextVendor,
      activityStamp: Date.now(),
    });
    setLastAction(`Revised vendor to ${nextVendor} for ${selectedProperty.name}.`);
  }

  function handleAnalyzeTurn() {
    const currentDelay = selectedProperty.delayDrivers || [];
    const addedDelayDays = currentDelay.reduce((sum, d) => sum + d.days, 0);

    const refreshedDrivers =
      currentDelay.length > 0
        ? currentDelay.map((d, index) => ({
            ...d,
            days: index === 0 ? d.days + 1 : d.days,
          }))
        : [{ label: "Coordination variance", days: 2 }];

    const newCompletion = addDays(selectedProperty.projectedCompletion, 1);
    const newConfidence = Math.max(62, (selectedProperty.timelineConfidence || 80) - 3);

    updateProperty(selectedProperty.id, {
      projectedCompletion: newCompletion,
      timelineConfidence: newConfidence,
      delayDrivers: refreshedDrivers,
      analysisRunAt: Date.now(),
      activityStamp: Date.now() + addedDelayDays,
    });

    setLastAction(
      `Re-ran TurnIQ analysis. New ECD is ${newCompletion} and confidence adjusted to ${newConfidence}%.`
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-slate-900">Forecast</div>
        <div className="mt-1 text-sm text-slate-500">
          Predict upcoming turn risk, assign the right vendor, and intervene before ECD slips.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4">
              <div className="text-lg font-semibold text-slate-900">Upcoming Turn Forecast</div>
              <div className="mt-1 text-sm text-slate-500">
                Predicted upcoming turns with expected scope, timing, and risk.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">Lease End</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">ECD</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((row) => {
                    const isSelected = row.id === selectedProperty.id;

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-50 ${
                          isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setSelectedPropertyId(row.id)}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {row.name}
                          </button>
                        </td>
                        <td className="px-3 py-3">{row.market}</td>
                        <td className="px-3 py-3">{row.leaseEnd}</td>
                        <td className="px-3 py-3">
                          <Pill tone={getToneFromRisk(row.risk)}>{row.risk}</Pill>
                        </td>
                        <td className="px-3 py-3">{row.scope}</td>
                        <td className="px-3 py-3">{row.projectedCompletion}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card>
            <div className="text-lg font-semibold text-slate-900">Vendor Recommendation</div>
            <div className="mt-1 text-sm text-slate-500">
              Suggested vendor for {selectedProperty.name}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Suggested Vendor</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {suggestion.vendor}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Scorecard</div>
                  <div className="mt-1 text-lg font-semibold">{suggestion.scorecard}</div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Availability</div>
                  <div className="mt-1 text-lg font-semibold">{suggestion.availability}</div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Cost Rank</div>
                  <div className="mt-1 text-lg font-semibold">{suggestion.costRank}</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">{suggestion.reason}</div>
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

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="emerald">Recommended by TurnIQ</Pill>
              {selectedProperty.vendor && <Pill tone="blue">Current: {selectedProperty.vendor}</Pill>}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card>
            <div className="text-lg font-semibold text-slate-900">AI Turn Delay Predictor</div>
            <div className="mt-1 text-sm text-slate-500">
              Simulated delay drivers for {selectedProperty.name}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Predicted ECD</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {selectedProperty.projectedCompletion}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Vacancy Impact</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  ${vacancyImpact.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {selectedProperty.delayDrivers?.map((driver) => (
                <div
                  key={driver.label}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="text-sm text-slate-700">{driver.label}</div>
                  <div className="text-sm font-semibold text-red-600">+{driver.days} days</div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={handleAnalyzeTurn}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Analyze Turn
              </button>
            </div>
          </Card>

          <Card>
            <div className="text-lg font-semibold text-slate-900">Forecast Rationale</div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 p-3">
                Lease expires soon and turnover probability remains elevated.
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                Historical scope pattern suggests {selectedProperty.scope}.
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                Current risk score is {selectedProperty.risk}/100, driven by blockers, stage age, and coordination risk.
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                Best next action: approve vendor early and remove the highest-confidence blocker before the turn enters execution.
              </div>
            </div>

            {lastAction && (
              <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {lastAction}
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-lg font-semibold text-slate-900">Vendor Forecasting</div>
            <div className="mt-1 text-sm text-slate-500">
              Upcoming vendor workload across forecasted turns.
            </div>

            <div className="mt-4 space-y-3">
              {vendorForecast.map((row) => (
                <div
                  key={row.vendor}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{row.vendor}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {row.jobs} upcoming job{row.jobs > 1 ? "s" : ""} • {row.markets.join(", ")}
                      </div>
                    </div>

                    {row.highRisk > 0 ? (
                      <Pill tone="amber">{row.highRisk} high risk</Pill>
                    ) : (
                      <Pill tone="emerald">stable</Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}