"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

const STAGE_SLA = {
  "Pre-Leasing": 3,
  "Pre-Move Out Inspection": 3,
  "Move Out Inspection": 2,
  "Scope Review": 3,
  "Owner Approval": 3,
  Dispatch: 2,
  "Pending RRI": 2,
  "Rent Ready Open": 1,
};

const NEXT_ACTION_OPTIONS = [
  "Chase owner approval",
  "Confirm vendor schedule",
  "Resolve blocker",
  "Update resident move-out",
  "Confirm appliance ETA",
  "Escalate internally",
  "Prepare for dispatch",
  "Ready for execution",
];

const BLOCKER_OPTIONS = [
  "None",
  "Owner approval delay",
  "Appliance ETA pending",
  "Access issue",
  "Inspection fail likelihood",
  "Trade coordination risk",
  "Vendor unavailable",
  "HVAC dependency",
  "Scope ambiguity",
];

const SAVED_VIEWS = [
  "All Open Turns",
  "Blocked Turns",
  "At-Risk Turns",
  "Stale Turns",
  "Pending Approvals",
  "Vendorless Turns",
  "Over SLA",
];

function getStageTone(overdueCount, avgDays, sla) {
  if (overdueCount > 0) return "red";
  if (avgDays > sla) return "amber";
  return "emerald";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPrimaryBlocker(row) {
  const blockers = row.blockers || [];
  const live = blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
  return live[0] || "None";
}

function getNextAction(row) {
  if (row.nextAction) return row.nextAction;
  const blocker = getPrimaryBlocker(row).toLowerCase();

  if (row.currentStage === "Owner Approval") return "Chase owner approval";
  if (blocker.includes("appliance")) return "Confirm appliance ETA";
  if (blocker.includes("vendor")) return "Confirm vendor schedule";
  if (blocker.includes("access")) return "Resolve blocker";
  if (!row.vendor || row.vendor === "TBD") return "Confirm vendor schedule";
  if (row.turnStatus === "Blocked") return "Resolve blocker";
  return "Prepare for dispatch";
}

function getLastTouchedLabel(row) {
  if (row.followUpDate) return `Follow-up ${formatDate(row.followUpDate)}`;
  if ((row.daysInStage || 0) >= 6) return "No recent movement";
  return "Recently active";
}

function isStale(row) {
  return (row.daysInStage || 0) >= 6 && row.turnStatus !== "Ready";
}

function isOverSla(row) {
  const sla = STAGE_SLA[row.currentStage] || 3;
  return (row.daysInStage || 0) > sla;
}

function buildEnrichedRows(rows) {
  return rows.map((row) => {
    const blocker = getPrimaryBlocker(row);
    const nextAction = getNextAction(row);
    const sla = STAGE_SLA[row.currentStage] || 3;
    const overdue = (row.daysInStage || 0) > sla;

    return {
      ...row,
      blocker,
      nextAction,
      followUpDate: row.followUpDate || "",
      escalationFlag: row.escalationFlag || false,
      stale: isStale(row),
      overdue,
      stageSla: sla,
      systemLink:
        row.systemLink ||
        `https://pms.example/turns/${encodeURIComponent(row.id)}`,
    };
  });
}

function buildStageBuckets(rows) {
  const stages = [
    "Pre-Leasing",
    "Pre-Move Out Inspection",
    "Move Out Inspection",
    "Scope Review",
    "Owner Approval",
    "Dispatch",
    "Pending RRI",
    "Rent Ready Open",
  ];

  return stages.map((stage) => {
    const stageRows = rows.filter((row) => row.currentStage === stage);
    const count = stageRows.length;
    const avgDays = count
      ? Number(
          (
            stageRows.reduce((sum, row) => sum + (row.daysInStage || 0), 0) / count
          ).toFixed(1)
        )
      : 0;

    const overdueCount = stageRows.filter((row) => row.overdue).length;
    const blockedCount = stageRows.filter((row) => row.turnStatus === "Blocked").length;
    const sla = STAGE_SLA[stage] || 3;

    return {
      stage,
      count,
      avgDays,
      overdueCount,
      blockedCount,
      sla,
      tone: getStageTone(overdueCount, avgDays, sla),
    };
  });
}

function applySavedView(rows, queueFilter) {
  if (queueFilter === "Blocked Turns") {
    return rows.filter((row) => row.turnStatus === "Blocked");
  }

  if (queueFilter === "At-Risk Turns") {
    return rows.filter((row) => row.risk >= 75 || row.overdue);
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

  return rows;
}

function sortRows(rows, sortBy) {
  const sorted = [...rows];

  if (sortBy === "Risk") {
    sorted.sort((a, b) => b.risk - a.risk);
  } else if (sortBy === "Open Days") {
    sorted.sort((a, b) => b.openDays - a.openDays);
  } else if (sortBy === "ECD") {
    sorted.sort(
      (a, b) =>
        new Date(a.projectedCompletion).getTime() -
        new Date(b.projectedCompletion).getTime()
    );
  } else if (sortBy === "Stage") {
    sorted.sort((a, b) => a.currentStage.localeCompare(b.currentStage));
  } else if (sortBy === "Days in Stage") {
    sorted.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));
  }

  return sorted;
}

