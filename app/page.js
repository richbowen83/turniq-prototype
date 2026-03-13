"use client";

import { useMemo, useState } from "react";

const PROPERTIES = [
  {
    id: "p1",
    name: "123 Main St",
    market: "Dallas",
    leaseEnd: "2026-04-30",
    moveOut: "Apr 30",
    readiness: 72,
    risk: 82,
    projectedCost: "$2,450",
    projectedCompletion: "May 6",
    timelineConfidence: "84%",
    scope: "Flooring + Paint",
    turnOwner: "Ashley M.",
    readinessStatus: "Blocked",
    turnStatus: "Ready to Prep",
    blockers: ["Utilities not scheduled", "Appliance ETA pending"],
    insight:
      "Paint and flooring are scheduled within the same week. Bundling vendors could reduce total labor mobilization.",
    timeline: [
      "Apr 30 — Resident move-out",
      "May 1 — Flooring start",
      "May 3 — Flooring complete",
      "May 4 — Paint start",
      "May 5 — Paint complete",
      "May 6 — Ready for leasing",
    ],
  },
  {
    id: "p2",
    name: "456 Oak Ave",
    market: "Atlanta",
    leaseEnd: "2026-05-12",
    moveOut: "May 12",
    readiness: 61,
    risk: 71,
    projectedCost: "$1,850",
    projectedCompletion: "May 15",
    timelineConfidence: "79%",
    scope: "Paint + Patch",
    turnOwner: "Justin R.",
    readinessStatus: "Pending",
    turnStatus: "Monitoring",
    blockers: ["Appliance ETA pending"],
    insight:
      "Awaiting appliance ETA confirmation. Timeline risk is moderate if delivery slips.",
    timeline: [
      "May 12 — Resident move-out",
      "May 13 — Paint prep",
      "May 14 — Paint + patch",
      "May 15 — Clean + QA",
    ],
  },
  {
    id: "p3",
    name: "789 Pine Rd",
    market: "Nashville",
    leaseEnd: "2026-05-18",
    moveOut: "May 18",
    readiness: 88,
    risk: 64,
    projectedCost: "$950",
    projectedCompletion: "May 19",
    timelineConfidence: "92%",
    scope: "Deep Clean",
    turnOwner: "Thomas K.",
    readinessStatus: "Ready",
    turnStatus: "Monitoring",
    blockers: [],
    insight: "Low-friction turn. Most work is cosmetic and already staged.",
    timeline: [
      "May 18 — Resident move-out",
      "May 19 — Deep clean + QA",
      "May 19 — Ready for leasing",
    ],
  },
  {
    id: "p4",
    name: "22 Cedar Ln",
    market: "Phoenix",
    leaseEnd: "2026-04-21",
    moveOut: "Apr 21",
    readiness: 41,
    risk: 88,
    projectedCost: "$3,850",
    projectedCompletion: "May 1",
    timelineConfidence: "68%",
    scope: "Heavy Turn Review",
    turnOwner: "Megan T.",
    readinessStatus: "Blocked",
    turnStatus: "Blocked",
    blockers: [
      "Lockbox missing",
      "Scope approval pending",
      "HVAC vendor delayed",
    ],
    insight:
      "This turn is high risk due to access delays and unresolved trade dependencies.",
    timeline: [
      "Apr 21 — Expected move-out",
      "Apr 22 — Access / lockbox resolution",
      "Apr 23 — HVAC start",
      "Apr 25 — Paint + flooring coordination",
      "Apr 30 — QA",
      "May 1 — Ready for leasing",
    ],
  },
  {
    id: "p5",
    name: "88 Willow Dr",
    market: "Dallas",
    leaseEnd: "2026-05-07",
    moveOut: "May 7",
    readiness: 90,
    risk: 59,
    projectedCost: "$375",
    projectedCompletion: "May 8",
    timelineConfidence: "91%",
    scope: "Deep Clean",
    turnOwner: "Ashley M.",
    readinessStatus: "Ready",
    turnStatus: "Monitoring",
    blockers: [],
    insight: "Fast-turn candidate with minimal oversight required.",
    timeline: [
      "May 7 — Resident move-out",
      "May 8 — Deep clean",
      "May 8 — Ready for leasing",
    ],
  },
];

