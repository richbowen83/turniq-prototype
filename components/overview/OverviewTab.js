"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";

function CapabilityCard({ eyebrow, title, body, tone = "default" }) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-5 ${toneClasses}`}>
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
    </div>
  );
}

function SurfaceCard({ title, body, pills = [] }) {
  return (
    <Card className="h-full">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
      {pills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {pills.map((pill) => (
            <Pill key={pill.label} tone={pill.tone || "slate"}>
              {pill.label}
            </Pill>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function JourneyStep({ step, title, body, tone = "default" }) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-5 ${toneClasses}`}>
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {step}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
    </div>
  );
}

function StatCard({ label, value, subtext }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{subtext}</div>
    </div>
  );
}

function OperatingShiftCard({ title, before, after, tone = "default" }) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-5 ${toneClasses}`}>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
          Before
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-600">{before}</div>
      </div>
      <div className="mt-3 rounded-2xl bg-slate-900 p-4 text-white">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
          With TurnIQ
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-100">{after}</div>
      </div>
    </div>
  );
}

export default function OverviewTab() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
        <div className="grid gap-8 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="text-xs uppercase tracking-[0.18em] text-blue-200">
              TurnIQ overview
            </div>

           <div className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-white xl:text-6xl">
  Turn chaos into a prioritized operating plan.
</div>

<div className="mt-2 text-lg text-blue-200">
  The operating system for turns execution.
</div>

<div className="mt-4 max-w-4xl text-base leading-7 text-slate-200 xl:text-lg">
  TurnIQ sits between your system of record and your reporting stack,
  converting raw turn data into risk, readiness, bottlenecks, and
  recovery paths — so operators know exactly what to do next and
  leadership can see where time and revenue are being lost.
</div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="blue">Control tower for turns</Pill>
              <Pill tone="green">Top actions engine</Pill>
              <Pill tone="slate">Forecast + simulator</Pill>
              <Pill tone="slate">Operator + executive lenses</Pill>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Finds the work
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  What needs action now
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Quantifies the stakes
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  Time and revenue exposure
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Guides the move
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  Best recovery path
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Core promise
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  Less reporting. More intervention.
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  TurnIQ closes the gap between seeing a problem and acting on
                  it with confidence.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Product position
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  Not another dashboard. Not a replacement PMS. A decision layer
                  purpose-built for turns execution.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Best used for
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  Daily operating reviews, stage bottleneck triage, vendor
                  allocation, forecast recovery planning, and executive
                  portfolio readouts.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
  label="What to fix now"
  value="Prioritized turns"
  subtext="Surfaces the few turns that actually need attention based on risk, blockers, and delay pressure."
/>
<StatCard
  label="What it’s worth"
  value="Time + revenue"
  subtext="Quantifies days recoverable and revenue at risk so teams focus where impact is highest."
/>
<StatCard
  label="What to do next"
  value="Clear actions"
  subtext="Recommends the fastest path to unblock, advance, and get to rent ready."
/>
<StatCard
  label="Who needs to act"
  value="Operator clarity"
  subtext="Connects ownership, approvals, and vendors so nothing stalls between teams."
/>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              How TurnIQ fits
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              It sits between the system of record and the reporting layer
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              PMS systems store operational truth. BI systems explain outcomes.
              TurnIQ turns both into prioritization, intervention, and operating
              control.
            </div>
          </div>

          <Pill tone="blue">The action layer</Pill>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                System of record
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                Captures the work
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>• Turns, stages, owners, vendors, dates</div>
                <div>• Work orders, inspections, approvals, notes</div>
                <div>• Costs, status changes, field activity</div>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex xl:col-span-1 items-center justify-center text-3xl text-slate-300">
            →
          </div>

          <div className="xl:col-span-2">
            <div className="h-full rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-blue-700">
                TurnIQ
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                Drives action
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div>• Computes risk + readiness</div>
                <div>• Ranks turns by urgency</div>
                <div>• Recommends recovery paths</div>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex xl:col-span-1 items-center justify-center text-3xl text-slate-300">
            →
          </div>

          <div className="xl:col-span-4">
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Reporting layer
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                Explains performance
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>• Throughput, turn duration, and cost</div>
                <div>• Vendor outcomes and portfolio trendlines</div>
                <div>• The business story after execution happens</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <CapabilityCard
          eyebrow="Why this matters"
          title="Turns are revenue timing, not just workflow."
          body="Every day of delay can mean avoidable vacancy, slower lease-up, missed readiness windows, and unnecessary operator thrash."
          tone="amber"
        />
        <CapabilityCard
          eyebrow="What TurnIQ changes"
          title="It converts passive visibility into active control."
          body="Instead of watching stage counts and aging, teams get a prioritized queue, richer context, and a clearer path to recovery."
          tone="blue"
        />
        <CapabilityCard
          eyebrow="What leadership gets"
          title="A cleaner line from operational friction to portfolio impact."
          body="Executives can see where delay, approval drag, and vendor pressure are affecting outcomes without digging through operating systems."
          tone="emerald"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              What changes after import
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              Raw CSV in. Operating intelligence out.
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Once imported, TurnIQ standardizes the portfolio and computes the
              signals the team actually needs to manage work, not just record it.
            </div>
          </div>
          <Pill tone="green">TurnIQ-computed signals</Pill>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Risk</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Identifies delay pressure and execution exposure.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Readiness</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Shows how close a turn is to clean forward progress.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Delay drivers</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Highlights the factors most likely to move ECD.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Forecast confidence</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Makes timeline quality visible, not assumed.
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Action priority</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Pushes the highest-value turns to the top of the day.
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              The TurnIQ workflow
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              From visibility to intervention
            </div>
          </div>
          <Pill tone="blue">Built for operating cadence</Pill>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <JourneyStep
            step="1. See the portfolio"
            title="Control Center"
            body="Surface the turns that matter most right now across blockers, stage pressure, ECD drift, risk, and actionability."
            tone="blue"
          />
          <JourneyStep
            step="2. Run the work"
            title="Pipeline"
            body="Manage upcoming and active turns in a cleaner execution surface without cluttering the primary control tower."
          />
          <JourneyStep
            step="3. Diagnose faster"
            title="Turn Drawer"
            body="Open a turn and understand blocker state, linked work, vendor context, readiness, and recommended moves."
          />
          <JourneyStep
            step="4. Commit smarter"
            title="Forecast + Simulator"
            body="Model downside, recovery paths, and portfolio interventions before committing timeline changes."
            tone="emerald"
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <OperatingShiftCard
          title="Queue management"
          before="Operators hunt through stage views, aging lists, and scattered notes to decide what deserves attention."
          after="TurnIQ ranks the work, explains why it matters now, and pushes the best interventions to the top."
          tone="blue"
        />
        <OperatingShiftCard
          title="Forecasting"
          before="ECDs are reviewed passively, often without a clear view of recoverable days or the true cost of delay."
          after="TurnIQ models downside, shows protectable revenue, and lets the team simulate recovery before acting."
          tone="emerald"
        />
        <OperatingShiftCard
          title="Executive readouts"
          before="Leaders see outputs after the fact and have to infer which operational issues are creating drag."
          after="TurnIQ links execution friction directly to stage pressure, vendor exposure, forecast slippage, and portfolio impact."
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">
              Built for two audiences
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Same operating system. Different default lens.
            </div>
          </div>
          <Pill tone="blue">Mode-aware UI</Pill>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="text-sm font-semibold text-slate-900">Operator View</div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              Built for execution. Operators need to know what is blocked, what
              is aging, what is recoverable, who owns the next move, and which
              turns deserve attention first.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="green">Top actions</Pill>
              <Pill tone="green">Next move</Pill>
              <Pill tone="slate">Stage flow</Pill>
              <Pill tone="slate">Readiness</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="text-sm font-semibold text-slate-900">Executive View</div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              Built for outcomes. Executives need a clean view of portfolio
              health, delay exposure, vendor signal, throughput, and the
              operating drivers behind performance.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="blue">Portfolio health</Pill>
              <Pill tone="blue">Revenue exposure</Pill>
              <Pill tone="slate">Throughput</Pill>
              <Pill tone="slate">Efficiency</Pill>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard
          title="Forecast"
          body="Forecast imported ECDs against modeled delay, quantify exposure, and test what recovery looks like before committing action."
          pills={[
            { label: "Scenario modeling", tone: "blue" },
            { label: "Simulator", tone: "green" },
          ]}
        />
        <SurfaceCard
          title="Vendors"
          body="See vendor allocation, capacity pressure, recommendation fit, bench coverage, and where share should expand or tighten."
          pills={[
            { label: "Allocation", tone: "blue" },
            { label: "Capacity", tone: "amber" },
          ]}
        />
        <SurfaceCard
          title="Analytics"
          body="Translate TurnIQ-computed signals into stage pressure, market load, delay-driver exposure, and operating insights."
          pills={[
            { label: "Computed signals", tone: "green" },
            { label: "Insights", tone: "blue" },
          ]}
        />
        <SurfaceCard
          title="Import"
          body="Bring in real portfolio exports, map source fields, validate coverage, and power the rest of the workspace from live operating data."
          pills={[
            { label: "CSV mapping", tone: "blue" },
            { label: "Validation", tone: "amber" },
          ]}
        />
      </div>

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              Why TurnIQ is different
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              It does not just show the work. It helps the team run the work.
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-700">
              Traditional systems are strongest at storing data or reporting on
              history. TurnIQ is designed for the operating moment in between:
              when a team has to decide where to focus, what to fix first, what
              is slipping, which vendor is under pressure, and what move is most
              likely to recover time and revenue.
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="rounded-3xl border border-blue-200 bg-white p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Operating thesis
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                Less reporting overhead. More operational clarity.
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-600">
                TurnIQ makes execution easier, forecasting smarter, and
                portfolio conversations cleaner.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}