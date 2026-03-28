"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate, shiftDate } from "../../utils/economics";

function getSimulatorOptions(row) {
  return [
    {
      id: "clear_blocker",
      label: "Clear blocker",
      enabled: row.turnStatus === "Blocked" || row.blocker !== "None",
      days: row.turnStatus === "Blocked" || row.blocker !== "None" ? 2 : 0,
    },
    {
      id: "accelerate_approval",
      label: "Accelerate approval",
      enabled: row.currentStage === "Owner Approval",
      days: row.currentStage === "Owner Approval" ? 2 : 0,
    },
    {
      id: "resequence_vendors",
      label: "Re-sequence vendors",
      enabled: (row.daysInStage || 0) > (row.stageSla || 0),
      days:
        (row.daysInStage || 0) > (row.stageSla || 0)
          ? Math.min(2, Math.max(1, (row.daysInStage || 0) - (row.stageSla || 0)))
          : 0,
    },
    {
      id: "recover_failed_ready",
      label: "Recover failed rent ready",
      enabled: row.currentStage === "Failed Rent Ready",
      days: row.currentStage === "Failed Rent Ready" ? 3 : 0,
    },
  ];
}

function buildSimulation(row, selectedOptions) {
  const simulatorOptions = getSimulatorOptions(row);

  const rawDaysRecovered = simulatorOptions
    .filter((option) => selectedOptions.includes(option.id) && option.enabled)
    .reduce((sum, option) => sum + option.days, 0);

  const cappedDaysRecovered = Math.min(
    Math.max(0, rawDaysRecovered),
    Math.max(0, row.impact?.daysRecovered || 0) + 2
  );

  const simulatedCompletion =
    cappedDaysRecovered > 0
      ? shiftDate(row.projectedCompletion, -cappedDaysRecovered)
      : row.projectedCompletion;

  const simulatedRevenueProtected =
    cappedDaysRecovered > 0
      ? cappedDaysRecovered * (row.impact?.dailyRentValue || 0)
      : 0;

  return {
    daysRecovered: cappedDaysRecovered,
    simulatedCompletion,
    revenueProtected: Math.round(simulatedRevenueProtected),
  };
}

export default function TurnDetailDrawer({
  row,
  onClose,
  onResolve,
  onMarkReady,
  onApplyAction,
}) {
  const [selectedOptions, setSelectedOptions] = useState([]);

  const simulation = useMemo(() => {
    if (!row) {
      return {
        daysRecovered: 0,
        simulatedCompletion: null,
        revenueProtected: 0,
      };
    }

    return buildSimulation(row, selectedOptions);
  }, [row, selectedOptions]);

  const simulatorOptions = useMemo(() => {
    if (!row) return [];
    return getSimulatorOptions(row);
  }, [row]);

  if (!row) return null;

  function toggleOption(optionId) {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }

  function applySimulatedPlan() {
    onApplyAction(row);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-[560px] overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-900">{row.name}</div>
            <div className="mt-1 text-sm text-slate-500">{row.market}</div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
          <Pill tone="slate">{row.currentStage}</Pill>
          <Pill tone={row.turnStatus === "Blocked" ? "red" : "green"}>
            {row.turnStatus}
          </Pill>
        </div>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Execution Summary</div>

          <div className="mt-3 text-sm text-slate-700">{row.priority.whyNow}</div>

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
              <div className="font-medium">{formatShortDate(row.projectedCompletion)}</div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Financial Impact</div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Daily Rent</div>
              <div className="font-medium">${row.impact.dailyRentValue}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Days Recoverable</div>
              <div className="font-medium">{row.impact.daysRecovered}d</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Revenue Protected</div>
              <div className="font-medium">${row.impact.revenueRecovered}</div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Delay Simulator</div>
              <div className="mt-1 text-xs text-slate-500">
                Test likely recovery actions before applying the plan.
              </div>
            </div>
            <Pill tone="blue">Scenario</Pill>
          </div>

          <div className="mt-4 space-y-3">
            {simulatorOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm ${
                  option.enabled
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.id)}
                    disabled={!option.enabled}
                    onChange={() => toggleOption(option.id)}
                  />
                  <span>{option.label}</span>
                </div>

                <div className="text-xs font-medium">
                  {option.enabled ? `+${option.days}d` : "N/A"}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Current ECD</div>
              <div className="mt-1 font-medium">
                {formatShortDate(row.projectedCompletion)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Simulated ECD</div>
              <div className="mt-1 font-medium">
                {formatShortDate(simulation.simulatedCompletion)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Simulated Days Recovered</div>
              <div className="mt-1 font-medium">{simulation.daysRecovered}d</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Simulated Revenue Protected</div>
              <div className="mt-1 font-medium">
                ${simulation.revenueProtected.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={applySimulatedPlan}
            disabled={simulation.daysRecovered <= 0}
            className={`mt-4 w-full rounded-md px-3 py-2 text-sm font-medium ${
              simulation.daysRecovered > 0
                ? "bg-blue-600 text-white"
                : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            Apply Simulated Plan
          </button>
        </Card>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onResolve(row.id)}
            className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
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
          className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
        >
          Apply Top Action
        </button>
      </div>
    </div>
  );
}