export default function ControlCenterTab({
  rows,
  queueFilter,
  setQueueFilter,
  resetQueueView,
  selectedStageFilter,
  toggleStageFilter,
  sortBy,
  setSortBy,
  operatorSummary,
  selectedPropertyId,
  setSelectedPropertyId,
  updateProperty,
}) {
  const [draftNotes, setDraftNotes] = useState({});

  const enrichedRows = useMemo(() => buildEnrichedRows(rows), [rows]);
  const stageBuckets = useMemo(() => buildStageBuckets(enrichedRows), [enrichedRows]);

  const workingRows = useMemo(() => {
    let next = applySavedView(enrichedRows, queueFilter);

    if (selectedStageFilter) {
      next = next.filter((row) => row.currentStage === selectedStageFilter);
    }

    return sortRows(next, sortBy);
  }, [enrichedRows, queueFilter, selectedStageFilter, sortBy]);

  const queueSummary = useMemo(() => {
    const blocked = workingRows.filter((row) => row.turnStatus === "Blocked").length;
    const overdue = workingRows.filter((row) => row.overdue).length;
    const stale = workingRows.filter((row) => row.stale).length;
    const escalated = workingRows.filter((row) => row.escalationFlag).length;

    return { blocked, overdue, stale, escalated };
  }, [workingRows]);

  function patchRow(id, patch) {
    updateProperty(id, patch);
  }

  function handleOwnerChange(id, value) {
    patchRow(id, { turnOwner: value });
  }

  function handleBlockerChange(id, value, row) {
    const blockers = value === "None" ? ["No active blockers"] : [value];
    patchRow(id, {
      blockers,
      turnStatus: value === "None" ? "Monitoring" : row.turnStatus,
    });
  }

  function handleNextActionChange(id, value) {
    patchRow(id, { nextAction: value });
  }

  function handleFollowUpChange(id, value) {
    patchRow(id, { followUpDate: value });
  }

  function handleEscalationToggle(id, current) {
    patchRow(id, { escalationFlag: !current });
  }

  function handleInlineNoteSave(id, row) {
    const note = (draftNotes[id] || "").trim();
    if (!note) return;

    const existingNotes = row.operationalNotes || [];
    patchRow(id, {
      operationalNotes: [...existingNotes, note],
    });

    setDraftNotes((prev) => ({ ...prev, [id]: "" }));
  }

  function handleResolve(id) {
    patchRow(id, {
      turnStatus: "Monitoring",
      blockers: ["No active blockers"],
      escalationFlag: false,
      nextAction: "Prepare for dispatch",
    });
  }

  function handleFlagReady(id) {
    patchRow(id, {
      turnStatus: "Ready",
      nextAction: "Ready for execution",
      escalationFlag: false,
    });
  }

  function handleOpenRow(id) {
    setSelectedPropertyId(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Control Center</div>
          <div className="mt-1 text-sm text-slate-500">
            Work the live turn pipeline directly from TurnIQ.
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Live
            </span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetQueueView}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset view
          </button>
          <button
            onClick={() => setQueueFilter("Blocked Turns")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Focus blocked
          </button>
          <button
            onClick={() => setQueueFilter("Over SLA")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Focus over SLA
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Working Queue</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{workingRows.length}</div>
          <div className="mt-1 text-sm text-slate-500">{queueFilter}</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Blocked</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{queueSummary.blocked}</div>
          <div className="mt-1 text-sm text-slate-500">Need direct intervention</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Over SLA</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{queueSummary.overdue}</div>
          <div className="mt-1 text-sm text-slate-500">Problem-child turns surfacing</div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500">Escalated</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {queueSummary.escalated}
          </div>
          <div className="mt-1 text-sm text-slate-500">Flagged for follow-up</div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Stage Buckets</div>
            <div className="mt-1 text-sm text-slate-500">
              Click a stage to isolate the queue and surface stale turns faster.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SAVED_VIEWS.map((view) => (
              <button
                key={view}
                onClick={() => setQueueFilter(view)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  queueFilter === view
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stageBuckets.map((bucket) => (
            <button
              key={bucket.stage}
              onClick={() => toggleStageFilter(bucket.stage)}
              className="text-left"
            >
              <div
                className={`rounded-2xl border p-4 transition ${
                  selectedStageFilter === bucket.stage
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{bucket.stage}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {bucket.count} turns • avg {bucket.avgDays}d
                    </div>
                  </div>
                  <Pill tone={bucket.tone}>{bucket.overdueCount} overdue</Pill>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  SLA {bucket.sla}d • {bucket.blockedCount} blocked
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-9">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">Live Working Queue</div>
                <div className="mt-1 text-sm text-slate-500">
                  Built to reduce dependency on Google Sheets and make TurnIQ the working surface.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm text-slate-500">Sort by</div>
                {["Risk", "Days in Stage", "Open Days", "ECD", "Stage"].map((option) => (
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
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1280px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Turn</th>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 font-medium">Days</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Blocker</th>
                    <th className="px-3 py-2 font-medium">Next Action</th>
                    <th className="px-3 py-2 font-medium">Follow-up</th>
                    <th className="px-3 py-2 font-medium">Escalation</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">PMS</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workingRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-slate-100 align-top leading-tight ${
                        row.id === selectedPropertyId ? "bg-slate-50" : ""
                      } ${row.overdue ? "bg-red-50/40" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <button onClick={() => handleOpenRow(row.id)} className="text-left">
                          <div className="font-medium text-blue-700 hover:underline">
                            {row.name}
                          </div>
                        </button>
                        <div className="mt-1 text-xs text-slate-500">
                          {row.market} • Risk {row.risk} • {row.turnStatus}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{row.currentStage}</div>
                        <div className="mt-1 text-xs text-slate-500">SLA {row.stageSla}d</div>
                      </td>

                      <td className="px-3 py-3">
                        <Pill tone={row.overdue ? "red" : "blue"}>
                          {row.daysInStage || 0}d
                        </Pill>
                        <div className="mt-1 text-xs">
                          {row.overdue ? (
                            <span className="font-medium text-red-600">
                              {row.daysInStage - row.stageSla}d over SLA
                            </span>
                          ) : (
                            <span className="text-slate-500">Within SLA</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <input
                          value={row.turnOwner || ""}
                          onChange={(e) => handleOwnerChange(row.id, e.target.value)}
                          className="w-[132px] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <select
                          value={row.blocker}
                          onChange={(e) => handleBlockerChange(row.id, e.target.value, row)}
                          className="w-[170px] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        >
                          {BLOCKER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <select
                            value={row.nextAction}
                            onChange={(e) => handleNextActionChange(row.id, e.target.value)}
                            className="w-[172px] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          >
                            {NEXT_ACTION_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          {(row.overdue || row.turnStatus === "Blocked") && (
                            <div className="text-xs font-medium text-red-600">
                              Action required
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="date"
                          value={row.followUpDate || ""}
                          onChange={(e) => handleFollowUpChange(row.id, e.target.value)}
                          className="w-[132px] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        />
                        <div className="mt-1 text-xs text-slate-500">
                          {getLastTouchedLabel(row)}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleEscalationToggle(row.id, row.escalationFlag)}
                          className={`rounded-lg px-3 py-2 text-xs font-medium ${
                            row.escalationFlag
                              ? "bg-red-100 text-red-700"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {row.escalationFlag ? "Flagged" : "Flag"}
                        </button>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex w-[200px] gap-2">
                          <input
                            value={draftNotes[row.id] || ""}
                            onChange={(e) =>
                              setDraftNotes((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                            placeholder="Add note"
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          />
                          <button
                            onClick={() => handleInlineNoteSave(row.id, row)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            Save
                          </button>
                        </div>
                        {row.operationalNotes?.length ? (
                          <div className="mt-2 text-xs text-slate-500">
                            Latest: {row.operationalNotes[row.operationalNotes.length - 1]}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <a
                          href={row.systemLink}
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
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleFlagReady(row.id)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          >
                            Mark ready
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!workingRows.length ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-10 text-center text-sm text-slate-500">
                        No turns match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <Card>
            <div className="text-xl font-semibold text-slate-900">Queue Summary</div>
            <div className="mt-1 text-sm text-slate-500">
              The highest-friction issues standing out right now
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="text-xs uppercase tracking-wide text-red-700">
                  Problem Child Turns
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {workingRows.filter((row) => row.overdue || row.turnStatus === "Blocked").length}
                </div>
                <div className="mt-1 text-xs text-red-700">Over SLA or blocked</div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs uppercase tracking-wide text-amber-700">Stale Turns</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {queueSummary.stale}
                </div>
                <div className="mt-1 text-xs text-amber-700">No recent movement</div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs uppercase tracking-wide text-blue-700">
                  Pending Approvals
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {workingRows.filter((row) => row.currentStage === "Owner Approval").length}
                </div>
                <div className="mt-1 text-xs text-blue-700">Waiting for owner action</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-xl font-semibold text-slate-900">Team Load</div>
            <div className="mt-1 text-sm text-slate-500">
              Active turns and high-risk concentration by operator
            </div>

            <div className="mt-4 space-y-3">
              {operatorSummary.map((item) => (
                <div key={item.owner} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{item.owner}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {item.activeTurns} active turns
                      </div>
                    </div>
                    <Pill tone={item.highRisk > 0 ? "red" : "emerald"}>
                      {item.highRisk} high risk
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}