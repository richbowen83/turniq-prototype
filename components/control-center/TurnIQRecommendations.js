"use client";

import { useMemo } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

function getRecommendationPack(row) {
  if (row.currentStage === "Failed Rent Ready") {
    return {
      type: "Failed RRI Recovery",
      destination: "Operator",
      tone: "red",
      title: "Recover failed rent ready",
      action: "Clear rework, re-inspect, and confirm rent-ready status.",
    };
  }

  if (row.currentStage === "Owner Approval") {
    return {
      type: "Owner Approval",
      destination: "Owner",
      tone: "amber",
      title: "Push owner approval",
      action: "Escalate approval, confirm scope signoff, and release to dispatch.",
    };
  }

  if (!row.vendor || row.vendor === "TBD") {
    return {
      type: "Vendor Rescue",
      destination: "Vendor",
      tone: "blue",
      title: "Assign vendor coverage",
      action: "Assign or confirm vendor path before ECD risk compounds.",
    };
  }

  return {
    type: "Over-SLA Compression",
    destination: "Operator",
    tone: "green",
    title: "Compress stage time",
    action: "Move the next operational step today to recover avoidable delay.",
  };
}

export default function TurnIQRecommendations({
  rows = [],
  onApproveRecommendation,
}) {
  const recommendations = useMemo(() => {
    return [...rows]
      .filter((row) => row.relayApproved !== true)
      .filter(
        (row) =>
          row.actionEngine?.score >= 28 ||
          row.turnStatus === "Blocked" ||
          row.currentStage === "Failed Rent Ready" ||
          row.currentStage === "Owner Approval" ||
          !row.vendor ||
          row.vendor === "TBD"
      )
      .sort(
        (a, b) =>
          (b.actionEngine?.revenueRecovered || 0) -
            (a.actionEngine?.revenueRecovered || 0) ||
          (b.actionEngine?.daysRecovered || 0) -
            (a.actionEngine?.daysRecovered || 0) ||
          (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0)
      )
      .slice(0, 6)
      .map((row) => ({
        row,
        pack: getRecommendationPack(row),
      }));
  }, [rows]);

  function handleApprove(row, pack) {
    onApproveRecommendation?.({
      row,
      pack,
      patch: {
        relayApproved: true,
        relayStatus: "queued",
        relayApprovedAt: new Date().toISOString(),
        relayDestination: pack.destination,
        relayAction: pack.action,
        relayTitle: pack.title,
        relayType: pack.type,
      },
    });
  }

  return (
    <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-white via-blue-50 to-slate-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            TurnIQ Recommendations
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            Actions ready for approval
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Converts detected risk into approve-ready operating moves. Relay will send these next.
          </div>
        </div>

        <Pill tone="blue">{recommendations.length} ready</Pill>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {recommendations.map(({ row, pack }) => {
          const approved = row.relayApproved === true;

          return (
            <div
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Pill tone={pack.tone}>{pack.type}</Pill>
                  <div className="mt-3 text-base font-semibold text-slate-900">
                    {pack.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {row.name} • {row.market} • {row.currentStage}
                  </div>
                </div>

                <Pill tone={approved ? "green" : "slate"}>
                  {approved ? "Approved" : pack.destination}
                </Pill>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {pack.action}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Days saved
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">
                    +{row.actionEngine?.daysRecovered || 0}d
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Revenue protected
                  </div>
                  <div className="mt-1 text-xl font-semibold text-emerald-700">
                    ${(row.actionEngine?.revenueRecovered || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleApprove(row, pack)}
                disabled={approved}
                className={`mt-4 w-full rounded-xl px-4 py-2 text-sm font-medium ${
                  approved
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {approved ? "Approved for Relay" : "Approve recommendation"}
              </button>
            </div>
          );
        })}
      </div>

      {!recommendations.length ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          No recommendations requiring approval right now.
        </div>
      ) : null}
    </Card>
  );
}