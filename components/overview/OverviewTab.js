"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";
import ProgressBar from "../shared/ProgressBar";

function getToneFromRisk(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "emerald";
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function maxOrOne(values) {
  const max = Math.max(...values, 0);
  return max > 0 ? max : 1;
}

function getActionRollup(actionHistory = []) {
  const completed = actionHistory.filter((a) => a.kind === "completed");

  const totalActions = completed.length;
  const delayDaysAvoided = completed.reduce((sum, a) => sum + (a.daysAvoided || 0), 0);
  const vacancySavings = completed.reduce((sum, a) => sum + (a.vacancySavings || 0), 0);
  const avgResponseMinutes = totalActions
    ? Math.round(
        completed.reduce((sum, a) => sum + (a.responseMinutes || 0), 0) / totalActions
      )
    : 0;

  const byType = {};
  completed.forEach((item) => {
    byType[item.actionType] = (byType[item.actionType] || 0) + 1;
  });

  return {
    totalActions,
    delayDaysAvoided,
    vacancySavings,
    avgResponseMinutes,
    byType,
  };
}

export default function OverviewTab({
  properties,
  kpis,
  selectedMarket,
  setSelectedMarket,
  setActiveTab,
  actionHistory = [],
}) {
  const blockedTurns = properties.filter((p) => p.turnStatus === "Blocked");
  const highRiskTurns = properties.filter((p) => p.risk >= 75);
  const readyTurns = properties.filter((p) => p.readiness >= 90);
  const ownerApprovalTurns = properties.filter((p) => p.currentStage === "Owner Approval");
  const pastDueTurns = properties.filter(
    (p) => new Date(p.projectedCompletion) < new Date("2026-05-07")
  );

  const avgRisk = Math.round(avg(properties.map((p) => p.risk)));
  const avgReadiness = Math.round(avg(properties.map((p) => p.readiness)));
  const avgConfidence = Math.round(avg(properties.map((p) => p.timelineConfidence || 0)));

  const actionRollup = getActionRollup(actionHistory);

  const marketSummary = Array.from(new Set(properties.map((p) => p.market)))
    .map((market) => {
      const rows = properties.filter((p) => p.market === market);
      return {
        market,
        turns: rows.length,
        blocked: rows.filter((r) => r.turnStatus === "Blocked").length,
        avgRisk: Math.round(avg(rows.map((r) => r.risk))),
        avgReadiness: Math.round(avg(rows.map((r) => r.readiness))),
        highRisk: rows.filter((r) => r.risk >= 75).length,
        watch: rows.filter((r) => r.risk >= 60 && r.risk < 75).length,
        healthy: rows.filter((r) => r.risk < 60).length,
      };
    })
    .sort((a, b) => b.avgRisk - a.avgRisk);

  const stageOrder = [
    "Pre-Leasing",
    "Pre-Move Out Inspection",
    "Move Out Inspection",
    "Scope Review",
    "Owner Approval",
    "Dispatch",
    "Pending RRI",
    "Rent Ready Open",
  ];

  const stageChart = stageOrder.map((stage) => {
    const rows = properties.filter((p) => p.currentStage === stage);
    return {
      stage,
      count: rows.length,
      avgDays: Number(avg(rows.map((r) => r.daysInStage || 0)).toFixed(1)),
      blocked: rows.filter((r) => r.turnStatus === "Blocked").length,
    };
  });

  const marketChart = marketSummary.map((market) => ({
    market: market.market,
    count: market.turns,
    avgRisk: market.avgRisk,
  }));

  const nextActions = [
    blockedTurns.length
      ? {
          title: "Resolve blocked turns",
          body: `${blockedTurns.length} blocked turn${blockedTurns.length > 1 ? "s are" : " is"} likely to drive ECD slippage.`,
          tab: "Dashboard",
          tone: "red",
        }
      : null,
    ownerApprovalTurns.length
      ? {
          title: "Work the approval backlog",
          body: `${ownerApprovalTurns.length} turn${ownerApprovalTurns.length > 1 ? "s are" : " is"} sitting in Owner Approval.`,
          tab: "Control Center",
          tone: "amber",
        }
      : null,
    readyTurns.length
      ? {
          title: "Fast-track ready turns",
          body: `${readyTurns.length} turn${readyTurns.length > 1 ? "s are" : " is"} high-readiness and could move quickly.`,
          tab: "Forecast",
          tone: "emerald",
        }
      : null,
    actionRollup.totalActions > 0
      ? {
          title: "Review action impact",
          body: `${actionRollup.totalActions} actions have already avoided ${actionRollup.delayDaysAvoided} delay days and saved $${actionRollup.vacancySavings}.`,
          tab: "Analytics",
          tone: "blue",
        }
      : null,
    {
      title: "Review vendor capacity",
      body: "Use the Vendors tab to rebalance market load and reduce dispatch friction.",
      tab: "Vendors",
      tone: "blue",
    },
  ].filter(Boolean);

  const tabCards = [
    {
      title: "Dashboard",
      desc: "Daily operating priorities, selected property command panel, blockers, simulation preview, and action center.",
      cta: "Open Dashboard",
    },
    {
      title: "Control Center",
      desc: "Manage active turns, stage pipeline, ECD edits, vendor assignments, and queue filters.",
      cta: "Open Control Center",
    },
    {
      title: "Forecast",
      desc: "See upcoming turns, predicted scope, vendor recommendations, delay exposure, and bundling opportunities.",
      cta: "Open Forecast",
    },
    {
      title: "Vendors",
      desc: "Compare vendor scorecards, market coverage, capacity risk, and sourcing insights.",
      cta: "Open Vendors",
    },
    {
      title: "Analytics",
      desc: "Understand bottlenecks, delay drivers, vendor performance, operator impact, and portfolio trends.",
      cta: "Open Analytics",
    },
  ];

  const maxStageCount = maxOrOne(stageChart.map((x) => x.count));
  const maxStageDays = maxOrOne(stageChart.map((x) => x.avgDays));
  const maxMarketCount = maxOrOne(marketChart.map((x) => x.count));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-slate-900">Overview</div>
        <div className="mt-1 text-sm text-slate-500">
          Executive summary of portfolio health, operating pressure, and quantified action impact.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Portfolio Summary</div>
            <div className="mt-1 text-sm text-slate-500">
              A concise readout of current turn performance, modeled risk, and operational intervention impact.
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Open Turns</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {kpis.allOpenTurns}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Blocked</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {kpis.blockedTurns}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg Risk</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{avgRisk}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg Readiness</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {avgReadiness}/100
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs uppercase tracking-wide text-blue-700">Actions Completed</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {actionRollup.totalActions}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-700">Delay Days Avoided</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {actionRollup.delayDaysAvoided}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs uppercase tracking-wide text-amber-700">Vacancy Savings</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  ${actionRollup.vacancySavings}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg Response</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {actionRollup.avgResponseMinutes}m
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">TurnIQ Summary</div>
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  TurnIQ is currently managing <strong>{kpis.allOpenTurns} open turns</strong> with{" "}
                  <strong>{kpis.blockedTurns} blocked</strong>,{" "}
                  <strong>{kpis.scopeReviewsPending} scope reviews pending</strong>, and{" "}
                  <strong>{kpis.ecdPastDue} past due</strong>. Portfolio readiness averages{" "}
                  <strong>{avgReadiness}/100</strong>, modeled confidence sits at{" "}
                  <strong>{avgConfidence}%</strong>, and completed operator actions have already
                  avoided <strong>{actionRollup.delayDaysAvoided} delay days</strong>.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">What is broken?</div>
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  The biggest current pressure points are{" "}
                  <strong>
                    {blockedTurns.length ? `${blockedTurns.length} blocked turns` : "no blocked turns"}
                  </strong>
                  ,{" "}
                  <strong>
                    {ownerApprovalTurns.length
                      ? `${ownerApprovalTurns.length} turn${ownerApprovalTurns.length > 1 ? "s" : ""} in Owner Approval`
                      : "no approval backlog"}
                  </strong>
                  , and{" "}
                  <strong>
                    {pastDueTurns.length
                      ? `${pastDueTurns.length} past-due ECD${pastDueTurns.length > 1 ? "s" : ""}`
                      : "no past-due ECDs"}
                  </strong>
                  . See{" "}
                  <button
                    onClick={() => setActiveTab("Dashboard")}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    Dashboard
                  </button>{" "}
                  for triage and{" "}
                  <button
                    onClick={() => setActiveTab("Control Center")}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    Control Center
                  </button>{" "}
                  for execution.
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Immediate Next Actions</div>
            <div className="mt-1 text-sm text-slate-500">
              Recommended operating moves based on current portfolio pressure.
            </div>

            <div className="mt-5 space-y-3">
              {nextActions.map((item, idx) => (
                <div
                  key={`${item.title}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    item.tone === "red"
                      ? "border-red-200 bg-red-50"
                      : item.tone === "amber"
                      ? "border-amber-200 bg-amber-50"
                      : item.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <Pill tone={item.tone}>{item.tab}</Pill>
                  </div>

                  <div className="mt-2 text-sm text-slate-700">{item.body}</div>

                  <button
                    onClick={() => setActiveTab(item.tab)}
                    className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  >
                    Open {item.tab}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Current Open Turns by Stage</div>
            <div className="mt-1 text-sm text-slate-500">
              Active turn distribution across the operating workflow.
            </div>

            <div className="mt-5 space-y-4">
              {stageChart.map((item) => (
                <div key={item.stage}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{item.stage}</div>
                    <div className="text-xs text-slate-500">
                      {item.count} turns • {item.blocked} blocked
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-blue-500"
                      style={{ width: `${(item.count / maxStageCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Current Open Turns by Market</div>
            <div className="mt-1 text-sm text-slate-500">
              Market-level turn concentration and risk pressure.
            </div>

            <div className="mt-5 space-y-4">
              {marketChart.map((item) => (
                <div key={item.market}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{item.market}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-500">{item.count} turns</div>
                      <Pill tone={getToneFromRisk(item.avgRisk)}>{item.avgRisk}</Pill>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${
                        item.avgRisk >= 75
                          ? "bg-red-500"
                          : item.avgRisk >= 60
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${(item.count / maxMarketCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Avg Days in Current Stage</div>
            <div className="mt-1 text-sm text-slate-500">
              Average stage aging by workflow step.
            </div>

            <div className="mt-5 space-y-4">
              {stageChart.map((item) => (
                <div key={`${item.stage}-days`}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{item.stage}</div>
                    <div className="text-xs text-slate-500">{item.avgDays} days</div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${
                        item.avgDays === maxStageDays ? "bg-amber-500" : "bg-slate-700"
                      }`}
                      style={{ width: `${(item.avgDays / maxStageDays) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Risk Mix by Market</div>
            <div className="mt-1 text-sm text-slate-500">
              How each market splits across high-risk, watch, and healthy turns.
            </div>

            <div className="mt-5 space-y-4">
              {marketSummary.map((market) => {
                const total = market.turns || 1;
                const highPct = (market.highRisk / total) * 100;
                const watchPct = (market.watch / total) * 100;
                const healthyPct = (market.healthy / total) * 100;

                return (
                  <div key={`${market.market}-riskmix`}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-800">{market.market}</div>
                      <div className="text-xs text-slate-500">
                        {market.highRisk} high • {market.watch} watch • {market.healthy} healthy
                      </div>
                    </div>

                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="bg-red-500" style={{ width: `${highPct}%` }} />
                      <div className="bg-amber-400" style={{ width: `${watchPct}%` }} />
                      <div className="bg-emerald-500" style={{ width: `${healthyPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Market Summary</div>
            <div className="mt-1 text-sm text-slate-500">
              Markets ranked by current average turn risk.
            </div>

            <div className="mt-5 space-y-3">
              {marketSummary.map((market) => (
                <button
                  key={market.market}
                  onClick={() =>
                    setSelectedMarket(selectedMarket === market.market ? "All Markets" : market.market)
                  }
                  className="block w-full text-left"
                >
                  <div
                    className={`rounded-2xl border p-4 transition hover:border-blue-300 ${
                      selectedMarket === market.market
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{market.market}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {market.turns} turns • {market.blocked} blocked
                        </div>
                      </div>
                      <Pill tone={getToneFromRisk(market.avgRisk)}>{market.avgRisk}</Pill>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                        Avg Readiness
                      </div>
                      <ProgressBar value={market.avgReadiness} tone="blue" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-6">
          <Card className="h-full">
            <div className="text-xl font-semibold text-slate-900">Portfolio Risk Mix</div>
            <div className="mt-1 text-sm text-slate-500">
              Distribution of active turns by current risk classification.
            </div>

            <div className="mt-5">
              <div className="flex h-5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-red-500"
                  style={{
                    width: `${
                      properties.length ? (highRiskTurns.length / properties.length) * 100 : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-amber-400"
                  style={{
                    width: `${
                      properties.length
                        ? ((properties.filter((p) => p.risk >= 60 && p.risk < 75).length /
                            properties.length) *
                            100)
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${
                      properties.length
                        ? ((properties.filter((p) => p.risk < 60).length / properties.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-red-700">High Risk</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {highRiskTurns.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Watch</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {properties.filter((p) => p.risk >= 60 && p.risk < 75).length}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">Healthy</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">
                    {properties.filter((p) => p.risk < 60).length}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Readiness Progress</div>
                <div className="mt-3">
                  <ProgressBar value={avgReadiness} tone="blue" />
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Portfolio readiness currently averages {avgReadiness}/100.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <div className="mb-4 text-xl font-semibold text-slate-900">Where to go next</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {tabCards.map((tab) => (
            <Card key={tab.title} className="h-full">
              <div className="text-lg font-semibold text-slate-900">{tab.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{tab.desc}</div>

              <button
                onClick={() => setActiveTab(tab.title)}
                className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-blue-300 hover:text-blue-700"
              >
                {tab.cta}
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}