const READINESS_CHECKS = {
  "123 Main St": [
    ["Electric on", "Blocked"],
    ["Water on", "Ready"],
    ["Gas on", "Pending"],
    ["Lockbox installed", "Ready"],
    ["Scope approved", "Ready"],
    ["Materials ordered", "Pending"],
    ["Appliance ETA confirmed", "Pending"],
    ["Vendor assigned", "Ready"],
  ],
  "456 Oak Ave": [
    ["Electric on", "Ready"],
    ["Water on", "Ready"],
    ["Gas on", "Ready"],
    ["Lockbox installed", "Ready"],
    ["Scope approved", "Ready"],
    ["Materials ordered", "Ready"],
    ["Appliance ETA confirmed", "Pending"],
    ["Vendor assigned", "Ready"],
  ],
  "789 Pine Rd": [
    ["Electric on", "Ready"],
    ["Water on", "Ready"],
    ["Gas on", "Ready"],
    ["Lockbox installed", "Ready"],
    ["Scope approved", "Ready"],
    ["Materials ordered", "Ready"],
    ["Appliance ETA confirmed", "Ready"],
    ["Vendor assigned", "Ready"],
  ],
  "22 Cedar Ln": [
    ["Electric on", "Ready"],
    ["Water on", "Ready"],
    ["Gas on", "Pending"],
    ["Lockbox installed", "Blocked"],
    ["Scope approved", "Pending"],
    ["Materials ordered", "Pending"],
    ["Appliance ETA confirmed", "Ready"],
    ["Vendor assigned", "Pending"],
  ],
  "88 Willow Dr": [
    ["Electric on", "Ready"],
    ["Water on", "Ready"],
    ["Gas on", "Ready"],
    ["Lockbox installed", "Ready"],
    ["Scope approved", "Ready"],
    ["Materials ordered", "Ready"],
    ["Appliance ETA confirmed", "Ready"],
    ["Vendor assigned", "Ready"],
  ],
};

const JOBS = [
  {
    property: "123 Main St",
    market: "Dallas",
    trade: "Flooring",
    vendor: "FloorCo",
    start: "May 1",
    finish: "May 3",
    status: "Scheduled",
    budget: "$2,100",
    actual: "$0",
    complete: 0,
    variance: "Flagged",
  },
  {
    property: "123 Main St",
    market: "Dallas",
    trade: "Paint",
    vendor: "ABC Paint",
    start: "May 4",
    finish: "May 5",
    status: "Scheduled",
    budget: "$1,600",
    actual: "$0",
    complete: 0,
    variance: "In Range",
  },
  {
    property: "456 Oak Ave",
    market: "Atlanta",
    trade: "Paint",
    vendor: "ABC Paint",
    start: "May 13",
    finish: "May 14",
    status: "Scheduled",
    budget: "$1,150",
    actual: "$0",
    complete: 0,
    variance: "In Range",
  },
  {
    property: "456 Oak Ave",
    market: "Atlanta",
    trade: "Cleaning",
    vendor: "Sparkle",
    start: "May 15",
    finish: "May 15",
    status: "Scheduled",
    budget: "$280",
    actual: "$0",
    complete: 0,
    variance: "In Range",
  },
  {
    property: "22 Cedar Ln",
    market: "Phoenix",
    trade: "HVAC",
    vendor: "CoolAir",
    start: "Apr 23",
    finish: "Apr 24",
    status: "Delayed",
    budget: "$750",
    actual: "$300",
    complete: 25,
    variance: "In Range",
  },
  {
    property: "22 Cedar Ln",
    market: "Phoenix",
    trade: "Landscaping",
    vendor: "GreenLine",
    start: "Apr 22",
    finish: "Apr 22",
    status: "Scheduled",
    budget: "$180",
    actual: "$0",
    complete: 0,
    variance: "In Range",
  },
  {
    property: "789 Pine Rd",
    market: "Nashville",
    trade: "Cleaning",
    vendor: "Sparkle",
    start: "May 19",
    finish: "May 19",
    status: "Scheduled",
    budget: "$150",
    actual: "$0",
    complete: 0,
    variance: "In Range",
  },
];

