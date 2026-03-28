"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate } from "../../utils/economics";

export default function TurnDetailDrawer({
  row,
  onClose,
  onResolve,
  onMarkReady,
  onApplyAction,
}) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-[520px] bg-white shadow-xl p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-900">
              {row.name}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {row.market}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
          <Pill tone="slate">{row.currentStage}</Pill>
          <Pill tone={row.turnStatus === "Blocked" ? "red" : "green"}>
            {row.turnStatus}
          </Pill>
        </div>

        {/* Execution Summary */}
        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">
            Execution Summary
          </div>

          <div className="mt-3 text-sm text-slate-700">
            {row.priority.whyNow}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs text-slate-500">Next Action</div>
              <div className="text-sm font-medium">{row.nextAction}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Blocker</div>
              <div className="text-sm font-medium">{row.blocker}</div>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Timeline</div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Days in Stage</div>
              <div className="font-medium">{row.daysInStage}d</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">SLA</div>
              <div className="font-medium">{row.stageSla}d</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Projected Completion</div>
              <div className="font-medium">
                {formatShortDate(row.projectedCompletion)}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Impact */}
        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">
            Financial Impact
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Daily Rent</div>
              <div className="font-medium">
                ${row.impact.dailyRentValue}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Days Recoverable</div>
              <div className="font-medium">
                {row.impact.daysRecovered}d
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Revenue Protected</div>
              <div className="font-medium">
                ${row.impact.revenueRecovered}
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onResolve(row.id)}
            className="flex-1 rounded-md bg-slate-900 text-white px-3 py-2 text-sm"
          >
            Resolve
          </button>

          <button
            onClick={() => onMarkReady(row.id)}
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            Mark Ready
          </button>
        </div>

        <button
          onClick={() => onApplyAction(row)}
          className="mt-2 w-full rounded-md bg-blue-600 text-white px-3 py-2 text-sm"
        >
          Apply Top Action
        </button>
      </div>
    </div>
  );
}