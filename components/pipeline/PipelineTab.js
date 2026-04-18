"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import TurnDetailDrawer from "../control-center/TurnDetailDrawer";
import {
  getDailyRentValue,
  getRentSourceLabel,
  shiftDate,
} from "../../utils/economics";
import PipelineFilters from "./PipelineFilters";
import PipelineTable from "./PipelineTable";

function getMoveOutDate(row) {
  return row.moveOutDate || row.leaseEnd || null;
}

function getPrimaryBlocker(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  const live = blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
  return row.blocker || live[0] || "None";
}

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

function isUpcoming(row) {
  if (row.currentStage === "Failed Rent Ready") return false;
  if (row.turnStatus === "Ready") return false;

  const rawDate = getMoveOutDate(row);
  if (!rawDate) return false;

  const now = new Date();
  const target = new Date(rawDate);
  if (Number.isNaN(target.getTime())) return false;

  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 21;
}

function getDaysUntil(dateValue) {
  if (!dateValue) return null;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return null;
  return Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function suggestVendor(row) {
  if (row.market === "Phoenix") return "Desert Turn Co";
  if (row.market === "Dallas") return "Lone Star Repairs";
  if (row.market === "Atlanta") return "Peach State Services";
  if (row.market === "Nashville") return "Music City Maintenance";
  return "Preferred Vendor";
}

function enrichPipelineRow(row) {
  const blocker = getPrimaryBlocker(row);
  const moveOutDate = getMoveOutDate(row);
  const upcoming = isUpcoming(row);
  const stageSla = getStageSla(row.currentStage);
  const daysInStage = row.daysInStage || 0;
  const overdue = stageSla > 0 && daysInStage > stageSla;

  return {
    ...row,
    blocker,
    moveOutDate,
    upcoming,
    stageSla,
    overdue,
    daysToMoveOut: getDaysUntil(moveOutDate),
    daysToEcd: getDaysUntil(row.projectedCompletion),
    dailyRentValue: getDailyRentValue(row),
    rentSourceLabel: getRentSourceLabel(row),
    assignedVendor: row.vendor && row.vendor !== "TBD" ? row.vendor : "",
    suggestedVendor: suggestVendor(row),
    nextAction:
      row.nextAction ||
      (upcoming && (!row.vendor || row.vendor === "TBD")
        ? "Pre-assign vendor"
        : row.turnStatus === "Blocked"
        ? "Resolve blocker"
        : row.currentStage === "Owner Approval"
        ? "Chase owner approval"
        : row.currentStage === "Failed Rent Ready"
        ? "Recover failed rent ready"
        : "Prepare for dispatch"),
  };
}

function PlanningRiskCard({ label, value, subtext, tone = "slate" }) {
  const toneClasses = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    green: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        toneClasses[tone] || toneClasses.slate
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {subtext ? (
        <div className="mt-1 text-sm text-slate-500">{subtext}</div>
      ) : null}
    </div>
  );
}

