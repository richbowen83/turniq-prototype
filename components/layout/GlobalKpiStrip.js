"use client";

function KpiButton({ label, value, onClick, clickable = true }) {
  const content = (
    <div className="min-w-[132px] text-left">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );

  if (!clickable || !onClick) {
    return <div>{content}</div>;
  }

  return (
    <button
      onClick={onClick}
      className="rounded-xl px-2 py-1 text-left transition hover:bg-slate-50"
    >
      {content}
    </button>
  );
}

function Divider() {
  return <div className="h-10 w-px shrink-0 bg-slate-200" />;
}

export default function GlobalKpiStrip({
  kpis,
  onOpenTurnsClick,
  onBlockedTurnsClick,
  onScopeReviewsClick,
  onOwnerApprovalClick,
  onHighRiskClick,
  onPastDueClick,
  onEcdThisWeekClick,
  onRriFailRateClick,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 text-xs font-medium text-slate-500">Portfolio Overview</div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-4 pb-1">
          <KpiButton
            label="Open Turns"
            value={kpis.allOpenTurns}
            onClick={onOpenTurnsClick}
          />

          <Divider />

          <KpiButton
            label="Blocked Turns"
            value={kpis.blockedTurns}
            onClick={onBlockedTurnsClick}
          />

          <Divider />

          <KpiButton
            label="Scope Reviews Pending"
            value={kpis.scopeReviewsPending}
            onClick={onScopeReviewsClick}
          />

          <Divider />

          <KpiButton
            label="Owner Approval"
            value={kpis.ownerApprovalPending}
            onClick={onOwnerApprovalClick}
          />

          <Divider />

          <KpiButton
            label="High Risk"
            value={kpis.highRisk}
            onClick={onHighRiskClick}
          />

          <Divider />

          <KpiButton
            label="Avg Turn Time"
            value={kpis.avgTurnTime}
            clickable={false}
          />

          <Divider />

          <KpiButton
            label="ECD Past Due"
            value={kpis.ecdPastDue}
            onClick={onPastDueClick}
          />

          <Divider />

          <KpiButton
            label="ECD This Week"
            value={kpis.ecdThisWeek}
            onClick={onEcdThisWeekClick}
          />

          <Divider />

          <KpiButton
            label="RRI Fail Rate"
            value={kpis.rriFailRate}
            onClick={onRriFailRateClick}
          />
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {kpis.blockedTurns > 0 && (
            <button
              onClick={onBlockedTurnsClick}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
            >
              {kpis.blockedTurns} blocked
            </button>
          )}

          {kpis.scopeReviewsPending > 0 && (
            <button
              onClick={onScopeReviewsClick}
              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {kpis.scopeReviewsPending} scope reviews
            </button>
          )}

          {kpis.ownerApprovalPending > 0 && (
            <button
              onClick={onOwnerApprovalClick}
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
            >
              {kpis.ownerApprovalPending} owner approvals
            </button>
          )}

          {kpis.ecdPastDue > 0 && (
            <button
              onClick={onPastDueClick}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
            >
              {kpis.ecdPastDue} past due
            </button>
          )}

          {kpis.highRisk > 0 && (
            <button
              onClick={onHighRiskClick}
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
            >
              {kpis.highRisk} high risk
            </button>
          )}
        </div>
      </div>
    </div>
  );
}