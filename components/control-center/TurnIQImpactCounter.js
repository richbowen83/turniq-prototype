"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";

export default function TurnIQImpactCounter({ impact }) {
  if (!impact) return null;

  const { summary, latestImpact } = impact;

  return (
    <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            AI Impact Counter
          </div>

          <div className="mt-2 text-2xl font-semibold text-slate-900">
            TurnIQ impact created today
          </div>

          <div className="mt-1 text-sm text-slate-600">
            Converts completed AI recommendations into measurable operating value.
          </div>
        </div>

        <Pill tone="green">Live impact</Pill>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Days recovered
          </div>

          <div className="mt-2 text-3xl font-semibold text-emerald-700">
            +{summary.totalDaysRecovered}d
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Revenue protected
          </div>

          <div className="mt-2 text-3xl font-semibold text-emerald-700">
            ${summary.totalRevenueProtected.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            AI actions
          </div>

          <div className="mt-2 text-3xl font-semibold text-blue-700">
            {summary.actionsCompleted}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Turns recovered
          </div>

          <div className="mt-2 text-3xl font-semibold text-blue-700">
            {summary.turnsRecovered}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <span className="font-medium text-slate-900">
          Latest impact:
        </span>{" "}
        {latestImpact?.label ?? "No actions yet"}
      </div>
    </Card>
  );
}