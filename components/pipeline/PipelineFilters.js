"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";

function StatTile({ label, value, subtext, tone = "slate" }) {
  const toneClasses = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    green: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        toneClasses[tone] || toneClasses.slate
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      {subtext ? (
        <div className="mt-1 text-sm text-slate-500">{subtext}</div>
      ) : null}
    </div>
  );
}

export default function PipelineFilters({
  upcomingCount,
  upcomingUnassignedCount,
  blockedUpcomingCount = 0,
  activeCount = 0,
}) {
  const planningCoverage = upcomingCount
    ? Math.round(
        ((upcomingCount - upcomingUnassignedCount) / upcomingCount) * 100
      )
    : 100;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Pipeline</div>
          <div className="mt-2 text-sm text-slate-500">
            Plan upcoming turns, monitor stage flow, and spot coverage gaps
            before execution.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill tone="blue">{upcomingCount} upcoming</Pill>
          <Pill tone={upcomingUnassignedCount > 0 ? "amber" : "green"}>
            {upcomingUnassignedCount} unassigned
          </Pill>
          <Pill tone={blockedUpcomingCount > 0 ? "red" : "green"}>
            {blockedUpcomingCount} blocked upcoming
          </Pill>
          <Pill tone="slate">{activeCount} active</Pill>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Upcoming Turns"
          value={upcomingCount}
          subtext="Inside planning window"
          tone="blue"
        />
        <StatTile
          label="Upcoming Unassigned"
          value={upcomingUnassignedCount}
          subtext="Still needs vendor coverage"
          tone={upcomingUnassignedCount > 0 ? "amber" : "green"}
        />
        <StatTile
          label="Blocked Upcoming"
          value={blockedUpcomingCount}
          subtext="Risk before execution"
          tone={blockedUpcomingCount > 0 ? "red" : "green"}
        />
        <StatTile
          label="Active Turns"
          value={activeCount}
          subtext="Already in flight"
          tone="slate"
        />
        <StatTile
          label="Planning Coverage"
          value={`${planningCoverage}%`}
          subtext="Upcoming turns with vendor assigned"
          tone={
            planningCoverage >= 90
              ? "green"
              : planningCoverage >= 75
              ? "amber"
              : "red"
          }
        />
      </div>
    </Card>
  );
}