"use client";

export default function GlobalKpiStrip({
  kpis,
  onOpenTurnsClick,
  onBlockedTurnsClick,
  onScopeApprovalClick,
  onHighRiskClick,
  onPastDueClick,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-x-8 whitespace-nowrap text-sm">
          <button onClick={onOpenTurnsClick} className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Open Turns
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.allOpenTurns}
            </div>
          </button>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <button onClick={onBlockedTurnsClick} className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Blocked Turns
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.blockedTurns}
            </div>
          </button>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <button onClick={onScopeApprovalClick} className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Scope Approval
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.scopeApprovalBacklog}
            </div>
          </button>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <button onClick={onHighRiskClick} className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              High Risk
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.highRisk}
            </div>
          </button>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Avg Turn Time
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.avgTurnTime}
            </div>
          </div>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <button onClick={onPastDueClick} className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              ECD Past Due
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.ecdPastDue}
            </div>
          </button>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              ECD This Week
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.ecdThisWeek}
            </div>
          </div>

          <div className="h-8 w-px shrink-0 bg-slate-200" />

          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              RRI Pass Rate
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {kpis.rriPassRate}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
        {kpis.blockedTurns > 0 && (
          <button
            onClick={onBlockedTurnsClick}
            className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
          >
            {kpis.blockedTurns} blocked
          </button>
        )}

        {kpis.scopeApprovalBacklog > 0 && (
          <button
            onClick={onScopeApprovalClick}
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
          >
            {kpis.scopeApprovalBacklog} approvals
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
  );
}