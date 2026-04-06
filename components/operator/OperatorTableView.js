"use client";

import { useMemo } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import TurnDetailDrawer from "../control-center/TurnDetailDrawer";
import {
  formatShortDate,
  getDailyRentValue,
  getRentSourceLabel,
  getRevenueProtected,
  shiftDate,
} from "../../utils/economics";

function getStageSla(stage) {
  const map = {
    "Pre-Leasing": 3,
    "Pre-Move Out Inspection": 3,
    "Move Out Inspection": 2,
    "Scope Review": 3,
    "Owner Approval": 3,
    Dispatch: 2,
    "Pending RRI": 2,
    "Rent Ready Open": 1,
    "Failed Rent Ready": 0,
  };

  return map[stage] || 3;
}

function getPrimaryBlocker(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  const live = blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
  return live[0] || "None";
}

function getDaysOverSla(row) {
  return Math.max(0, (row.daysInStage || 0) - getStageSla(row.currentStage));
}

function isOverSla(row) {
  const sla = getStageSla(row.currentStage);
  return sla > 0 && (row.daysInStage || 0) > sla;
}

function isStale(row) {
  return (row.daysInStage || 0) >= 6 && row.turnStatus !== "Ready";
}

function buildPriority(row) {
  let score = 0;
  const reasons = [];

  if (row.currentStage === "Failed Rent Ready") {
    score += 30;
    reasons.push("Failed rent ready");
  }

  if (row.turnStatus === "Blocked") {
    score += 40;
    reasons.push("Blocked");
  }

  const daysOver = getDaysOverSla(row);
  if (daysOver > 0) {
    score += Math.min(25, daysOver * 5);
    reasons.push(`${daysOver}d over SLA`);
  }

  if ((row.risk || 0) >= 85) {
    score += 20;
    reasons.push("Very high risk");
  } else if ((row.risk || 0) >= 75) {
    score += 14;
    reasons.push("High risk");
  } else if ((row.risk || 0) >= 60) {
    score += 8;
    reasons.push("Elevated risk");
  }

  if (row.currentStage === "Owner Approval") {
    score += 12;
    reasons.push("Pending approval");
  }

  if (isStale(row)) {
    score += 10;
    reasons.push("Stale");
  }

  if (!row.vendor || row.vendor === "TBD") {
    score += 8;
    reasons.push("No vendor");
  }

  const blocker = getPrimaryBlocker(row);
  if (blocker !== "None") {
    score += 6;
    reasons.push(blocker);
  }

  let label = "Low";
  let tone = "green";

  if (score >= 60) {
    label = "Critical";
    tone = "red";
  } else if (score >= 35) {
    label = "High";
    tone = "amber";
  } else if (score >= 18) {
    label = "Medium";
    tone = "slate";
  }

  return {
    score,
    label,
    tone,
    whyNow: reasons.slice(0, 4).join(" + ") || "Routine monitoring",
  };
}

function buildImpact(row) {
  let daysRecovered = 0;

  if (row.currentStage === "Failed Rent Ready") {
    daysRecovered += 3;
  }

  const daysOver = getDaysOverSla(row);

  if (row.turnStatus === "Blocked") {
    daysRecovered += 2;
  }

  if (row.currentStage === "Owner Approval") {
    daysRecovered += 2;
  }

  if (daysOver > 0) {
    daysRecovered += Math.min(4, daysOver);
  }

  if (isStale(row)) {
    daysRecovered += 1;
  }

  const dailyRentValue = getDailyRentValue(row);
  const revenueRecovered = getRevenueProtected(daysRecovered, row);

  return {
    daysRecovered,
    dailyRentValue,
    revenueRecovered,
    rentSourceLabel: getRentSourceLabel(row),
  };
}

function buildWorkingRows(rows) {
  return rows.map((row) => {
    const priority = buildPriority(row);
    const impact = buildImpact(row);

    return {
      ...row,
      blocker: getPrimaryBlocker(row),
      stageSla: getStageSla(row.currentStage),
      overdue: isOverSla(row),
      stale: isStale(row),
      priority,
      impact,
      dailyRentValue: getDailyRentValue(row),
      rentSourceLabel: getRentSourceLabel(row),
    };
  });
}

