"use client";

import { useMemo, useState } from "react";

const INITIAL_PROPERTIES = [
  {
    id: "p1",
    name: "123 Main St",
    market: "Dallas",
    leaseEnd: "2026-04-30",
    moveOut: "Apr 30",
    risk: 82,
    projectedCost: 2450,
    projectedCompletion: "May 6",
    timelineConfidence: 84,
    scope: "Flooring + Paint",
    turnOwner: "Ashley M.",
    turnStatus: "Ready to Prep",
    insight:
      "Paint and flooring are scheduled within the same week. Bundling vendors could reduce total labor mobilization.",
    timeline: [
      { key: "moveout", label: "Move Out", date: "Apr 30", progress: 100 },
      { key: "flooring", label: "Flooring", date: "May 1–3", progress: 78 },
      { key: "paint", label: "Paint", date: "May 4–5", progress: 52 },
      { key: "qa", label: "QA", date: "May 6", progress: 18 },
      { key: "ready", label: "Ready", date: "May 6", progress: 0 },
    ],
  },
  {
    id: "p2",
    name: "456 Oak Ave",
    market: "Atlanta",
    leaseEnd: "2026-05-12",
    moveOut: "May 12",
    risk: 71,
    projectedCost: 1850,
    projectedCompletion: "May 15",
    timelineConfidence: 79,
    scope: "Paint + Patch",
    turnOwner: "Justin R.",
    turnStatus: "Monitoring",
    insight:
      "Awaiting appliance ETA confirmation. Timeline risk is moderate if delivery slips.",
    timeline: [
      { key: "moveout", label: "Move Out", date: "May 12", progress: 0 },
      { key: "prep", label: "Prep", date: "May 13", progress: 0 },
      { key: "paint", label: "Paint + Patch", date: "May 14", progress: 0 },
      { key: "qa", label: "Clean + QA", date: "May 15", progress: 0 },
      { key: "ready", label: "Ready", date: "May 15", progress: 0 },
    ],
  },
  {
    id: "p3",
    name: "789 Pine Rd",
    market: "Nashville",
    leaseEnd: "2026-05-18",
    moveOut: "May 18",
    risk: 64,
    projectedCost: 950,
    projectedCompletion: "May 19",
    timelineConfidence: 92,
    scope: "Deep Clean",
    turnOwner: "Thomas K.",
    turnStatus: "Monitoring",
    insight: "Low-friction turn. Most work is cosmetic and already staged.",
    timeline: [
      { key: "moveout", label: "Move Out", date: "May 18", progress: 0 },
      { key: "clean", label: "Deep Clean", date: "May 19", progress: 0 },
      { key: "qa", label: "QA", date: "May 19", progress: 0 },
      { key: "ready", label: "Ready", date: "May 19", progress: 0 },
    ],
  },
  {
    id: "p4",
    name: "22 Cedar Ln",
    market: "Phoenix",
    leaseEnd: "2026-04-21",
    moveOut: "Apr 21",
    risk: 88,
    projectedCost: 3850,
    projectedCompletion: "May 1",
    timelineConfidence: 68,
    scope: "Heavy Turn Review",
    turnOwner: "Megan T.",
    turnStatus: "Blocked",
    insight:
      "This turn is high risk due to access delays and unresolved trade dependencies.",
    timeline: [
      { key: "moveout", label: "Move Out", date: "Apr 21", progress: 100 },
      { key: "access", label: "Access", date: "Apr 22", progress: 35 },
      { key: "hvac", label: "HVAC", date: "Apr 23–24", progress: 25 },
      { key: "turnwork", label: "Paint + Flooring", date: "Apr 25–30", progress: 10 },
      { key: "ready", label: "Ready", date: "May 1", progress: 0 },
    ],
  },
  {
    id: "p5",
    name: "88 Willow Dr",
    market: "Dallas",
    leaseEnd: "2026-05-07",
    moveOut: "May 7",
    risk: 59,
    projectedCost: 375,
    projectedCompletion: "May 8",
    timelineConfidence: 91,
    scope: "Deep Clean",
    turnOwner: "Ashley M.",
    turnStatus: "Monitoring",
    insight: "Fast-turn candidate with minimal oversight required.",
    timeline: [
      { key: "moveout", label: "Move Out", date: "May 7", progress: 0 },
      { key: "clean", label: "Deep Clean", date: "May 8", progress: 0 },
      { key: "qa", label: "QA", date: "May 8", progress: 0 },
      { key: "ready", label: "Ready", date: "May 8", progress: 0 },
    ],
  },
];

