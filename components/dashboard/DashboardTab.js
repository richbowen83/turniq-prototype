"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

const HORIZONS = ["Today", "Next 7 Days", "Next 14 Days", "All Active"];

function getReadinessTone(readiness) {
  if (readiness < 40) return "red";
  if (readiness < 70) return "amber";
  if (readiness < 90) return "blue";
  return "emerald";
}

function isInHorizon(property, horizon) {
  if (horizon === "All Active") return true;

  const today = new Date("2026-05-07");
  const ecd = new Date(property.projectedCompletion);
  const diffDays = Math.ceil((ecd - today) / (1000 * 60 * 60 * 24));

  if (horizon === "Today") {
    return property.turnStatus === "Blocked" || diffDays <= 0 || property.risk >= 80;
  }

  if (horizon === "Next 7 Days") return diffDays <= 7;
  if (horizon === "Next 14 Days") return diffDays <= 14;

  return true;
}

function buildPriorityItems(properties) {
  return [...properties]
    .filter((p) => p.turnStatus === "Blocked" || p.risk >= 70)
    .sort((a, b) => {
      if (a.turnStatus === "Blocked" && b.turnStatus !== "Blocked") return -1;
      if (a.turnStatus !== "Blocked" && b.turnStatus === "Blocked") return 1;
      return b.risk - a.risk;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.market} • ${p.currentStage}`,
      detail:
        p.turnStatus === "Blocked"
          ? "Blocked and needs operator intervention."
          : "High-risk turn should be actively managed.",
      tone: p.turnStatus === "Blocked" ? "red" : "amber",
    }));
}

function buildMarketHealth(properties) {
  return Array.from(new Set(properties.map((p) => p.market)))
    .map((market) => {
      const rows = properties.filter((p) => p.market === market);
      const avgRisk = rows.length
        ? Math.round(rows.reduce((sum, row) => sum + row.risk, 0) / rows.length)
        : 0;

      return {
        market,
        openTurns: rows.length,
        blocked: rows.filter((r) => r.turnStatus === "Blocked").length,
        avgRisk,
      };
    })
    .sort((a, b) => b.avgRisk - a.avgRisk);
}

function buildRecommendations(properties) {
  const recs = [];

  const blockedTurns = properties.filter((p) => p.turnStatus === "Blocked");
  if (blockedTurns.length) {
    recs.push({
      tone: "red",
      title: "Resolve blocked turns first",
      body: `${blockedTurns.length} blocked turn${blockedTurns.length > 1 ? "s are" : " is"} driving portfolio risk and likely ECD slippage.`,
      homes: blockedTurns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const approvalTurns = properties.filter((p) => p.currentStage === "Owner Approval");
  if (approvalTurns.length) {
    recs.push({
      tone: "amber",
      title: "Clear Owner Approval backlog",
      body: `${approvalTurns.length} turn${approvalTurns.length > 1 ? "s are" : " is"} waiting in Owner Approval, slowing dispatch readiness.`,
      homes: approvalTurns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const grouped = {};
  properties.forEach((p) => {
    const key = `${p.market}-${p.vendor}`;
    if (!grouped[key]) grouped[key] = { market: p.market, vendor: p.vendor, turns: [] };
    grouped[key].turns.push(p);
  });

  Object.values(grouped)
    .filter((g) => g.vendor && g.turns.length >= 2)
    .slice(0, 2)
    .forEach((g) => {
      recs.push({
        tone: "blue",
        title: `Bundle ${g.vendor} in ${g.market}`,
        body: `${g.turns.length} turns share the same vendor. Bundling dispatch could reduce labor mobilization and coordination overhead.`,
        homes: g.turns.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
      });
    });

  const tradeOverlap = properties.filter(
    (p) =>
      (p.scope || "").toLowerCase().includes("floor") ||
      (p.scope || "").toLowerCase().includes("paint")
  );

  if (tradeOverlap.length >= 2) {
    recs.push({
      tone: "blue",
      title: "Vendor dispatch efficiency opportunity",
      body: `${tradeOverlap.length} turns have overlapping trade needs. Consolidating vendor mobilization could lower labor and scheduling friction.`,
      homes: tradeOverlap.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  const highReadiness = properties.filter((p) => p.readiness >= 90);
  if (highReadiness.length) {
    recs.push({
      tone: "emerald",
      title: "Fast-track high-readiness turns",
      body: `${highReadiness.length} turn${highReadiness.length > 1 ? "s are" : " is"} ready to move quickly with limited operator drag.`,
      homes: highReadiness.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
    });
  }

  return recs.slice(0, 5);
}

export default function DashboardTab({
  properties,
  selectedProperty,
  setSelectedPropertyId,
  selectedMarket,
  setSelectedMarket,
  notes,
  activity,
  addNote,
  addActivity,
  updateProperty,
  formatMoney,
  getToneFromRisk,
}) {
  const [draftNote, setDraftNote] = useState("");
  const [horizon, setHorizon] = useState("Today");

  const horizonProperties = useMemo(
    () => properties.filter((p) => isInHorizon(p, horizon)),
    [properties, horizon]
  );

  const priorities = useMemo(() => buildPriorityItems(horizonProperties), [horizonProperties]);
  const marketHealth = useMemo(() => buildMarketHealth(properties), [properties]);
  const recommendations = useMemo(() => buildRecommendations(horizonProperties), [horizonProperties]);

  const activityFeed = useMemo(() => {
    const noteEvents = notes.map((note, i) => ({
      id: `note-${i}`,
      type: "note",
      text: note,
    }));

    const activityEvents = activity.map((item, i) => ({
      id: `activity-${i}`,
      type: "activity",
      text: item,
    }));

    return [...activityEvents, ...noteEvents].reverse().slice(0, 8);
  }, [notes, activity]);

  function handleAddNote() {
    if (!draftNote.trim()) return;
    addNote(selectedProperty.name, draftNote.trim());
    addActivity(selectedProperty.name, `Note added: ${draftNote.trim()}`);
    setDraftNote("");
  }

  function handleResolveBlockers() {
    const current = selectedProperty.blockers || [];
    const remaining = current.filter((b) => b !== "No active blockers").slice(1);
    const nextReadiness = Math.min(100, selectedProperty.readiness + 12);

    updateProperty(selectedProperty.id, {
      blockers: remaining.length ? remaining : ["No active blockers"],
      turnStatus: remaining.length ? "Monitoring" : "Ready",
      readiness: nextReadiness,
    });

    addActivity(selectedProperty.name, "Pending blocker resolved");
  }

  function handleApproveScope() {
    const stageOrder = [
      "Pre-Leasing",
      "Pre-Move Out Inspection",
      "Move Out Inspection",
      "Scope Review",
      "Owner Approval",
      "Dispatch",
      "Pending RRI",
      "Rent Ready Open",
    ];

    const idx = stageOrder.indexOf(selectedProperty.currentStage);
    const nextStage =
      selectedProperty.currentStage === "Scope Review"
        ? "Owner Approval"
        : idx >= 0 && idx < stageOrder.length - 1
        ? stageOrder[idx + 1]
        : selectedProperty.currentStage;

    updateProperty(selectedProperty.id, {
      currentStage: nextStage,
    });

    addActivity(selectedProperty.name, `Scope approved • moved to ${nextStage}`);
  }

  function handleAssignVendor() {
    const fallbackVendor =
      selectedProperty.vendor ||
      (selectedProperty.market === "Dallas"
        ? "FloorCo"
        : selectedProperty.market === "Atlanta"
        ? "ABC Paint"
        : selectedProperty.market === "Phoenix"
        ? "Prime Paint"
        : "Sparkle");

    updateProperty(selectedProperty.id, {
      vendor: fallbackVendor,
    });

    addActivity(selectedProperty.name, `Vendor assigned: ${fallbackVendor}`);
  }

  function handleStartTurn() {
    updateProperty(selectedProperty.id, {
      turnStatus: "Monitoring",
      readiness: Math.min(100, selectedProperty.readiness + 5),
    });

    addActivity(selectedProperty.name, "Turn started");
  }

  function handleCompleteTurn() {
    updateProperty(selectedProperty.id, {
      currentStage: "Rent Ready Open",
      turnStatus: "Ready",
      readiness: 100,
      blockers: ["No active blockers"],
    });

    addActivity(selectedProperty.name, "Turn marked complete");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Dashboard</div>
          <div className="mt-1 text-sm text-slate-500">
            Prioritize work, surface TurnIQ recommendations, and manage the portfolio from one control surface.
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

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Today’s Priorities</div>
                <div className="mt-1 text-sm text-slate-500">
                  Highest-urgency turns based on blockers, risk, and ECD pressure.
                </div>
              </div>
              <Pill tone="blue">{horizon}</Pill>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {priorities.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedPropertyId(item.id)}
                  className="text-left"
                >
                  <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.subtitle}</div>
                      </div>
                      <Pill tone={item.tone}>
                        {item.tone === "red" ? "Urgent" : "Watch"}
                      </Pill>
                    </div>

                    <div className="mt-3 text-sm text-slate-700">{item.detail}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Market Health Snapshot</div>
            <div className="mt-1 text-sm text-slate-500">
              Click a market to filter the dashboard.
            </div>

            <div className="mt-4 space-y-3">
              {marketHealth.map((row) => (
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
                          {row.openTurns} open turns • {row.blocked} blocked
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
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">TurnIQ Recommendations</div>
            <div className="mt-1 text-sm text-slate-500">
              AI recommendations based on blockers, approvals, vendor overlap, and readiness.
            </div>

            <div className="mt-4 space-y-3">
              {recommendations.map((item, idx) => (
                <div
                  key={`${item.title}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    item.tone === "red"
                      ? "border-red-200 bg-red-50"
                      : item.tone === "amber"
                      ? "border-amber-200 bg-amber-50"
                      : item.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-700">{item.body}</div>

                  {!!item.homes?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.homes.map((home) => (
                        <button
                          key={home.id}
                          onClick={() => setSelectedPropertyId(home.id)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        >
                          {home.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Selected Property</div>
            <div className="mt-1 text-sm text-slate-500">
              Operator control panel for the selected home.
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {selectedProperty.name}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedProperty.market} • Turn Owner: {selectedProperty.turnOwner} • Lease End:{" "}
                  {selectedProperty.leaseEnd}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">
                  Stage: {selectedProperty.currentStage}
                </div>
              </div>

              <Pill tone={getToneFromRisk(selectedProperty.risk)}>
                {selectedProperty.turnStatus}
              </Pill>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Readiness</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {selectedProperty.readiness}/100
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Risk</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {selectedProperty.risk}/100
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Est. Cost</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {formatMoney(selectedProperty.projectedCost)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">ECD</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedProperty.projectedCompletion}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-sm font-semibold text-slate-900">Operator Actions</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleResolveBlockers}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Resolve Pending Blockers
                </button>

                <button
                  onClick={handleApproveScope}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Approve Scope
                </button>

                <button
                  onClick={handleAssignVendor}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Assign Vendor
                </button>

                <button
                  onClick={handleStartTurn}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Start Turn
                </button>

                <button
                  onClick={handleCompleteTurn}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Complete Turn
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="font-semibold text-slate-900">AI Turn Timeline Prediction</div>
            <div className="mt-1 text-sm text-slate-500">
              Confidence: {selectedProperty.timelineConfidence}%
            </div>

            <div className="mt-4 space-y-3">
              {selectedProperty.timeline.map((step) => (
                <div
                  key={step.key}
                  className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-sm"
                >
                  <div className="text-slate-800">{step.label}</div>
                  <ProgressBar
                    value={step.progress}
                    tone={
                      step.progress >= 100
                        ? "emerald"
                        : step.progress > 0
                        ? "blue"
                        : "gray"
                    }
                  />
                  <div className="text-slate-500">{step.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card>
            <div className="font-semibold text-slate-900">Primary Blockers</div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedProperty.blockers?.map((b) => (
                <Pill key={b} tone="amber">
                  {b}
                </Pill>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-medium text-slate-900">Readiness Progress</div>
              <ProgressBar
                value={selectedProperty.readiness}
                tone={getReadinessTone(selectedProperty.readiness)}
              />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold uppercase tracking-wide text-blue-800">
              TurnIQ Insight
            </div>
            <div className="mt-3 text-base text-slate-800">{selectedProperty.insight}</div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-lg font-semibold text-slate-900">Active Turn Queue</div>
              <div className="text-sm text-slate-500">Click a property to update the panel</div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Readiness</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Completion</th>
                  </tr>
                </thead>

                <tbody>
                  {horizonProperties.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 ${
                        row.id === selectedProperty.id ? "bg-slate-50" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelectedPropertyId(row.id)}
                          className="text-blue-700 hover:underline"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-3 py-3">{row.market}</td>
                      <td className="px-3 py-3">
                        <Pill tone={getToneFromRisk(row.risk)}>{row.risk}</Pill>
                      </td>
                      <td className="w-[160px] px-3 py-3">
                        <ProgressBar
                          value={row.readiness}
                          tone={getReadinessTone(row.readiness)}
                        />
                      </td>
                      <td className="px-3 py-3">{row.scope}</td>
                      <td className="px-3 py-3">{row.projectedCompletion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="mb-3 text-lg font-semibold text-slate-900">Activity Feed</div>
            <div className="space-y-3">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.type === "note"
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-sm text-slate-800">{item.text}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Leave a note"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddNote}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Add
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}