function sortRows(rows, sortBy) {
  const sorted = [...rows];

  if (sortBy === "Priority") {
    sorted.sort((a, b) => b.priority.score - a.priority.score);
  } else if (sortBy === "Risk") {
    sorted.sort((a, b) => (b.risk || 0) - (a.risk || 0));
  } else if (sortBy === "Open Days") {
    sorted.sort((a, b) => (b.openDays || 0) - (a.openDays || 0));
  } else if (sortBy === "ECD") {
    sorted.sort(
      (a, b) =>
        new Date(a.projectedCompletion).getTime() -
        new Date(b.projectedCompletion).getTime()
    );
  } else if (sortBy === "Stage") {
    sorted.sort((a, b) => String(a.currentStage).localeCompare(String(b.currentStage)));
  } else if (sortBy === "Days in Stage") {
    sorted.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));
  }

  return sorted;
}

function applyFilter(rows, queueFilter) {
  if (queueFilter === "Blocked Turns") {
    return rows.filter((row) => row.turnStatus === "Blocked");
  }

  if (queueFilter === "At-Risk Turns") {
    return rows.filter((row) => (row.risk || 0) >= 75 || row.overdue);
  }

  if (queueFilter === "Stale Turns") {
    return rows.filter((row) => row.stale);
  }

  if (queueFilter === "Pending Approvals") {
    return rows.filter((row) => row.currentStage === "Owner Approval");
  }

  if (queueFilter === "Vendorless Turns") {
    return rows.filter((row) => !row.vendor || row.vendor === "TBD");
  }

  if (queueFilter === "Over SLA") {
    return rows.filter((row) => row.overdue);
  }

  if (queueFilter === "Critical Priority") {
    return rows.filter((row) => row.priority.label === "Critical");
  }

  if (queueFilter === "Failed Rent Ready") {
    return rows.filter((row) => row.currentStage === "Failed Rent Ready");
  }

  return rows;
}

function getPipelineStep(row) {
  if (row.currentStage === "Failed Rent Ready") {
    return {
      label: "Step 1 of 3",
      action: "Clear rework items",
      next: "Re-inspect home",
    };
  }

  if (row.turnStatus === "Blocked") {
    return {
      label: "Step 2 of 3",
      action: "Remove blocker",
      next: "Resume execution",
    };
  }

  return {
    label: "Step 3 of 3",
    action: row.nextAction || "Ready for execution",
    next: "Advance to next stage",
  };
}

