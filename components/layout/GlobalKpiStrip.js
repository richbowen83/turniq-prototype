"use client";

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
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
        <button onClick={onOpenTurnsClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Open Turns
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.allOpenTurns}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onBlockedTurnsClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Blocked Turns
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.blockedTurns}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onScopeReviewsClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Scope Reviews Pending
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.scopeReviewsPending}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onOwnerApprovalClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Owner Approval
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.ownerApprovalPending}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onHighRiskClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            High Risk
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.highRisk}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <div className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Avg Turn Time
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.avgTurnTime}
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onPastDueClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            ECD Past Due
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.ecdPastDue}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onEcdThisWeekClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            ECD This Week
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.ecdThisWeek}
          </div>
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <button onClick={onRriFailRateClick} className="text-left">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            RRI Fail Rate
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {kpis.rriFailRate}
          </div>
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
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