export default function PipelineTab({
  rows,
  selectedPropertyId,
  setSelectedPropertyId,
  updateProperty,
}) {
  const [drawerRowId, setDrawerRowId] = useState(null);

  const pipelineRows = useMemo(() => rows.map(enrichPipelineRow), [rows]);

  const upcomingRows = useMemo(
    () => pipelineRows.filter((row) => row.upcoming),
    [pipelineRows]
  );

  const activeRows = useMemo(
    () => pipelineRows.filter((row) => !row.upcoming),
    [pipelineRows]
  );

  const drawerRow = useMemo(
    () => pipelineRows.find((row) => row.id === drawerRowId) || null,
    [pipelineRows, drawerRowId]
  );

  const planningRisks = useMemo(() => {
    const upcomingUnassigned = upcomingRows.filter(
      (row) => !row.vendor || row.vendor === "TBD"
    ).length;

    const blockedUpcoming = upcomingRows.filter(
      (row) => row.turnStatus === "Blocked"
    ).length;

    const approvalUpcoming = upcomingRows.filter(
      (row) => row.currentStage === "Owner Approval"
    ).length;

    const dueSoonUpcoming = upcomingRows.filter(
      (row) => row.daysToMoveOut != null && row.daysToMoveOut <= 7
    ).length;

    const upcomingCoverage = upcomingRows.length
      ? Math.round(
          ((upcomingRows.length - upcomingUnassigned) / upcomingRows.length) * 100
        )
      : 100;

    return {
      upcomingUnassigned,
      blockedUpcoming,
      approvalUpcoming,
      dueSoonUpcoming,
      upcomingCoverage,
    };
  }, [upcomingRows]);

  function patchRow(id, patch) {
    updateProperty?.(id, patch);
  }

  function openRow(row) {
    setSelectedPropertyId(row.id);
    setDrawerRowId(row.id);
  }

  function handlePreAssignVendor(row) {
    patchRow(row.id, {
      vendor: row.assignedVendor || row.suggestedVendor,
      nextAction: "Confirm vendor schedule",
    });
  }

  function moveToUpcoming(id) {
    patchRow(id, {
      moveOutDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      turnStatus: "Monitoring",
    });
  }

  function moveOutOfUpcoming(id) {
    patchRow(id, {
      moveOutDate: new Date(Date.now() + 40 * 86400000).toISOString(),
    });
  }

  function handleResolve(id) {
    const row = pipelineRows.find((r) => r.id === id);
    if (!row) return;

    patchRow(id, {
      turnStatus: "Monitoring",
      blocker: "None",
      blockers: ["No active blockers"],
      nextAction: row.upcoming ? "Pre-assign vendor" : "Prepare for dispatch",
      daysInStage: Math.min(1, row.stageSla || 1),
    });
  }

  function handleMarkReady(id) {
    patchRow(id, {
      turnStatus: "Ready",
      daysInStage: 0,
      nextAction: "Ready for execution",
      rriStatus: "Passed",
    });
  }

  function handleApplyAction(row) {
    if (row.upcoming && (!row.vendor || row.vendor === "TBD")) {
      handlePreAssignVendor(row);
      return;
    }

    if (row.turnStatus === "Blocked") {
      handleResolve(row.id);
      return;
    }

    if (row.currentStage === "Failed Rent Ready") {
      patchRow(row.id, {
        currentStage: "Rent Ready Open",
        turnStatus: "Monitoring",
        blocker: "None",
        blockers: ["No active blockers"],
        daysInStage: 1,
        nextAction: "Recover failed rent ready",
        rriStatus: "Open",
      });
      return;
    }

    if (row.currentStage === "Owner Approval") {
      patchRow(row.id, {
        currentStage: "Dispatch",
        dispatchDate: new Date().toISOString(),
        turnStatus: "Monitoring",
        daysInStage: 0,
        nextAction: "Confirm vendor schedule",
      });
      return;
    }

    const nextDaysInStage = Math.max(0, (row.daysInStage || 0) - 1);
    const nextProjectedCompletion =
      row.projectedCompletion && (row.daysInStage || 0) > 0
        ? shiftDate(row.projectedCompletion, -1)
        : row.projectedCompletion;

    patchRow(row.id, {
      daysInStage: nextDaysInStage,
      projectedCompletion: nextProjectedCompletion,
      nextAction: "Prepare for dispatch",
    });
  }

  function handleApplySimulatedPlan({ row, simulation }) {
  if (!simulation || simulation.daysRecovered <= 0) return;

  const nextDaysInStage = Math.max(
    0,
    (row.daysInStage || 0) - simulation.daysRecovered
  );

  const patch = {
    daysInStage: nextDaysInStage,
    projectedCompletion: simulation.simulatedCompletion,
    nextAction: row.nextAction || "Execution adjusted via simulation",
  };

  if (row.vendor) {
    patch.vendor = row.vendor;
  }

  patchRow(row.id, patch);
}

  return (
    <div className="space-y-6">
      <PipelineFilters
        upcomingCount={upcomingRows.length}
        upcomingUnassignedCount={planningRisks.upcomingUnassigned}
        blockedUpcomingCount={planningRisks.blockedUpcoming}
        activeCount={activeRows.length}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">
              Upcoming Planning Risks
            </div>
            <div className="mt-1 text-sm text-slate-500">
              A compact planning readout for what needs attention before turns
              enter full execution.
            </div>
          </div>

          <Pill tone="blue">Planning</Pill>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PlanningRiskCard
            label="Upcoming Unassigned"
            value={planningRisks.upcomingUnassigned}
            subtext="Needs vendor assignment"
            tone={
              planningRisks.upcomingUnassigned > 0 ? "amber" : "green"
            }
          />
          <PlanningRiskCard
            label="Blocked Upcoming"
            value={planningRisks.blockedUpcoming}
            subtext="Blocked before execution"
            tone={planningRisks.blockedUpcoming > 0 ? "red" : "green"}
          />
          <PlanningRiskCard
            label="Approval Upcoming"
            value={planningRisks.approvalUpcoming}
            subtext="Owner action still pending"
            tone={planningRisks.approvalUpcoming > 0 ? "blue" : "green"}
          />
          <PlanningRiskCard
            label="Move-Out ≤ 7 Days"
            value={planningRisks.dueSoonUpcoming}
            subtext={`${planningRisks.upcomingCoverage}% upcoming coverage`}
            tone={
              planningRisks.dueSoonUpcoming > 0 &&
              planningRisks.upcomingCoverage < 100
                ? "amber"
                : "slate"
            }
          />
        </div>
      </Card>

      <PipelineTable
        title="Upcoming Turns"
        subtitle="Planning lane: turns inside the next 21 days to move-out."
        rows={upcomingRows}
        selectedPropertyId={selectedPropertyId}
        openRow={openRow}
        onPreAssignVendor={handlePreAssignVendor}
        moveOutOfUpcoming={moveOutOfUpcoming}
        variant="upcoming"
      />

      <PipelineTable
        title="Active Turns"
        subtitle="Execution lane: in-flight turns outside the upcoming planning window."
        rows={activeRows}
        selectedPropertyId={selectedPropertyId}
        openRow={openRow}
        moveToUpcoming={moveToUpcoming}
        variant="active"
      />

      <TurnDetailDrawer
        row={drawerRow}
        onClose={() => setDrawerRowId(null)}
        onResolve={handleResolve}
        onMarkReady={handleMarkReady}
        onApplyAction={handleApplyAction}
        onApplySimulatedPlan={handleApplySimulatedPlan}
      />
    </div>
  );
}