export default function OperatorTableView({
  rows,
  queueFilter,
  setQueueFilter,
  resetQueueView,
  selectedStageFilter,
  toggleStageFilter,
  sortBy,
  setSortBy,
  selectedPropertyId,
  setSelectedPropertyId,
  updateProperty,
  applyForecastPatch,
}) {
  const enrichedRows = useMemo(() => buildWorkingRows(rows), [rows]);

  const workingRows = useMemo(() => {
    let next = applyFilter(enrichedRows, queueFilter);

    if (selectedStageFilter) {
      next = next.filter((row) => row.currentStage === selectedStageFilter);
    }

    return sortRows(next, sortBy);
  }, [enrichedRows, queueFilter, selectedStageFilter, sortBy]);

  const selectedRow = useMemo(
    () => enrichedRows.find((row) => row.id === selectedPropertyId) || null,
    [enrichedRows, selectedPropertyId]
  );

  function patchRow(id, patch) {
    updateProperty(id, patch);
  }

  function handleResolve(id) {
    const row = enrichedRows.find((r) => r.id === id);
    if (!row) return;

    const targetDays = Math.min(1, row.stageSla);
    const daysSaved = Math.max(0, (row.daysInStage || 0) - targetDays);
    const nextProjectedCompletion =
      daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

    patchRow(id, {
      turnStatus: "Monitoring",
      blockers: ["No active blockers"],
      nextAction: "Prepare for dispatch",
      daysInStage: targetDays,
      projectedCompletion: nextProjectedCompletion,
    });

    if (applyForecastPatch) {
      applyForecastPatch(
        id,
        {
          daysInStage: targetDays,
          projectedCompletion: nextProjectedCompletion,
          risk: Math.max(35, (row.risk || 0) - 10),
          timelineConfidence: Math.min(99, (row.timelineConfidence || 80) + 4),
        },
        "Resolve issue from operator mode"
      );
    }
  }

  function handleMarkReady(id) {
    const row = enrichedRows.find((r) => r.id === id);
    if (!row) return;

    const daysSaved = row.daysInStage || 0;
    const nextProjectedCompletion =
      daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

    patchRow(id, {
      turnStatus: "Ready",
      nextAction: "Ready for execution",
      daysInStage: 0,
      projectedCompletion: nextProjectedCompletion,
    });

    if (applyForecastPatch) {
      applyForecastPatch(
        id,
        {
          daysInStage: 0,
          projectedCompletion: nextProjectedCompletion,
          risk: Math.max(25, (row.risk || 0) - 12),
          timelineConfidence: Math.min(99, (row.timelineConfidence || 80) + 6),
        },
        "Mark ready from operator mode"
      );
    }
  }

  function handleApplyTopAction(row) {
    if (row.turnStatus === "Blocked") {
      handleResolve(row.id);
      return;
    }

    if (row.currentStage === "Failed Rent Ready") {
      const daysSaved = Math.max(0, (row.daysInStage || 0) - 1);
      const nextProjectedCompletion =
        daysSaved > 0 ? shiftDate(row.projectedCompletion, -daysSaved) : row.projectedCompletion;

      patchRow(row.id, {
        currentStage: "Rent Ready Open",
        daysInStage: 1,
        turnStatus: "Monitoring",
        nextAction: "Re-inspect and confirm ready state",
        blockers: ["No active blockers"],
        projectedCompletion: nextProjectedCompletion,
      });

      return;
    }

    patchRow(row.id, {
      nextAction: "Prepare for dispatch",
      turnStatus: "Monitoring",
    });
  }

  function handleApplySimulatedPlan({ row, simulation }) {
    if (!row || !simulation || simulation.daysRecovered <= 0) return;

    patchRow(row.id, {
      projectedCompletion: simulation.simulatedCompletion,
      daysInStage: Math.max(0, (row.daysInStage || 0) - simulation.daysRecovered),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Operator Table View</div>
            <div className="mt-1 text-sm text-slate-500">
              Spreadsheet-style execution surface with drawer detail.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resetQueueView}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset view
            </button>
            <button
              onClick={() => setQueueFilter("Blocked Turns")}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Focus blocked
            </button>
            <button
              onClick={() => setQueueFilter("Over SLA")}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Focus over SLA
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="text-sm text-slate-500">Sort by</div>
          {["Priority", "Risk", "Days in Stage", "Open Days", "ECD", "Stage"].map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`rounded-xl px-3 py-2 text-sm ${
                sortBy === option
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Turn</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Step</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Blocker</th>
                <th className="px-3 py-2 font-medium">PMS</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workingRows.map((row) => {
                const pipelineStep = getPipelineStep(row);

                return (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-100 align-top leading-tight ${
                      row.id === selectedPropertyId ? "bg-slate-50" : ""
                    } ${row.priority.label === "Critical" ? "bg-red-50/30" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setSelectedPropertyId(row.id)}
                        className="text-left"
                      >
                        <div className="font-medium text-blue-700 hover:underline">{row.name}</div>
                      </button>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.market} • {row.turnStatus}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">{row.priority.whyNow}</div>
                      <div className="mt-2 text-xs text-slate-400">
                        {row.rentSourceLabel} • ${row.dailyRentValue}/day
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
                      <div className="mt-1 text-xs text-slate-500">Score {row.priority.score}</div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{row.currentStage}</div>
                      <div className="mt-1 text-xs text-slate-500">SLA {row.stageSla}d</div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="text-xs text-slate-500">{pipelineStep.label}</div>
                      <div className="mt-2 inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900">
                        {pipelineStep.action}
                      </div>
                      <div className="mt-3 text-xs text-slate-400">Next: {pipelineStep.next}</div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="w-[132px] rounded-lg border border-slate-200 px-2 py-2 text-sm">
                        {row.turnOwner || "Unassigned"}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="w-[170px] rounded-lg border border-slate-200 px-2 py-2 text-sm">
                        {row.blocker}
                      </div>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <a
                        href={row.systemLink || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        Open →
                      </a>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex w-[128px] flex-col gap-2">
                        <button
                          onClick={() => handleResolve(row.id)}
                          className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleMarkReady(row.id)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Mark ready
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!workingRows.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">
                    No turns match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedRow ? (
        <TurnDetailDrawer
          row={selectedRow}
          onClose={() => setSelectedPropertyId(null)}
          onResolve={handleResolve}
          onMarkReady={handleMarkReady}
          onApplyAction={handleApplyTopAction}
          onApplySimulatedPlan={handleApplySimulatedPlan}
        />
      ) : null}
    </div>
  );
}