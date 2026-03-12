'use client';

import React, { useMemo, useState } from 'react';

export default function Page() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedMarket, setSelectedMarket] = useState('All Markets');
  const [selectedTrade, setSelectedTrade] = useState('All Trades');
  const [selectedVendor, setSelectedVendor] = useState('All Vendors');
  const [selectedMetricView, setSelectedMetricView] = useState('By Market');
  const [selectedProperty, setSelectedProperty] = useState('123 Main St');
  const [selectedJobKey, setSelectedJobKey] = useState('123 Main St|Paint');

  const upcomingTurns = [
    { property: '123 Main St', market: 'Dallas', leaseEnd: '2026-04-30', risk: 82, scope: 'Flooring + Paint', readiness: 'Blocked', status: 'Ready to Prep', turnOwner: 'Ashley M.' },
    { property: '456 Oak Ave', market: 'Atlanta', leaseEnd: '2026-05-12', risk: 71, scope: 'Paint + Patch', readiness: 'Pending', status: 'Monitoring', turnOwner: 'Justin R.' },
    { property: '789 Pine Rd', market: 'Nashville', leaseEnd: '2026-05-18', risk: 64, scope: 'Deep Clean', readiness: 'Ready', status: 'Monitoring', turnOwner: 'Thomas K.' },
    { property: '22 Cedar Ln', market: 'Phoenix', leaseEnd: '2026-04-21', risk: 88, scope: 'Heavy Turn Review', readiness: 'Blocked', status: 'Blocked', turnOwner: 'Megan T.' },
    { property: '88 Willow Dr', market: 'Dallas', leaseEnd: '2026-05-07', risk: 59, scope: 'Deep Clean', readiness: 'Ready', status: 'Monitoring', turnOwner: 'Ashley M.' },
  ];

  const readinessAlerts = [
    { property: '123 Main St', market: 'Dallas', alert: 'Utilities Off', severity: 'Critical', owner: 'Utility Team', due: 'Today' },
    { property: '22 Cedar Ln', market: 'Phoenix', alert: 'Lockbox Missing', severity: 'Warning', owner: 'Field Ops', due: 'Tomorrow' },
    { property: '456 Oak Ave', market: 'Atlanta', alert: 'Appliance ETA Pending', severity: 'Warning', owner: 'Procurement', due: 'Thu' },
    { property: '22 Cedar Ln', market: 'Phoenix', alert: 'Scope Not Approved', severity: 'Critical', owner: 'Turn Manager', due: 'Today' },
    { property: '123 Main St', market: 'Dallas', alert: 'Special Order Flooring Delayed', severity: 'Warning', owner: 'Materials Team', due: 'Fri' },
  ];

  const jobsByTrade = [
    { trade: 'Paint', assigned: 6, inProgress: 3, delayed: 1 },
    { trade: 'Flooring', assigned: 4, inProgress: 2, delayed: 1 },
    { trade: 'HVAC', assigned: 2, inProgress: 1, delayed: 0 },
    { trade: 'Cleaning', assigned: 7, inProgress: 4, delayed: 0 },
    { trade: 'Landscaping', assigned: 3, inProgress: 1, delayed: 0 },
  ];

  const readinessRows = [
    { property: '123 Main St', market: 'Dallas', turnOwner: 'Ashley M.', utilities: 'Blocked', access: 'Ready', materials: 'Pending', appliance: 'Pending', scope: 'Ready', vendor: 'Ready', overall: 'Blocked' },
    { property: '456 Oak Ave', market: 'Atlanta', turnOwner: 'Justin R.', utilities: 'Ready', access: 'Ready', materials: 'Ready', appliance: 'Pending', scope: 'Ready', vendor: 'Ready', overall: 'Pending' },
    { property: '22 Cedar Ln', market: 'Phoenix', turnOwner: 'Megan T.', utilities: 'Ready', access: 'Blocked', materials: 'Pending', appliance: 'Ready', scope: 'Pending', vendor: 'Pending', overall: 'Blocked' },
    { property: '789 Pine Rd', market: 'Nashville', turnOwner: 'Thomas K.', utilities: 'Ready', access: 'Ready', materials: 'Ready', appliance: 'Ready', scope: 'Ready', vendor: 'Ready', overall: 'Ready' },
  ];

  const jobBoard = [
    { property: '123 Main St', market: 'Dallas', trade: 'Flooring', vendor: 'FloorCo', start: 'Apr 22', finish: 'Apr 24', status: 'Scheduled', budget: '$2,100', actual: '$0', complete: 0, variance: 'Flagged', checklist: 'Pending QA' },
    { property: '123 Main St', market: 'Dallas', trade: 'Paint', vendor: 'ABC Paint', start: 'Apr 25', finish: 'Apr 27', status: 'In Progress', budget: '$1,600', actual: '$900', complete: 55, variance: 'In Range', checklist: 'Progress Photos Uploaded' },
    { property: '456 Oak Ave', market: 'Atlanta', trade: 'Cleaning', vendor: 'Sparkle', start: 'May 13', finish: 'May 13', status: 'Scheduled', budget: '$280', actual: '$0', complete: 0, variance: 'In Range', checklist: 'Awaiting Start' },
    { property: '22 Cedar Ln', market: 'Phoenix', trade: 'HVAC', vendor: 'CoolAir', start: 'Apr 20', finish: 'Apr 21', status: 'Delayed', budget: '$750', actual: '$300', complete: 25, variance: 'In Range', checklist: 'Blocked by Access' },
    { property: '22 Cedar Ln', market: 'Phoenix', trade: 'Landscaping', vendor: 'GreenLine', start: 'Apr 22', finish: 'Apr 22', status: 'Scheduled', budget: '$180', actual: '$0', complete: 0, variance: 'In Range', checklist: 'Scheduled' },
    { property: '789 Pine Rd', market: 'Nashville', trade: 'Paint', vendor: 'ABC Paint', start: 'May 18', finish: 'May 19', status: 'Scheduled', budget: '$900', actual: '$0', complete: 0, variance: 'In Range', checklist: 'Scheduled' },
  ];

  const marketMetrics = [
    { name: 'Dallas', turns: 8, avgTime: '5.8 days', avgCost: '$2,520', saved: 16, qc: '94%' },
    { name: 'Atlanta', turns: 5, avgTime: '6.4 days', avgCost: '$2,210', saved: 9, qc: '91%' },
    { name: 'Phoenix', turns: 7, avgTime: '7.1 days', avgCost: '$2,730', saved: 11, qc: '88%' },
    { name: 'Nashville', turns: 4, avgTime: '5.9 days', avgCost: '$2,140', saved: 5, qc: '95%' },
  ];

  const tradeMetrics = [
    { name: 'Paint', onTime: '91%', qc: '95%', variance: '+3%', volume: 12 },
    { name: 'Flooring', onTime: '86%', qc: '92%', variance: '+8%', volume: 7 },
    { name: 'Cleaning', onTime: '97%', qc: '99%', variance: '+1%', volume: 14 },
    { name: 'HVAC', onTime: '84%', qc: '90%', variance: '+5%', volume: 5 },
    { name: 'Landscaping', onTime: '93%', qc: '96%', variance: '+2%', volume: 6 },
  ];

  const vendorMetrics = [
    { name: 'ABC Paint', trade: 'Paint', onTime: '91%', qc: '95%', variance: '+3%' },
    { name: 'FloorCo', trade: 'Flooring', onTime: '86%', qc: '92%', variance: '+8%' },
    { name: 'Sparkle', trade: 'Cleaning', onTime: '97%', qc: '99%', variance: '+1%' },
    { name: 'CoolAir', trade: 'HVAC', onTime: '84%', qc: '90%', variance: '+5%' },
    { name: 'GreenLine', trade: 'Landscaping', onTime: '93%', qc: '96%', variance: '+2%' },
  ];

  const titleText = {
    Dashboard: 'See likely upcoming turns, detect blockers early, coordinate jobs, and track turn performance.',
    Forecast: 'View predicted turns 60–90 days out, likely scope, and AI rationale.',
    Readiness: 'Track blockers that can delay turn start before crews are dispatched.',
    Jobs: 'Coordinate work by trade, vendor, budget, and QA status.',
    Metrics: 'Measure turn performance, cost, blockers, and vendor efficiency.',
  };

  const allMarkets = ['All Markets', ...Array.from(new Set(upcomingTurns.map((x) => x.market)))];
  const allTrades = ['All Trades', ...Array.from(new Set(jobBoard.map((x) => x.trade)))];
  const allVendors = ['All Vendors', ...Array.from(new Set(jobBoard.map((x) => x.vendor)))];

  const filteredUpcomingTurns = useMemo(() => upcomingTurns.filter((x) => selectedMarket === 'All Markets' || x.market === selectedMarket), [selectedMarket]);
  const filteredAlerts = useMemo(() => readinessAlerts.filter((x) => selectedMarket === 'All Markets' || x.market === selectedMarket), [selectedMarket]);
  const filteredReadiness = useMemo(() => readinessRows.filter((x) => selectedMarket === 'All Markets' || x.market === selectedMarket), [selectedMarket]);
  const filteredJobs = useMemo(() => jobBoard.filter((x) => (selectedMarket === 'All Markets' || x.market === selectedMarket) && (selectedTrade === 'All Trades' || x.trade === selectedTrade) && (selectedVendor === 'All Vendors' || x.vendor === selectedVendor)), [selectedMarket, selectedTrade, selectedVendor]);

  const selectedPropertyForecast = filteredUpcomingTurns.find((x) => x.property === selectedProperty) || filteredUpcomingTurns[0] || upcomingTurns[0];
  const selectedReadiness = filteredReadiness.find((x) => x.property === selectedProperty) || filteredReadiness[0] || readinessRows[0];
  const selectedJob = filteredJobs.find((x) => `${x.property}|${x.trade}` === selectedJobKey) || filteredJobs[0] || jobBoard[0];

  const topMetricCards = useMemo(() => {
    const turns = filteredUpcomingTurns.length ? filteredUpcomingTurns : upcomingTurns;
    const readiness = filteredReadiness.length ? filteredReadiness : readinessRows;
    return [
      { label: 'Upcoming Turns', value: String(turns.length) },
      { label: 'High-Risk Turns', value: String(turns.filter((x) => x.risk >= 75).length) },
      { label: 'Blocked Turns', value: String(readiness.filter((x) => x.overall === 'Blocked').length) },
      { label: 'Avg Turn Time', value: selectedMarket === 'All Markets' ? '6.2 days' : (marketMetrics.find((m) => m.name === selectedMarket)?.avgTime || '6.2 days') },
      { label: 'Vacancy Days at Risk', value: selectedMarket === 'All Markets' ? '14' : String(marketMetrics.find((m) => m.name === selectedMarket)?.saved || 0) },
    ];
  }, [filteredUpcomingTurns, filteredReadiness, selectedMarket]);

  const statusClass = (status) => {
    if (['Blocked', 'Critical', 'Delayed', 'Flagged'].includes(status)) return 'bg-red-100 text-red-700';
    if (['Pending', 'Warning', 'Monitoring', 'Ready to Prep'].includes(status)) return 'bg-amber-100 text-amber-700';
    if (['Ready', 'Complete', 'In Progress', 'Scheduled', 'Approved', 'In Range'].includes(status)) return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-700';
  };

  const Card = ({ title, subtitle, children, className = '' }) => (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const Pill = ({ children, status }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>{children}</span>;

  const KPI = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );

  const SectionTitle = ({ eyebrow, title, text }) => (
    <div>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</div>}
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  );

  const Table = ({ headers, rows }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-500">
            {headers.map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  const Selector = ({ value, onChange, options }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );

  const FilterRow = ({ children }) => <div className="flex flex-wrap gap-3">{children}</div>;

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
              {['Dashboard', 'Forecast', 'Readiness', 'Jobs', 'Metrics'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'}>{tab}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <Card title="Prototype Focus" subtitle="Updated to reflect next-best moves for operator review">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 p-4"><div className="font-semibold text-slate-900">1. Real terminology</div><div className="mt-1">Added turn owners, turn teams, readiness states, and operator-friendly labels.</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="font-semibold text-slate-900">2. Key blockers</div><div className="mt-1">Included utilities, lockbox/access, scope approval, appliance ETA, and materials delays.</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="font-semibold text-slate-900">3. Operator-first flows</div><div className="mt-1">Prioritized alerting, readiness, and trade coordination over polished design.</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="font-semibold text-slate-900">4. Data-ready</div><div className="mt-1">Structured screens so Darwin data can be connected later without changing the workflow.</div></div>
          </div>
        </Card>

        <SectionTitle eyebrow="TurnIQ Prototype" title={activeTab} text={titleText[activeTab]} />

        {selectedProperty && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Property Turn Overview</div>
                <div className="text-lg font-semibold text-slate-900">{selectedProperty}</div>
              </div>
              <div className="text-xs text-slate-500">Turn Owner: Ashley M.</div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Predicted Move-Out</div><div className="mt-1 font-semibold text-slate-900">Apr 30</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Turn Readiness</div><div className="mt-1 font-semibold text-slate-900">72%</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Projected Turn Cost</div><div className="mt-1 font-semibold text-slate-900">$2,450</div></div>
            </div>
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">AI Insight</div>
              <div className="mt-1 text-slate-700">Paint and flooring are scheduled within the same week. Bundling vendors could reduce total labor mobilization.</div>
              <div className="mt-1 font-medium text-slate-900">Estimated savings: $320</div>
            </div>
          </div>
        )}

        {activeTab === 'Dashboard' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {topMetricCards.map((m) => <KPI key={m.label} label={m.label} value={m.value} />)}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card title="Upcoming Turn Queue" subtitle="Forecast likely turns 60–90 days out" className="xl:col-span-2">
                <Table headers={["Property", "Market", "Lease End", "Turn Risk", "Predicted Scope", "Turn Owner", "Readiness", "Status"]} rows={filteredUpcomingTurns.map((row) => (
                  <tr key={row.property} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => setSelectedProperty(row.property)}>
                    <td className="px-3 py-3 font-medium">{row.property}</td>
                    <td className="px-3 py-3 text-slate-600">{row.market}</td>
                    <td className="px-3 py-3 text-slate-600">{row.leaseEnd}</td>
                    <td className="px-3 py-3"><Pill status={row.risk > 75 ? 'Critical' : row.risk > 60 ? 'Warning' : 'Ready'}>{row.risk}%</Pill></td>
                    <td className="px-3 py-3 text-slate-600">{row.scope}</td>
                    <td className="px-3 py-3 text-slate-600">{row.turnOwner}</td>
                    <td className="px-3 py-3"><Pill status={row.readiness}>{row.readiness}</Pill></td>
                    <td className="px-3 py-3"><Pill status={row.status}>{row.status}</Pill></td>
                  </tr>
                ))} />
              </Card>

              <Card title="Readiness Alerts" subtitle="Pre-turn blockers that can delay turn start">
                <div className="space-y-3">
                  {filteredAlerts.map((alert) => (
                    <div key={alert.property + alert.alert} className="rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50" onClick={() => { setActiveTab('Readiness'); setSelectedProperty(alert.property); }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{alert.property}</div>
                          <div className="mt-1 text-sm text-slate-600">{alert.alert}</div>
                        </div>
                        <Pill status={alert.severity}>{alert.severity}</Pill>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Owner: {alert.owner} • Due: {alert.due}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'Forecast' && (
          <div className="space-y-6">
            <FilterRow>
              <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">Next 90 Days</div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">High + Medium Risk</div>
            </FilterRow>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card title="Turn Forecast" subtitle="Predicted turns with AI rationale and likely scope" className="xl:col-span-2">
                <Table headers={["Property", "Market", "Lease End", "Renewal", "Turn Risk", "Heavy Turn Risk", "Predicted Scope"]} rows={filteredUpcomingTurns.map((r) => (
                  <tr key={r.property} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => setSelectedProperty(r.property)}>
                    <td className="px-3 py-3 font-medium">{r.property}</td>
                    <td className="px-3 py-3">{r.market}</td>
                    <td className="px-3 py-3">{r.leaseEnd}</td>
                    <td className="px-3 py-3">{r.risk > 70 ? 'Not signed' : 'Offered'}</td>
                    <td className="px-3 py-3">{r.risk}%</td>
                    <td className="px-3 py-3">{r.risk > 75 ? 'High' : r.risk > 60 ? 'Medium' : 'Low'}</td>
                    <td className="px-3 py-3">{r.scope}</td>
                  </tr>
                ))} />
              </Card>

              <Card title="Selected Property" subtitle="Forecast detail and recommended next steps">
                <div className="space-y-4 text-sm text-slate-600">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{selectedPropertyForecast.property}</div>
                    <div className="mt-1">{selectedPropertyForecast.market} • Lease end {selectedPropertyForecast.leaseEnd} • Turn owner {selectedPropertyForecast.turnOwner}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="font-medium text-slate-900">AI rationale</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Lease expires soon</li>
                      <li>Renewal not signed</li>
                      <li>Maintenance activity elevated</li>
                      <li>Prior scope pattern suggests {selectedPropertyForecast.scope}</li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="font-medium text-slate-900">Predicted scope</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill status="Ready">{selectedPropertyForecast.scope}</Pill>
                      <Pill status="Warning">Appliance Review</Pill>
                      <Pill status="Ready">Deep Clean</Pill>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={() => setActiveTab('Readiness')}>Open Readiness</button>
                    <button className="rounded-xl border border-slate-200 px-4 py-2" onClick={() => setActiveTab('Jobs')}>View Jobs</button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'Readiness' && (
          <div className="space-y-6">
            <FilterRow>
              <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">Blocked + Pending</div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">Critical Issues Only</div>
            </FilterRow>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card title="Readiness Control Center" subtitle="Identify and resolve blockers before a turn begins" className="xl:col-span-2">
                <div className="mb-5 grid gap-4 md:grid-cols-4 text-sm">
                  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Utilities Off</div><div className="mt-1 text-lg font-semibold text-slate-900">6</div></div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Lockbox / Access</div><div className="mt-1 text-lg font-semibold text-slate-900">4</div></div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Materials / Appliance ETA</div><div className="mt-1 text-lg font-semibold text-slate-900">3</div></div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Scope Approval</div><div className="mt-1 text-lg font-semibold text-slate-900">2</div></div>
                </div>

                <div className="mb-4 text-sm text-slate-600">
                  Each unit receives a <span className="font-medium text-slate-900">Turn Readiness Score</span> so operators can prioritize which turns must be unblocked first.
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">AI Insight</div>
                    <div className="mt-1 text-slate-700">If <span className="font-medium">utilities at 123 Main St</span> are restored today, the projected turn start moves forward by <span className="font-medium">2 days</span>.</div>
                    <div className="mt-1 text-slate-700">Estimated vacancy savings: <span className="font-semibold text-slate-900">$430</span>.</div>
                  </div>
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm text-slate-600">
                  <div className="rounded-xl bg-slate-50 p-3"><span className="font-medium text-slate-900">Focus blockers:</span> Utilities, lockbox/access, scope approval, appliance ETA, materials.</div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="font-medium text-slate-900">Operator action:</span> Assign owner, escalate blocker, follow up on vendor or procurement.</div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="font-medium text-slate-900">Future data hook:</span> Pull live readiness fields from Darwin workflow systems.</div>
                </div>

                <Table headers={["Property", "Market", "Turn Owner", "Utilities", "Access", "Materials", "Appliance ETA", "Scope", "Vendor", "Overall"]} rows={filteredReadiness.map((r) => (
                  <tr key={r.property} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => setSelectedProperty(r.property)}>
                    <td className="px-3 py-3 font-medium">{r.property}</td>
                    <td className="px-3 py-3 text-slate-600">{r.market}</td>
                    <td className="px-3 py-3 text-slate-600">{r.turnOwner}</td>
                    <td className="px-3 py-3"><Pill status={r.utilities}>{r.utilities}</Pill></td>
                    <td className="px-3 py-3"><Pill status={r.access}>{r.access}</Pill></td>
                    <td className="px-3 py-3"><Pill status={r.materials}>{r.materials}</Pill></td>
                    <td className="px-3 py-3"><Pill status={r.appliance}>{r.appliance}</Pill></td>
                    <td className="px-3 py-3"><Pill status={r.scope}>{r.scope}</Pill></td>
                    <td className="px-3 py-3"><Pill status={r.vendor}>{r.vendor}</Pill></td>
                    <td className="px-3 py-3"><Pill status={r.overall}>{r.overall}</Pill></td>
                  </tr>
                ))} />
              </Card>

              <Card title="Readiness Checklist" subtitle={`Selected property: ${selectedReadiness.property}`}>
                <div className="space-y-4 text-sm text-slate-600">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500"><span>Turn readiness progress</span><span>{selectedReadiness.overall}</span></div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${selectedReadiness.overall === 'Blocked' ? 'bg-red-500' : selectedReadiness.overall === 'Pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: selectedReadiness.overall === 'Ready' ? '100%' : selectedReadiness.overall === 'Pending' ? '60%' : '35%' }} /></div>
                  </div>

                  {[
                    ['Electric on', selectedReadiness.utilities],
                    ['Water on', 'Ready'],
                    ['Gas on', 'Pending'],
                    ['Lockbox installed', selectedReadiness.access],
                    ['Scope approved', selectedReadiness.scope],
                    ['Materials ordered', selectedReadiness.materials],
                    ['Appliance ETA confirmed', selectedReadiness.appliance],
                    ['Vendor assigned', selectedReadiness.vendor],
                  ].map(([item, status]) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                      <span>{item}</span>
                      <Pill status={status}>{status}</Pill>
                    </div>
                  ))}

                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-blue-600 px-4 py-2 text-white">Assign Owner</button>
                    <button className="rounded-xl border border-slate-200 px-4 py-2">Escalate Blocker</button>
                    <button className="rounded-xl border border-slate-200 px-4 py-2" onClick={() => setActiveTab('Jobs')}>Open Jobs</button>
                    <button className="rounded-xl border border-slate-200 px-4 py-2">Add Note</button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'Jobs' && (
          <div className="space-y-6">
            <FilterRow>
              <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
              <Selector value={selectedTrade} onChange={setSelectedTrade} options={allTrades} />
              <Selector value={selectedVendor} onChange={setSelectedVendor} options={allVendors} />
            </FilterRow>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card title="Trade Dispatch Board" subtitle="Coordinate turn work by trade and vendor" className="xl:col-span-2">
                <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm">
                  {['Paint', 'Flooring', 'Cleaning', 'HVAC', 'Landscaping'].map((trade) => {
                    const jobs = filteredJobs.filter((j) => j.trade === trade);
                    if (!jobs.length) return null;
                    return (
                      <div key={trade} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{trade}</div>
                        <div className="space-y-2">
                          {jobs.map((job) => (
                            <div key={job.property + job.trade} onClick={() => { setSelectedJobKey(`${job.property}|${job.trade}`); setSelectedProperty(job.property); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50">
                              <div className="flex justify-between">
                                <span className="font-medium text-slate-900">{job.property}</span>
                                <span className="text-slate-500">{job.complete}%</span>
                              </div>
                              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                                <span>{job.vendor}</span>
                                <span className={`rounded px-2 py-0.5 ${job.status === 'Delayed' ? 'bg-red-100 text-red-700' : job.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{job.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Jobs now reflect operator workflows by <span className="font-medium text-slate-900">trade</span> and highlight <span className="font-medium text-slate-900">scope variance</span> plus <span className="font-medium text-slate-900">checklist / QA state</span>.
                </div>

                <Table headers={["Property", "Trade", "Vendor", "Start", "Finish", "Status", "Budget", "Actual", "Variance", "QA / Checklist", "% Complete"]} rows={filteredJobs.map((job) => (
                  <tr key={`${job.property}|${job.trade}`} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedJobKey(`${job.property}|${job.trade}`); setSelectedProperty(job.property); }}>
                    <td className="px-3 py-3 font-medium">{job.property}</td>
                    <td className="px-3 py-3">{job.trade}</td>
                    <td className="px-3 py-3">{job.vendor}</td>
                    <td className="px-3 py-3">{job.start}</td>
                    <td className="px-3 py-3">{job.finish}</td>
                    <td className="px-3 py-3"><Pill status={job.status}>{job.status}</Pill></td>
                    <td className="px-3 py-3">{job.budget}</td>
                    <td className="px-3 py-3">{job.actual}</td>
                    <td className="px-3 py-3"><Pill status={job.variance}>{job.variance}</Pill></td>
                    <td className="px-3 py-3">{job.checklist}</td>
                    <td className="px-3 py-3">{job.complete}%</td>
                  </tr>
                ))} />
              </Card>

              <Card title="Selected Job" subtitle="Trade-level detail, scope, and QA">
                <div className="space-y-4 text-sm text-slate-600">
                  <div><div className="text-base font-semibold text-slate-900">{selectedJob.property} • {selectedJob.trade}</div><div className="mt-1">Vendor: {selectedJob.vendor} • Start: {selectedJob.start} • Finish: {selectedJob.finish}</div></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase text-slate-500">Budget</div><div className="mt-1 font-semibold text-slate-900">{selectedJob.budget}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase text-slate-500">Actual</div><div className="mt-1 font-semibold text-slate-900">{selectedJob.actual}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase text-slate-500">Variance</div><div className="mt-1 font-semibold text-slate-900">{selectedJob.variance}</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase text-slate-500">Complete</div><div className="mt-1 font-semibold text-slate-900">{selectedJob.complete}%</div></div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="font-medium text-slate-900">Scope items</div><ul className="mt-2 space-y-2"><li>✅ Initial scope approved</li><li>✅ Crew dispatched</li><li>⚠️ Final completion pending QA</li><li>⚠️ Variance review {selectedJob.variance === 'Flagged' ? 'required' : 'not required'}</li></ul></div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="font-medium text-slate-900">Turn Timeline</div><ul className="mt-2 space-y-2 text-sm text-slate-600"><li>📅 Apr 21 — Utilities restored</li><li>🪵 Apr 22 — Flooring start</li><li>🪵 Apr 24 — Flooring complete</li><li>🎨 Apr 25 — Paint start</li><li>🎨 Apr 27 — Paint complete</li><li>🧹 Apr 28 — Cleaning</li><li>🏁 Apr 29 — Ready for leasing</li></ul></div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="font-medium text-slate-900">AI / QA box</div><ul className="mt-2 list-disc space-y-1 pl-5"><li>Checklist status: {selectedJob.checklist}</li><li>Remaining balance and completion tracked automatically</li><li>Click-through ready for future photo verification</li></ul></div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'Metrics' && (
          <div className="space-y-6">
            <FilterRow>
              <Selector value={selectedMetricView} onChange={setSelectedMetricView} options={['By Market', 'By Trade', 'By Vendor']} />
              <Selector value={selectedMarket} onChange={setSelectedMarket} options={allMarkets} />
              <Selector value={selectedTrade} onChange={setSelectedTrade} options={allTrades} />
              <Selector value={selectedVendor} onChange={setSelectedVendor} options={allVendors} />
            </FilterRow>

            <Card title="Metrics" subtitle="Performance, cost, blockers, and owner impact">
              <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">Owner NOI Impact</div>
                <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div><div className="text-xs text-slate-500">Vacancy Days Prevented</div><div className="text-lg font-semibold text-slate-900">41</div></div>
                  <div><div className="text-xs text-slate-500">Turn Cost Savings</div><div className="text-lg font-semibold text-slate-900">$82,400</div></div>
                  <div><div className="text-xs text-slate-500">Vendor Efficiency Gain</div><div className="text-lg font-semibold text-slate-900">+12%</div></div>
                  <div><div className="text-xs text-slate-500">Projected NOI Lift</div><div className="text-lg font-semibold text-slate-900">$214,000</div></div>
                </div>
                <div className="mt-3 text-slate-600">TurnIQ converts operational improvements into measurable asset-level NOI impact for owners and asset managers.</div>
              </div>

              <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Metrics are framed for operators first: <span className="font-medium text-slate-900">time saved</span>, <span className="font-medium text-slate-900">cost control</span>, <span className="font-medium text-slate-900">QC pass rate</span>, and <span className="font-medium text-slate-900">top readiness blockers</span>.
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Avg Turn Time', value: selectedMarket === 'All Markets' ? '6.2 days' : (marketMetrics.find((m) => m.name === selectedMarket)?.avgTime || '6.2 days') },
                  { label: 'Avg Turn Cost', value: selectedMarket === 'All Markets' ? '$2,450' : (marketMetrics.find((m) => m.name === selectedMarket)?.avgCost || '$2,450') },
                  { label: 'Vacancy Days Saved', value: selectedMarket === 'All Markets' ? '41' : String(marketMetrics.find((m) => m.name === selectedMarket)?.saved || 0) },
                  { label: 'QC Pass Rate', value: selectedMarket === 'All Markets' ? '92%' : (marketMetrics.find((m) => m.name === selectedMarket)?.qc || '92%') },
                ].map((m) => <KPI key={m.label} label={m.label} value={m.value} />)}
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold text-slate-900">Detail View</div><Pill status="Ready">{selectedMetricView}</Pill></div>
                  {selectedMetricView === 'By Market' && <Table headers={["Market", "Turns", "Avg Time", "Avg Cost", "Days Saved", "QC Pass"]} rows={marketMetrics.filter((m) => selectedMarket === 'All Markets' || m.name === selectedMarket).map((r) => <tr key={r.name} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => setSelectedMarket(r.name)}><td className="px-3 py-3 font-medium">{r.name}</td><td className="px-3 py-3">{r.turns}</td><td className="px-3 py-3">{r.avgTime}</td><td className="px-3 py-3">{r.avgCost}</td><td className="px-3 py-3">{r.saved}</td><td className="px-3 py-3">{r.qc}</td></tr>)} />}
                  {selectedMetricView === 'By Trade' && <Table headers={["Trade", "Volume", "On-Time %", "QC Pass %", "Cost Variance"]} rows={tradeMetrics.filter((m) => selectedTrade === 'All Trades' || m.name === selectedTrade).map((r) => <tr key={r.name} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => setSelectedTrade(r.name)}><td className="px-3 py-3 font-medium">{r.name}</td><td className="px-3 py-3">{r.volume}</td><td className="px-3 py-3">{r.onTime}</td><td className="px-3 py-3">{r.qc}</td><td className="px-3 py-3">{r.variance}</td></tr>)} />}
                  {selectedMetricView === 'By Vendor' && <Table headers={["Vendor", "Trade", "On-Time %", "QC Pass %", "Cost Variance"]} rows={vendorMetrics.filter((m) => selectedVendor === 'All Vendors' || m.name === selectedVendor).map((r) => <tr key={r.name} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedVendor(r.name); setSelectedTrade(r.trade); }}><td className="px-3 py-3 font-medium">{r.name}</td><td className="px-3 py-3">{r.trade}</td><td className="px-3 py-3">{r.onTime}</td><td className="px-3 py-3">{r.qc}</td><td className="px-3 py-3">{r.variance}</td></tr>)} />}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Top Readiness Blockers</div>
                  <div className="space-y-3">
                    {[['Utilities', 6], ['Lockbox / Access', 4], ['Materials / Appliance ETA', 3], ['Scope Approval', 2]].map(([name, value]) => (
                      <div key={name}>
                        <div className="mb-1 flex justify-between text-sm"><span>{name}</span><span className="text-slate-500">{value}</span></div>
                        <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${value * 12}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
