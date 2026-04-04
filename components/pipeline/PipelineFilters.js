"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";

export default function PipelineFilters({
  upcomingCount,
  upcomingUnassignedCount,
  blockedUpcomingCount = 0,
  activeCount = 0,
  selectedHint = "Click any address to open the full turn drawer.",
}) {
  const planningCoverage = upcomingCount
    ? Math.round(((upcomingCount - upcomingUnassignedCount) / upcomingCount) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <div className="text-3xl font-semibold text-slate-900">Pipeline</div>
            <div className="mt-2 text-sm text-slate-500">
              A planning and execution surface for upcoming move-outs, active turns,
              vendor assignment, and next-action control.
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-700">
                How movement works
              </div>
              <div className="mt-2 text-sm text-slate-800">
                Turns move into <span className="font-medium">Upcoming Turns</span> when the{" "}
                <span className="font-medium">Move Out Date is within 21 days</span>, the turn is{" "}
                <span className="font-medium">not Ready</span>, and the stage is not{" "}
                <span className="font-medium">Failed Rent Ready</span>.
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Use the <span className="font-medium">Move → Upcoming</span> control or update the{" "}
                <span className="font-medium">Move Out Date</span> directly in-table.
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Drawer hint
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">{selectedHint}</div>
              <div className="mt-2 text-xs text-slate-500">
                Address links are the primary drill-in entry point for full turn detail.
              </div>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Upcoming Turns
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {upcomingCount}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  In the planning window
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Active Turns
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {activeCount}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Outside the planning lane
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Unassigned Upcoming
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {upcomingUnassignedCount}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Vendor coverage still needed
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Blocked Upcoming
                </div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {blockedUpcomingCount}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Planning risk before execution
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs uppercase tracking-wide text-emerald-700">
                Planning Coverage
              </div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-3xl font-semibold text-slate-900">
                  {planningCoverage}%
                </div>
                <div className="pb-1 text-sm text-slate-500">vendor assigned</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${planningCoverage}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="blue">{upcomingCount} upcoming</Pill>
              <Pill tone={upcomingUnassignedCount > 0 ? "amber" : "green"}>
                {upcomingUnassignedCount} unassigned
              </Pill>
              <Pill tone={blockedUpcomingCount > 0 ? "red" : "green"}>
                {blockedUpcomingCount} blocked upcoming
              </Pill>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}