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

export default function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* HERO */}
      <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white">
        <div className="grid gap-8 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="text-xs uppercase tracking-[0.18em] text-blue-200">
              TurnIQ overview
            </div>

            <div className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white xl:text-5xl">
              The operating system for turns execution.
            </div>

            <div className="mt-4 max-w-3xl text-base leading-7 text-slate-200 xl:text-lg">
              Your PMS records the work. BI explains what happened. TurnIQ sits
              in the middle and tells the business what to do next — surfacing
              risk, prioritizing turns, modeling recovery, and helping operators
              move faster with more confidence.
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="blue">Control tower for turns</Pill>
              <Pill tone="green">Action-oriented</Pill>
              <Pill tone="slate">Operator + Executive lenses</Pill>
              <Pill tone="slate">Portfolio-aware</Pill>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="grid gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Core promise
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Less reporting. More action.
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  TurnIQ reduces the gap between knowing there is a problem and
                  taking the right action to recover time and revenue.
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
                  Product position
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  Not another report. Not a replacement PMS. A decision layer
                  built specifically for turns operations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* VALUE STRIP */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sees the portfolio"
          value="Across turns"
          subtext="One surface for stage pressure, blockers, delay risk, readiness, and vendor exposure."
        />
        <StatCard
          label="Prioritizes action"
          value="Next best move"
          subtext="Highlights the few turns worth acting on now instead of forcing operators to hunt through noise."
        />
        <StatCard
          label="Models recovery"
          value="Before you commit"
          subtext="Forecasts delay and revenue exposure, then tests the effect of intervention plans."
        />
        <StatCard
          label="Connects audiences"
          value="Ops + execs"
          subtext="The same system, with different default lenses for execution management and portfolio outcomes."
        />
      </div>

      {/* PMS TO TURNIQ TO BI */}
      <Card className="border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              How TurnIQ fits
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              TurnIQ sits between the system of record and the reporting layer
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              It is the action layer. PMS systems are great at storing
              operational records. BI systems are great at reporting outcomes.
              TurnIQ converts both into intervention, prioritization, and
              operating control.
            </div>
          </div>

          <Pill tone="blue">The action layer</Pill>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 h-full">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                PMS / system of record
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                Captures the work
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>• Turns, stages, owners, vendors, dates, approvals</div>
                <div>• Work orders, inspections, notes, costs</div>
                <div>• The raw operating truth</div>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex xl:col-span-1 items-center justify-center text-3xl text-slate-300">
            →
          </div>

          <div className="xl:col-span-2">
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 h-full">
              <div className="text-xs uppercase tracking-[0.14em] text-blue-700">
                TurnIQ
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                Prioritizes action
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div>• Computes risk and readiness</div>
                <div>• Surfaces blockers and pressure</div>
                <div>• Recommends fastest path to recovery</div>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex xl:col-span-1 items-center justify-center text-3xl text-slate-300">
            →
          </div>

          <div className="xl:col-span-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 h-full">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                BI / reporting layer
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                Explains performance
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>• Turn duration, throughput, cost, vendor outcomes</div>
                <div>• Executive reporting and trend analysis</div>
                <div>• The business story after execution happens</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* WHY IT MATTERS */}
      <div className="grid gap-4 xl:grid-cols-3">
        <CapabilityCard
          eyebrow="Why this matters"
          title="Turns are not just workflow. They are revenue timing."
          body="Every day of delay can mean avoidable vacancy, slower lease-up, missed readiness windows, and unnecessary operator thrash."
          tone="amber"
        />
        <CapabilityCard
          eyebrow="What TurnIQ changes"
          title="It converts passive visibility into active control."
          body="Instead of just watching stage counts and aging, operators get a prioritized queue, richer context, and recovery paths."
          tone="blue"
        />
        <CapabilityCard
          eyebrow="What executives get"
          title="A cleaner line from execution risk to portfolio impact."
          body="Leadership can see where delay, vendor exposure, or approval friction are affecting outcomes — without digging through operational systems."
          tone="emerald"
        />
      </div>

      {/* JOURNEY */}
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
            body="Surface the turns that matter most right now across stage pressure, blockers, risk, readiness, ECD drift, and operator focus."
            tone="blue"
          />
          <JourneyStep
            step="2. Run the work"
            title="Pipeline"
            body="Manage upcoming and active turns in a more execution-friendly surface without crowding the primary control tower."
          />
          <JourneyStep
            step="3. Diagnose faster"
            title="Turn Drawer"
            body="Open a single turn, understand readiness, blocker state, linked work, vendor signal, and modeled recovery options."
          />
          <JourneyStep
            step="4. Commit smarter"
            title="Forecast + Simulator"
            body="Model downside, recovery paths, and portfolio interventions before making changes that affect timelines and revenue."
            tone="emerald"
          />
        </div>
      </Card>

      {/* AUDIENCES */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">
              Built for two audiences
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Same data model. Same operating system. Different default lens.
            </div>
          </div>
          <Pill tone="blue">Mode-aware UI</Pill>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="text-sm font-semibold text-slate-900">Operator View</div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              Designed for execution. Operators need to know what is blocked,
              what is aging, what is recoverable, what needs intervention, and
              what to do next.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="green">Next action</Pill>
              <Pill tone="green">Execution context</Pill>
              <Pill tone="slate">Stage flow</Pill>
              <Pill tone="slate">Readiness</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="text-sm font-semibold text-slate-900">Executive View</div>
            <div className="mt-3 text-sm leading-6 text-slate-700">
              Designed for outcomes. Executives need a clean view of portfolio
              health, delay exposure, vendor signal, throughput, and the
              operational drivers behind performance.
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

      {/* SURFACES */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard
          title="Forecast"
          body="Forecast imported ECDs against modeled delay, quantify exposure, and simulate what recovery looks like before committing action."
          pills={[
            { label: "Scenario modeling", tone: "blue" },
            { label: "Simulator", tone: "green" },
          ]}
        />
        <SurfaceCard
          title="Vendors"
          body="Understand vendor allocation, capacity pressure, bench coverage, recommendation fit, and where to expand or restrict share."
          pills={[
            { label: "Allocation", tone: "blue" },
            { label: "Capacity", tone: "amber" },
          ]}
        />
        <SurfaceCard
          title="Analytics"
          body="See how TurnIQ-computed signals translate into stage pressure, market load, delay-driver exposure, and operating insights."
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

      {/* DIFFERENTIATION */}
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
              history. TurnIQ is designed to improve the operating moment in
              between: when a team has to decide where to focus, what to fix
              first, what is slipping, which vendors are under pressure, and
              what action is most likely to recover time and revenue.
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
                TurnIQ makes execution easier, forecasting smarter, and portfolio
                conversations cleaner.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}