const INITIAL_CHECKS = {
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

const INITIAL_JOBS = [
  {
    id: "j1",
    property: "123 Main St",
    market: "Dallas",
    trade: "Flooring",
    vendor: "FloorCo",
    start: "May 1",
    finish: "May 3",
    status: "Scheduled",
    budget: 2100,
    actual: 0,
    complete: 0,
    variance: "Flagged",
  },
  {
    id: "j2",
    property: "123 Main St",
    market: "Dallas",
    trade: "Paint",
    vendor: "ABC Paint",
    start: "May 4",
    finish: "May 5",
    status: "Scheduled",
    budget: 1600,
    actual: 0,
    complete: 0,
    variance: "In Range",
  },
  {
    id: "j3",
    property: "456 Oak Ave",
    market: "Atlanta",
    trade: "Paint",
    vendor: "ABC Paint",
    start: "May 13",
    finish: "May 14",
    status: "Scheduled",
    budget: 1150,
    actual: 0,
    complete: 0,
    variance: "In Range",
  },
  {
    id: "j4",
    property: "456 Oak Ave",
    market: "Atlanta",
    trade: "Cleaning",
    vendor: "Sparkle",
    start: "May 15",
    finish: "May 15",
    status: "Scheduled",
    budget: 280,
    actual: 0,
    complete: 0,
    variance: "In Range",
  },
  {
    id: "j5",
    property: "22 Cedar Ln",
    market: "Phoenix",
    trade: "HVAC",
    vendor: "CoolAir",
    start: "Apr 23",
    finish: "Apr 24",
    status: "Delayed",
    budget: 750,
    actual: 300,
    complete: 25,
    variance: "In Range",
  },
  {
    id: "j6",
    property: "22 Cedar Ln",
    market: "Phoenix",
    trade: "Landscaping",
    vendor: "GreenLine",
    start: "Apr 22",
    finish: "Apr 22",
    status: "Scheduled",
    budget: 180,
    actual: 0,
    complete: 0,
    variance: "In Range",
  },
  {
    id: "j7",
    property: "789 Pine Rd",
    market: "Nashville",
    trade: "Cleaning",
    vendor: "Sparkle",
    start: "May 19",
    finish: "May 19",
    status: "Scheduled",
    budget: 150,
    actual: 0,
    complete: 0,
    variance: "In Range",
  },
];

function scoreReadiness(checks) {
  let score = 100;
  const reasons = [];

  checks.forEach(([label, status]) => {
    if (status === "Blocked") {
      score -= 18;
      reasons.push(`${label} blocked`);
    } else if (status === "Pending") {
      score -= 9;
      reasons.push(`${label} pending`);
    }
  });

  score = Math.max(0, Math.min(100, score));

  let status = "Ready";
  if (score < 60) status = "Blocked";
  else if (score < 85) status = "Pending";

  return { score, status, reasons };
}

function formatMoney(value) {
  return `$${value.toLocaleString()}`;
}

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
  const [selectedPropertyId, setSelectedPropertyId] = useState(INITIAL_PROPERTIES[0].id);
  const [selectedTrade, setSelectedTrade] = useState("All Trades");
  const [selectedVendor, setSelectedVendor] = useState("All Vendors");
  const [checksMap, setChecksMap] = useState(INITIAL_CHECKS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);

  const allMarkets = ["All Markets", ...Array.from(new Set(INITIAL_PROPERTIES.map((x) => x.market)))];
  const allTrades = ["All Trades", ...Array.from(new Set(jobs.map((x) => x.trade)))];
  const allVendors = ["All Vendors", ...Array.from(new Set(jobs.map((x) => x.vendor)))];

  const computedProperties = useMemo(() => {
    return INITIAL_PROPERTIES.map((property) => {
      const checks = checksMap[property.name] || [];
      const readiness = scoreReadiness(checks);

      return {
        ...property,
        readiness: readiness.score,
        readinessStatus: readiness.status,
        blockers: readiness.reasons.slice(0, 3),
      };
    });
  }, [checksMap]);

  const filteredProperties = useMemo(() => {
    return computedProperties.filter(
      (x) => selectedMarket === "All Markets" || x.market === selectedMarket
    );
  }, [computedProperties, selectedMarket]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(
      (x) =>
        (selectedMarket === "All Markets" || x.market === selectedMarket) &&
        (selectedTrade === "All Trades" || x.trade === selectedTrade) &&
        (selectedVendor === "All Vendors" || x.vendor === selectedVendor)
    );
  }, [jobs, selectedMarket, selectedTrade, selectedVendor]);

  const selectedProperty =
    filteredProperties.find((x) => x.id === selectedPropertyId) ||
    computedProperties.find((x) => x.id === selectedPropertyId) ||
    filteredProperties[0] ||
    computedProperties[0];

  const readinessChecks = checksMap[selectedProperty.name] || [];

  const marketAnalytics = useMemo(() => {
    const markets = Array.from(new Set(computedProperties.map((x) => x.market)));
    return markets.map((market) => {
      const homes = computedProperties.filter((x) => x.market === market);
      const avgReadiness = Math.round(
        homes.reduce((sum, h) => sum + h.readiness, 0) / homes.length
      );
      const highRisk = homes.filter((h) => h.risk >= 75).length;

      const avgTime =
        market === "Dallas"
          ? "5.8 days"
          : market === "Atlanta"
          ? "6.4 days"
          : market === "Phoenix"
          ? "7.1 days"
          : "5.9 days";

      const avgCost =
        market === "Dallas"
          ? "$2,520"
          : market === "Atlanta"
          ? "$2,210"
          : market === "Phoenix"
          ? "$2,730"
          : "$2,140";

      const noi =
        market === "Dallas"
          ? "$92,000"
          : market === "Atlanta"
          ? "$48,000"
          : market === "Phoenix"
          ? "$39,000"
          : "$35,000";

      return {
        market,
        turns: homes.length,
        avgTime,
        avgCost,
        highRisk,
        readiness: avgReadiness,
        noi,
      };
    });
  }, [computedProperties]);

  const dashboardMetrics = [
    {
      label: "Upcoming Turns",
      value: String(filteredProperties.length || computedProperties.length),
      subtext: "next 60–90 days",
    },
    {
      label: "High-Risk Turns",
      value: String(
        (filteredProperties.length ? filteredProperties : computedProperties).filter(
          (x) => x.risk >= 75
        ).length
      ),
      subtext: "requires proactive planning",
    },
    {
      label: "Blocked Turns",
      value: String(
        (filteredProperties.length ? filteredProperties : computedProperties).filter(
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
          : marketAnalytics.find((x) => x.market === selectedMarket)?.avgTime || "6.2 days",
      subtext: "current trailing average",
    },
    {
      label: "Vacancy Days at Risk",
      value:
        selectedMarket === "All Markets"
          ? "14"
          : String(marketAnalytics.find((x) => x.market === selectedMarket)?.highRisk || 0),
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

  const updateCheckStatus = (propertyName, index, nextStatus) => {
    setChecksMap((prev) => {
      const next = { ...prev };
      next[propertyName] = [...next[propertyName]];
      next[propertyName][index] = [next[propertyName][index][0], nextStatus];
      return next;
    });
  };

  const resolvePendingBlockers = (propertyName) => {
    setChecksMap((prev) => {
      const next = { ...prev };
      next[propertyName] = next[propertyName].map(([label, status]) => [
        label,
        status === "Pending" ? "Ready" : status,
      ]);
      return next;
    });
  };

  const approveScope = (propertyName) => {
    const checks = checksMap[propertyName] || [];
    const index = checks.findIndex(([label]) => label === "Scope approved");
    if (index >= 0) updateCheckStatus(propertyName, index, "Ready");
  };

  const assignVendor = (propertyName) => {
    const checks = checksMap[propertyName] || [];
    const index = checks.findIndex(([label]) => label === "Vendor assigned");
    if (index >= 0) updateCheckStatus(propertyName, index, "Ready");

    setJobs((prev) =>
      prev.map((job) =>
        job.property === propertyName && job.status === "Scheduled"
          ? { ...job, vendor: job.vendor || "Assigned Vendor" }
          : job
      )
    );
  };

  const startTurn = (propertyName) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.property === propertyName && job.status === "Scheduled"
          ? { ...job, status: "In Progress", complete: Math.max(job.complete, 20) }
          : job
      )
    );
  };

  const completeTurn = (propertyName) => {
    setChecksMap((prev) => {
      const next = { ...prev };
      next[propertyName] = next[propertyName].map(([label]) => [label, "Ready"]);
      return next;
    });

    setJobs((prev) =>
      prev.map((job) =>
        job.property === propertyName
          ? { ...job, status: "Complete", complete: 100, actual: job.actual || job.budget }
          : job
      )
    );
  };

  const selectedPropertyJobs = jobs.filter((job) => job.property === selectedProperty.name);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <div className="text-xl font-bold">TurnIQ</div>
              <div className="text-xs text-slate-500">AI-powered turn operations prototype</div>
            </div>
            <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
          </div>

          <div className="grid gap-4 pb-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardMetrics.map((m) => (
              <KPI key={m.label} label={m.label} value={m.value} subtext={m.subtext} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-6 px-6 py-4 text-sm">
          {["Dashboard", "Forecast", "Readiness", "Jobs", "Metrics", "Properties", "Overview"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? "font-semibold text-slate-900" : "text-slate-600 hover:text-slate-900"}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{activeTab}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeTab === "Dashboard" && "See likely upcoming turns, detect blockers early, coordinate jobs, and track turn performance."}
            {activeTab === "Forecast" && "View predicted turns 60–90 days out, likely scope, and AI rationale."}
            {activeTab === "Readiness" && "Track blockers that can delay turn start before crews are dispatched."}
            {activeTab === "Jobs" && "Coordinate work by trade, vendor, budget, and QA status."}
            {activeTab === "Metrics" && "Measure market performance, owner impact, blockers, and vendor efficiency."}
            {activeTab === "Properties" && "Browse the property list and jump directly into turn detail."}
            {activeTab === "Overview" && "High-level product framing and capability summary."}
          </p>
        </div>

        {activeTab !== "Overview" && (
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
                  <KPI label="Turn Readiness Score" value={`${selectedProperty.readiness}/100`} subtext="AI-scored" />
                  <KPI label="Turn Risk Score" value={`${selectedProperty.risk}/100`} subtext="non-renewal likelihood" />
                  <KPI label="Projected Cost" value={formatMoney(selectedProperty.projectedCost)} subtext={selectedProperty.scope} />
                  <KPI label="Projected Completion" value={selectedProperty.projectedCompletion} subtext={`confidence ${selectedProperty.timelineConfidence}%`} />
                </div>

                <div className="mt-5 rounded-xl border border-indigo-300 bg-indigo-50 p-5 text-sm shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">TurnIQ Insight</div>
                  <div className="mt-2 text-slate-700">{selectedProperty.insight}</div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Operator Actions</div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => resolvePendingBlockers(selectedProperty.name)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Resolve Pending Blockers
                    </button>
                    <button
                      onClick={() => approveScope(selectedProperty.name)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      Approve Scope
                    </button>
                    <button
                      onClick={() => assignVendor(selectedProperty.name)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      Assign Vendor
                    </button>
                    <button
                      onClick={() => startTurn(selectedProperty.name)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      Start Turn
                    </button>
                    <button
                      onClick={() => completeTurn(selectedProperty.name)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      Complete Turn
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">AI Turn Timeline Prediction</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Confidence: {selectedProperty.timelineConfidence}%
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedProperty.timeline.map((step, index) => (
                      <div key={`${step.label}-${index}`} className="grid grid-cols-[120px_1fr_70px] items-center gap-3 text-sm">
                        <div className="text-slate-700">{step.label}</div>
                        <div className="h-3 rounded-full bg-slate-200">
                          <div
                            className={`h-3 rounded-full ${step.progress >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500">{step.date}</div>
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
        )}

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
                  with {selectedProperty.timelineConfidence}% confidence.
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
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {computedProperties.filter((p) =>
                      p.blockers.some((b) => b.toLowerCase().includes("electric") || b.toLowerCase().includes("gas") || b.toLowerCase().includes("water"))
                    ).length}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Lockbox / Access</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {computedProperties.filter((p) =>
                      p.blockers.some((b) => b.toLowerCase().includes("lockbox"))
                    ).length}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Materials / Appliance ETA</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {computedProperties.filter((p) =>
                      p.blockers.some((b) => b.toLowerCase().includes("materials") || b.toLowerCase().includes("appliance"))
                    ).length}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Scope Approval</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {computedProperties.filter((p) =>
                      p.blockers.some((b) => b.toLowerCase().includes("scope"))
                    ).length}
                  </div>
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
                  {selectedProperty.timelineConfidence}%
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

                {readinessChecks.map(([item, status], index) => (
                  <div key={item} className="rounded-xl border border-slate-200 px-3 py-3 text-sm hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span>{item}</span>
                      <Pill tone={toneForStatus(status)}>{status}</Pill>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateCheckStatus(selectedProperty.name, index, "Ready")}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                      >
                        Mark Ready
                      </button>
                      <button
                        onClick={() => updateCheckStatus(selectedProperty.name, index, "Pending")}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                      >
                        Mark Pending
                      </button>
                      <button
                        onClick={() => updateCheckStatus(selectedProperty.name, index, "Blocked")}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                      >
                        Mark Blocked
                      </button>
                    </div>
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
                      const property = computedProperties.find((p) => p.name === job.property);
                      return (
                        <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50">
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
                          <td className="px-3 py-3">{formatMoney(job.budget)}</td>
                          <td className="px-3 py-3">{formatMoney(job.actual)}</td>
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
                    Confidence: {selectedProperty.timelineConfidence}%
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">Timeline sequence</div>
                  <div className="mt-3 space-y-2">
                    {selectedProperty.timeline.map((item) => (
                      <div key={item.label + item.date} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        {item.label} — {item.date}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">Selected property jobs</div>
                  <div className="mt-3 space-y-2">
                    {selectedPropertyJobs.length ? (
                      selectedPropertyJobs.map((job) => (
                        <div key={job.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          {job.trade} • {job.vendor} • {job.status}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        No jobs assigned yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Metrics" && (
          <Card title="Market Analytics Dashboard" subtitle="Leadership and owner view across markets">
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <KPI label="Total Turns" value={String(computedProperties.length)} subtext="current planning window" />
              <KPI
                label="Average Readiness"
                value={`${Math.round(computedProperties.reduce((sum, p) => sum + p.readiness, 0) / computedProperties.length)}/100`}
                subtext="portfolio-wide"
              />
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
                  {marketAnalytics
                    .filter((row) => selectedMarket === "All Markets" || row.market === selectedMarket)
                    .map((row) => (
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
                      <div className="font-semibold text-slate-900">{formatMoney(property.projectedCost)}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-600">{property.insight}</div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "Overview" && (
          <Card title="Overview" subtitle="TurnIQ capability summary">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Clickable properties</div>
                <div className="mt-1">Every major workflow can pivot into a selected property detail view.</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Dynamic readiness scoring</div>
                <div className="mt-1">Scores are recalculated from blocked and pending readiness checks in real time.</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Operator actions</div>
                <div className="mt-1">Demo actions change readiness, blockers, jobs, and status so operators can play with the workflow.</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">Market analytics</div>
                <div className="mt-1">Leadership and owners can compare readiness, risk, cost, and NOI impact across markets.</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