const MARKET_ANALYTICS = [
  {
    market: "Dallas",
    turns: 13,
    avgTime: "5.8 days",
    avgCost: "$2,520",
    highRisk: 2,
    readiness: 81,
    noi: "$92,000",
  },
  {
    market: "Atlanta",
    turns: 9,
    avgTime: "6.4 days",
    avgCost: "$2,210",
    highRisk: 1,
    readiness: 84,
    noi: "$48,000",
  },
  {
    market: "Phoenix",
    turns: 11,
    avgTime: "7.1 days",
    avgCost: "$2,730",
    highRisk: 3,
    readiness: 58,
    noi: "$39,000",
  },
  {
    market: "Nashville",
    turns: 6,
    avgTime: "5.9 days",
    avgCost: "$2,140",
    highRisk: 0,
    readiness: 93,
    noi: "$35,000",
  },
];

function Card({ children, title, subtitle, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-slate-100 px-5 py-4">
          {title && <div className="text-sm font-semibold text-slate-900">{title}</div>}
          {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function KPI({ label, value, subtext }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-500">{subtext}</div> : null}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function Selector({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function ProgressBar({ value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-600",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
  };

  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className={`h-2 rounded-full ${tones[tone] || tones.blue}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function Page() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [selectedMarket, setSelectedMarket] = useState("All Markets");
  const [selectedPropertyId, setSelectedPropertyId] = useState(PROPERTIES[0].id);
  const [selectedTrade, setSelectedTrade] = useState("All Trades");
  const [selectedVendor, setSelectedVendor] = useState("All Vendors");

  const allMarkets = ["All Markets", ...Array.from(new Set(PROPERTIES.map((x) => x.market)))];
  const allTrades = ["All Trades", ...Array.from(new Set(JOBS.map((x) => x.trade)))];
  const allVendors = ["All Vendors", ...Array.from(new Set(JOBS.map((x) => x.vendor)))];

  const filteredProperties = useMemo(() => {
    return PROPERTIES.filter(
      (x) => selectedMarket === "All Markets" || x.market === selectedMarket
    );
  }, [selectedMarket]);

  const filteredJobs = useMemo(() => {
    return JOBS.filter(
      (x) =>
        (selectedMarket === "All Markets" || x.market === selectedMarket) &&
        (selectedTrade === "All Trades" || x.trade === selectedTrade) &&
        (selectedVendor === "All Vendors" || x.vendor === selectedVendor)
    );
  }, [selectedMarket, selectedTrade, selectedVendor]);

  const selectedProperty =
    filteredProperties.find((x) => x.id === selectedPropertyId) ||
    PROPERTIES.find((x) => x.id === selectedPropertyId) ||
    filteredProperties[0] ||
    PROPERTIES[0];

  const readinessChecks = READINESS_CHECKS[selectedProperty.name] || [];

  const dashboardMetrics = [
    {
      label: "Upcoming Turns",
      value: String(filteredProperties.length || PROPERTIES.length),
      subtext: "next 60–90 days",
    },
    {
      label: "High-Risk Turns",
      value: String(
        (filteredProperties.length ? filteredProperties : PROPERTIES).filter(
          (x) => x.risk >= 75
        ).length
      ),
      subtext: "requires proactive planning",
    },
    {
      label: "Blocked Turns",
      value: String(
        (filteredProperties.length ? filteredProperties : PROPERTIES).filter(
          (x) => x.readinessStatus === "Blocked"
        ).length
      ),
      subtext: "readiness blockers active",
    },
    {
      label: "Avg Turn Time",
      value:
        selectedMarket === "All Markets"
          ? "6.2 days"
          : MARKET_ANALYTICS.find((x) => x.market === selectedMarket)?.avgTime || "6.2 days",
      subtext: "current trailing average",
    },
    {
      label: "Vacancy Days at Risk",
      value:
        selectedMarket === "All Markets"
          ? "14"
          : String(MARKET_ANALYTICS.find((x) => x.market === selectedMarket)?.highRisk || 0),
      subtext: "linked to active blockers",
    },
  ];

  const toneForStatus = (status) => {
    if (["Blocked", "Critical", "Delayed", "Flagged"].includes(status)) return "red";
    if (["Pending", "Warning", "Monitoring", "Ready to Prep"].includes(status)) return "amber";
    if (["Ready", "Complete", "In Progress", "Scheduled", "In Range"].includes(status)) return "emerald";
    return "slate";
  };

  const readinessTone =
    selectedProperty.readiness < 60
      ? "red"
      : selectedProperty.readiness < 85
      ? "amber"
      : "emerald";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xl font-bold">TurnIQ</div>
              <div className="text-xs text-slate-500">AI-powered turn operations prototype</div>
            </div>
            <nav className="hidden gap-6 text-sm md:flex">
              {["Dashboard", "Forecast", "Readiness", "Jobs", "Metrics", "Properties"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={activeTab === tab ? "font-semibold text-slate-900" : "text-slate-600 hover:text-slate-900"}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboardMetrics.map((m) => (
            <KPI key={m.label} label={m.label} value={m.value} subtext={m.subtext} />
          ))}
        </div>

        <Card title="Platform Overview" subtitle="Core capabilities powering predictive turn operations">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Clickable properties</div>
              <div className="mt-1">Open any turn from the queue and view readiness, jobs, timeline, and cost in one place.</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Readiness scoring AI</div>
              <div className="mt-1">Prioritize turns with a 0–100 readiness score tied to real blockers and timeline impact.</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Market analytics</div>
              <div className="mt-1">Compare turn performance, readiness, cost, and NOI impact by market and operator group.</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">AI timeline prediction</div>
              <div className="mt-1">Forecast completion dates, confidence, and risk drivers before a turn goes off track.</div>
            </div>
          </div>
        </Card>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">TurnIQ Prototype</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{activeTab}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeTab === "Dashboard" && "See likely upcoming turns, detect blockers early, coordinate jobs, and track turn performance."}
            {activeTab === "Forecast" && "View predicted turns 60–90 days out, likely scope, and AI rationale."}
            {activeTab === "Readiness" && "Track blockers that can delay turn start before crews are dispatched."}
            {activeTab === "Jobs" && "Coordinate work by trade, vendor, budget, and QA status."}
            {activeTab === "Metrics" && "Measure market performance, owner impact, blockers, and vendor efficiency."}
            {activeTab === "Properties" && "Browse the property list and jump directly into turn detail."}
          </p>
        </div>

        <Card title="Property Turn Overview" subtitle="Operator control panel for the selected home">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{selectedProperty.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedProperty.market} • Turn Owner: {selectedProperty.turnOwner} • Lease End: {selectedProperty.leaseEnd}
                  </div>
                </div>
                <Pill tone={toneForStatus(selectedProperty.readinessStatus)}>
                  {selectedProperty.readinessStatus}
                </Pill>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <KPI
                  label="Turn Readiness Score"
                  value={`${selectedProperty.readiness}/100`}
                  subtext="AI-scored"
                />
                <KPI
                  label="Turn Risk Score"
                  value={`${selectedProperty.risk}/100`}
                  subtext="non-renewal likelihood"
                />
                <KPI
                  label="Projected Cost"
                  value={selectedProperty.projectedCost}
                  subtext={selectedProperty.scope}
                />
                <KPI
                  label="Projected Completion"
                  value={selectedProperty.projectedCompletion}
                  subtext={`confidence ${selectedProperty.timelineConfidence}`}
                />
              </div>

              <div className="mt-5 rounded-xl border border-indigo-300 bg-indigo-50 p-5 text-sm shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  TurnIQ Insight
                </div>
                <div className="mt-2 text-slate-700">{selectedProperty.insight}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">AI Turn Timeline Prediction</div>
                <div className="mt-2 text-xs text-slate-500">
                  Confidence: {selectedProperty.timelineConfidence}
                </div>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  {selectedProperty.timeline.map((item) => (
                    <div key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Primary blockers</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProperty.blockers.length ? (
                    selectedProperty.blockers.map((b) => (
                      <Pill key={b} tone="amber">
                        {b}
                      </Pill>
                    ))
                  ) : (
                    <Pill tone="emerald">No active blockers</Pill>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">Readiness progress</div>
                <ProgressBar value={selectedProperty.readiness} tone={readinessTone} />
              </div>
            </div>
          </div>
        </Card>

        {activeTab === "Dashboard" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Upcoming Turn Queue" subtitle="Clickable properties drive the workflow">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      {["Property", "Market", "Risk", "Readiness", "Scope", "Completion"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((row) => {
                      const isSelected = row.id === selectedProperty.id;
                      const rowTone =
                        row.readiness < 60 ? "red" : row.readiness < 85 ? "amber" : "emerald";

                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-50 ${isSelected ? "bg-slate-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-3 py-3">
                            <button
                              onClick={() => setSelectedPropertyId(row.id)}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              {row.name}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{row.market}</td>
                          <td className="px-3 py-3">
                            <Pill tone={row.risk >= 75 ? "red" : row.risk >= 60 ? "amber" : "emerald"}>
                              {row.risk}
                            </Pill>
                          </td>
                          <td className="px-3 py-3">
                            <div className="min-w-[140px]">
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{row.readiness}/100</span>
                                <span>{row.readinessStatus}</span>
                              </div>
                              <ProgressBar value={row.readiness} tone={rowTone} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{row.scope}</td>
                          <td className="px-3 py-3 text-slate-600">{row.projectedCompletion}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Readiness alerts" subtitle="Highest impact blockers across active turns">
              <div className="space-y-3">
                {filteredProperties
                  .filter((x) => x.blockers.length)
                  .map((row) => (
                    <button
                      key={row.id}
                      onClick={() => {
                        setSelectedPropertyId(row.id);
                        setActiveTab("Readiness");
                      }}
                      className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{row.name}</div>
                          <div className="mt-1 text-sm text-slate-600">{row.blockers[0]}</div>
                        </div>
                        <Pill tone={toneForStatus(row.readinessStatus)}>
                          {row.readinessStatus}
                        </Pill>
                      </div>
                    </button>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Forecast" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Predicted turns" subtitle="Select a property to drill into risk, scope, and readiness">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      {["Property", "Lease End", "Renewal", "Risk", "Predicted Scope"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setSelectedPropertyId(row.id)}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {row.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{row.leaseEnd}</td>
                        <td className="px-3 py-3 text-slate-600">{row.risk >= 70 ? "Not signed" : "Offered"}</td>
                        <td className="px-3 py-3">
                          <Pill tone={row.risk >= 75 ? "red" : row.risk >= 60 ? "amber" : "emerald"}>
                            {row.risk}
                          </Pill>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{row.scope}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Forecast AI rationale" subtitle={`Selected property: ${selectedProperty.name}`}>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>Lease expires soon and renewal has not been confirmed.</li>
                <li>
                  Historical scope pattern suggests{" "}
                  <span className="font-medium text-slate-900">{selectedProperty.scope}</span>.
                </li>
                <li>
                  Readiness score currently sits at{" "}
                  <span className="font-medium text-slate-900">{selectedProperty.readiness}/100</span>.
                </li>
                <li>
                  Projected completion is{" "}
                  <span className="font-medium text-slate-900">{selectedProperty.projectedCompletion}</span>{" "}
                  with {selectedProperty.timelineConfidence} confidence.
                </li>
              </ul>
            </Card>
          </div>
        )}

        {activeTab === "Readiness" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Readiness Control Center" subtitle="Turn readiness scoring AI highlights what to fix first">
              <div className="mb-5 grid gap-4 md:grid-cols-4 text-sm">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Utilities Off</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">6</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Lockbox / Access</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">4</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Materials / Appliance ETA</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">3</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Scope Approval</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">2</div>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Readiness AI
                </div>
                <div className="mt-2 text-slate-700">
                  <span className="font-medium text-slate-900">{selectedProperty.name}</span> is
                  currently <span className="font-medium text-slate-900">{selectedProperty.readiness}/100</span> ready.
                  The largest score drag comes from{" "}
                  {selectedProperty.blockers[0] || "no active blockers"}.
                </div>
                <div className="mt-2 font-medium text-slate-900">
                  Projected completion: {selectedProperty.projectedCompletion} • Confidence:{" "}
                  {selectedProperty.timelineConfidence}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      {["Property", "Owner", "Readiness Score", "Primary Blocker", "Projected Completion"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((row) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setSelectedPropertyId(row.id)}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {row.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{row.turnOwner}</td>
                        <td className="px-3 py-3">
                          <div className="min-w-[140px]">
                            <div className="mb-1 text-xs text-slate-500">{row.readiness}/100</div>
                            <ProgressBar
                              value={row.readiness}
                              tone={row.readiness < 60 ? "red" : row.readiness < 85 ? "amber" : "emerald"}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{row.blockers[0] || "No active blocker"}</td>
                        <td className="px-3 py-3 text-slate-600">{row.projectedCompletion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Readiness checklist" subtitle={`Selected property: ${selectedProperty.name}`}>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Turn readiness progress</span>
                    <span>{selectedProperty.readiness}/100</span>
                  </div>
                  <ProgressBar value={selectedProperty.readiness} tone={readinessTone} />
                </div>
                {readinessChecks.map(([item, status]) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span>{item}</span>
                    <Pill tone={toneForStatus(status)}>{status}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Jobs" && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Trade Dispatch Board" subtitle="Filter by market, trade, and vendor">
              <div className="mb-4 flex flex-wrap gap-3">
                <Selector value={selectedTrade} onChange={setSelectedTrade} options={allTrades} />
                <Selector value={selectedVendor} onChange={setSelectedVendor} options={allVendors} />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      {["Property", "Trade", "Vendor", "Start", "Finish", "Status", "Budget", "Actual"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => {
                      const property = PROPERTIES.find((p) => p.name === job.property);
                      return (
                        <tr key={`${job.property}-${job.trade}`} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-3">
                            <button
                              onClick={() => property && setSelectedPropertyId(property.id)}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              {job.property}
                            </button>
                          </td>
                          <td className="px-3 py-3">{job.trade}</td>
                          <td className="px-3 py-3">{job.vendor}</td>
                          <td className="px-3 py-3">{job.start}</td>
                          <td className="px-3 py-3">{job.finish}</td>
                          <td className="px-3 py-3">
                            <Pill tone={toneForStatus(job.status)}>{job.status}</Pill>
                          </td>
                          <td className="px-3 py-3">{job.budget}</td>
                          <td className="px-3 py-3">{job.actual}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="AI timeline prediction" subtitle={`Selected property: ${selectedProperty.name}`}>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">Projected completion</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {selectedProperty.projectedCompletion}
                  </div>
                  <div className="mt-1 text-slate-500">
                    Confidence: {selectedProperty.timelineConfidence}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">Timeline sequence</div>
                  <div className="mt-3 space-y-2">
                    {selectedProperty.timeline.map((item) => (
                      <div key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Metrics" && (
          <Card title="Market Analytics Dashboard" subtitle="Leadership and owner view across markets">
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <KPI label="Total Turns" value="39" subtext="current planning window" />
              <KPI label="Average Readiness" value="79/100" subtext="portfolio-wide" />
              <KPI label="Vacancy Days Prevented" value="41" subtext="estimated" />
              <KPI label="Projected NOI Lift" value="$214,000" subtext="owner impact" />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    {["Market", "Turns", "Avg Time", "Avg Cost", "High Risk", "Readiness", "NOI Impact"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MARKET_ANALYTICS.filter(
                    (row) => selectedMarket === "All Markets" || row.market === selectedMarket
                  ).map((row) => (
                    <tr key={row.market} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">{row.market}</td>
                      <td className="px-3 py-3">{row.turns}</td>
                      <td className="px-3 py-3">{row.avgTime}</td>
                      <td className="px-3 py-3">{row.avgCost}</td>
                      <td className="px-3 py-3">{row.highRisk}</td>
                      <td className="px-3 py-3">{row.readiness}/100</td>
                      <td className="px-3 py-3">{row.noi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "Properties" && (
          <Card title="Properties" subtitle="Browse the turn pipeline by home">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProperties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => {
                    setSelectedPropertyId(property.id);
                    setActiveTab("Dashboard");
                  }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{property.name}</div>
                    <Pill tone={toneForStatus(property.readinessStatus)}>
                      {property.readinessStatus}
                    </Pill>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {property.market} • Lease End {property.leaseEnd}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Readiness</div>
                      <div className="font-semibold text-slate-900">{property.readiness}/100</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Projected Cost</div>
                      <div className="font-semibold text-slate-900">{property.projectedCost}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-600">{property.insight}</div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
