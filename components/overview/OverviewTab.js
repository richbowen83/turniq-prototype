"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";

function StepCard({ step, title, body }) {
  return (
    <Card className="h-full">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {step}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
    </Card>
  );
}

function SurfaceCard({ title, body }) {
  return (
    <Card className="h-full">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
    </Card>
  );
}

export default function OverviewTab() {
  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="max-w-3xl">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">
            TurnIQ in 60 seconds
          </div>

          <div className="mt-3 text-base leading-7 text-slate-600">
            TurnIQ sits between your PMS and BI layer — turning recorded work
            and reported performance into prioritized action for operators and
            executives.
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone="blue">Control tower</Pill>
            <Pill tone="green">Action-oriented</Pill>
            <Pill tone="slate">Operator + Executive views</Pill>
          </div>
        </div>
      </Card>

      <Card className="border-slate-200 bg-slate-50">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
          What TurnIQ does
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              PMS / System of record
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              Captures the work
            </div>
          </div>

          <div className="flex justify-center text-slate-300">↓</div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-blue-700">
              TurnIQ
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              Prioritizes action
            </div>
          </div>

          <div className="flex justify-center text-slate-300">↓</div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              BI / Reporting layer
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              Explains performance
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <StepCard
          step="1. See the portfolio"
          title="Control Center"
          body="Identify bottlenecks, trendlines, stage pressure, and the few turns most worth acting on right now."
        />

        <StepCard
          step="2. Run the work"
          title="Pipeline"
          body="Plan upcoming turns and manage active execution lanes without cluttering the core operating surface."
        />

        <StepCard
          step="3. Take action"
          title="Turn Drawer"
          body="Open full context, understand blockers, review readiness, and apply the fastest path to recovery."
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Built for two audiences
            </div>
            <div className="mt-1 text-sm text-slate-500">
              The same operating system, with different default lenses.
            </div>
          </div>
          <Pill tone="blue">Mode-aware UI</Pill>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">
              Operator View
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Built for execution: first RRI pass rate, time to complete RRI,
              stage flow, turn duration, lane management, and next action.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="green">Execution</Pill>
              <Pill tone="slate">Stage flow</Pill>
              <Pill tone="slate">Next action</Pill>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">
              Executive View
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Built for outcomes: turns completed, turn time, cost per
              completed turn, efficiency, and portfolio health.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="blue">Outcomes</Pill>
              <Pill tone="slate">Throughput</Pill>
              <Pill tone="slate">Efficiency</Pill>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard
          title="Forecast"
          body="Look ahead at expected turn volume, timing, and operational risk."
        />
        <SurfaceCard
          title="Vendors"
          body="Review vendor coverage, performance, and execution signal."
        />
        <SurfaceCard
          title="Analytics"
          body="Analyze throughput, cost, turn duration, and efficiency over time."
        />
        <SurfaceCard
          title="Import"
          body="Bring in real portfolio data to drive the workspace."
        />
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="text-sm font-semibold text-slate-900">
              Why TurnIQ
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              Your PMS records the work. BI tools report on it. TurnIQ bridges
              both layers to surface risk, prioritize action, and accelerate
              execution.
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-slate-900">
              Less reporting overhead. More operational clarity.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}